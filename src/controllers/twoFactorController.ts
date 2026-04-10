import { Request, Response } from 'express';
import QRCode from 'qrcode';
import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/user';
import * as twoFactor from '../services/twoFactorservice';
import {
  generatePlainBackupCodes,
  hashBackupCodes,
  formatBackupCodeForUser,
  normalizeBackupCodeInput,
  tryConsumeBackupCode,
} from '../services/twoFactorBackupCodes';
import { PURPOSE_2FA_PENDING } from '../utils/twoFactorPendingToken';

interface AuthRequest extends Request {
  user?: IUser;
}

function envInt(name: string, def: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

const max2faFailedAttempts = () => envInt('TWO_FACTOR_MAX_FAILED_ATTEMPTS', 8);
const lockoutMinutes = () => envInt('TWO_FACTOR_LOCKOUT_MINUTES', 15);

function looksLikeTotpInput(raw: string): boolean {
  const t = raw.replace(/\s/g, '');
  return /^\d{6,8}$/.test(t);
}

type SecondFactorOk =
  | { ok: true; consumedBackup: false }
  | { ok: true; consumedBackup: true; newBackupHashes: string[] }
  | { ok: false };

/**
 * Valida TOTP (6–8 dígitos) ou código de recuperação (hex 16+ após normalizar).
 */
async function verifySecondFactor(
  usuario: IUser & { twoFactorSecret?: string; twoFactorBackupCodes?: string[] },
  tokenInput: string
): Promise<SecondFactorOk> {
  const raw = String(tokenInput ?? '').trim();
  if (!raw) {
    return { ok: false };
  }

  if (looksLikeTotpInput(raw) && usuario.twoFactorSecret) {
    const totpOk = twoFactor.verifyToken(
      usuario.twoFactorSecret,
      raw.replace(/\s/g, '')
    );
    if (totpOk) {
      return { ok: true, consumedBackup: false };
    }
  }

  const norm = normalizeBackupCodeInput(raw);
  if (norm.length >= 16 && usuario.twoFactorBackupCodes?.length) {
    const remaining = await tryConsumeBackupCode(usuario.twoFactorBackupCodes, raw);
    if (remaining) {
      return { ok: true, consumedBackup: true, newBackupHashes: remaining };
    }
  }

  return { ok: false };
}

function issueSessionToken(usuario: IUser, res: Response) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('A configuração do servidor está incompleta.');
  }
  const payload = { id: usuario._id, email: usuario.email, tipoUsuario: usuario.tipoUsuario };
  const token = jwt.sign(payload, secret, { expiresIn: '7d' });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    success: true,
    token,
    perfilCriado: !!usuario.personagem,
    usuario: { id: usuario._id, nome: usuario.nome },
  });
}

/**
 * Troca JWT temporário (após senha correta) + código TOTP ou código de recuperação pela sessão completa.
 */
export const verify2FALogin = async (req: Request, res: Response): Promise<Response> => {
  const { tempToken, token } = req.body;

  if (!tempToken || !token) {
    return res.status(400).json({ message: 'tempToken e token (TOTP ou código de recuperação) são obrigatórios.' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET não está definido.');
    return res.status(500).json({ message: 'Erro interno no servidor.' });
  }

  try {
    const decoded = jwt.verify(tempToken, secret) as jwt.JwtPayload & {
      id?: string;
      purpose?: string;
    };

    if (decoded.purpose !== PURPOSE_2FA_PENDING || !decoded.id) {
      return res.status(401).json({ message: 'Token de verificação inválido.' });
    }

    const usuario = await User.findById(decoded.id).select(
      '+twoFactorSecret +twoFactorBackupCodes'
    );
    if (!usuario || !usuario.twoFactorEnabled || !usuario.twoFactorSecret) {
      return res.status(400).json({ message: '2FA não está ativo para esta conta.' });
    }

    const now = new Date();
    if (usuario.twoFactorLockUntil && usuario.twoFactorLockUntil > now) {
      const retryAfterSeconds = Math.ceil(
        (usuario.twoFactorLockUntil.getTime() - now.getTime()) / 1000
      );
      return res.status(429).json({
        message:
          'Conta temporariamente bloqueada por muitas tentativas incorretas na verificação em duas etapas.',
        retryAfterSeconds,
      });
    }
    if (usuario.twoFactorLockUntil && usuario.twoFactorLockUntil <= now) {
      usuario.twoFactorLockUntil = undefined;
      usuario.twoFactorFailedAttempts = 0;
    }

    const second = await verifySecondFactor(usuario, String(token).replace(/\s/g, ''));
    if (!second.ok) {
      usuario.twoFactorFailedAttempts = (usuario.twoFactorFailedAttempts || 0) + 1;
      if (usuario.twoFactorFailedAttempts >= max2faFailedAttempts()) {
        usuario.twoFactorLockUntil = new Date(
          Date.now() + lockoutMinutes() * 60 * 1000
        );
        usuario.twoFactorFailedAttempts = 0;
      }
      await usuario.save();
      return res.status(401).json({ message: 'Código inválido.' });
    }

    if (second.consumedBackup) {
      usuario.twoFactorBackupCodes = second.newBackupHashes;
    }
    usuario.twoFactorFailedAttempts = 0;
    usuario.twoFactorLockUntil = undefined;
    await usuario.save();

    return issueSessionToken(usuario, res);
  } catch (e) {
    const err = e as Error;
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Sessão de verificação expirada. Faça login novamente.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token de verificação inválido.' });
    }
    console.error('verify2FALogin:', err);
    return res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

/**
 * Gera segredo e QR (2FA ainda desativado até confirmar com TOTP).
 */
export const iniciarSetup2FA = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const usuario = await User.findById(req.user!._id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    if (usuario.twoFactorEnabled) {
      return res.status(400).json({
        message: 'Desative o 2FA antes de gerar um novo segredo.',
      });
    }
    const gen = twoFactor.generateSecret(usuario.email);
    usuario.twoFactorSecret = gen.base32;
    usuario.twoFactorEnabled = false;
    usuario.twoFactorBackupCodes = [];
    usuario.twoFactorFailedAttempts = 0;
    usuario.twoFactorLockUntil = undefined;
    await usuario.save();

    const qrDataUrl = await QRCode.toDataURL(gen.otpauth_url!);

    return res.json({
      success: true,
      otpauthUrl: gen.otpauth_url,
      qrDataUrl,
      manualKey: gen.base32,
    });
  } catch (e) {
    console.error('iniciarSetup2FA:', e);
    return res.status(500).json({ message: 'Não foi possível iniciar a configuração do 2FA.' });
  }
};

/**
 * Confirma o primeiro código e ativa o 2FA. Retorna códigos de recuperação **uma única vez**.
 */
export const confirmarSetup2FA = async (req: AuthRequest, res: Response): Promise<Response> => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Informe o código do aplicativo autenticador.' });
  }

  try {
    const usuario = await User.findById(req.user!._id).select('+twoFactorSecret');
    if (!usuario?.twoFactorSecret) {
      return res.status(400).json({ message: 'Execute primeiro a configuração do 2FA (setup).' });
    }

    const ok = twoFactor.verifyToken(usuario.twoFactorSecret, String(token).replace(/\s/g, ''));
    if (!ok) {
      return res.status(401).json({ message: 'Código inválido.' });
    }

    const plainCodes = generatePlainBackupCodes();
    const hashed = await hashBackupCodes(plainCodes);

    usuario.twoFactorEnabled = true;
    usuario.twoFactorBackupCodes = hashed;
    usuario.twoFactorFailedAttempts = 0;
    usuario.twoFactorLockUntil = undefined;
    await usuario.save();

    return res.json({
      success: true,
      message:
        'Autenticação em dois fatores ativada. Guarde os códigos de recuperação em local seguro; eles não serão exibidos novamente.',
      backupCodes: plainCodes.map(formatBackupCodeForUser),
    });
  } catch (e) {
    console.error('confirmarSetup2FA:', e);
    return res.status(500).json({ message: 'Erro ao confirmar o 2FA.' });
  }
};

/**
 * Desativa 2FA com senha atual + código TOTP ou código de recuperação.
 */
export const desativar2FA = async (req: AuthRequest, res: Response): Promise<Response> => {
  const { senha, token } = req.body;
  if (!senha || !token) {
    return res.status(400).json({
      message: 'Senha e segundo fator (TOTP ou código de recuperação) são obrigatórios.',
    });
  }

  try {
    const usuario = await User.findById(req.user!._id).select(
      '+senha +twoFactorSecret +twoFactorBackupCodes'
    );
    if (!usuario?.twoFactorEnabled || !usuario.twoFactorSecret) {
      return res.status(400).json({ message: '2FA não está ativo.' });
    }

    const senhaOk = await bcrypt.compare(senha, usuario.senha!);
    if (!senhaOk) {
      return res.status(401).json({ message: 'Senha incorreta.' });
    }

    const second = await verifySecondFactor(usuario, String(token).replace(/\s/g, ''));
    if (!second.ok) {
      return res.status(401).json({ message: 'Código inválido.' });
    }

    usuario.twoFactorSecret = undefined;
    usuario.twoFactorEnabled = false;
    usuario.twoFactorBackupCodes = [];
    usuario.twoFactorFailedAttempts = 0;
    usuario.twoFactorLockUntil = undefined;
    await usuario.save();

    return res.json({ success: true, message: 'Autenticação em dois fatores desativada.' });
  } catch (e) {
    console.error('desativar2FA:', e);
    return res.status(500).json({ message: 'Erro ao desativar o 2FA.' });
  }
};

/**
 * Gera novos códigos de recuperação (invalida os anteriores). Exige senha + TOTP ou um código antigo ainda válido.
 */
export const regenerarBackupCodes2FA = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  const { senha, token } = req.body;
  if (!senha || !token) {
    return res.status(400).json({
      message: 'Senha e segundo fator (TOTP ou código de recuperação) são obrigatórios.',
    });
  }

  try {
    const usuario = await User.findById(req.user!._id).select(
      '+senha +twoFactorSecret +twoFactorBackupCodes'
    );
    if (!usuario?.twoFactorEnabled || !usuario.twoFactorSecret) {
      return res.status(400).json({ message: '2FA não está ativo.' });
    }

    const senhaOk = await bcrypt.compare(senha, usuario.senha!);
    if (!senhaOk) {
      return res.status(401).json({ message: 'Senha incorreta.' });
    }

    const second = await verifySecondFactor(usuario, String(token).replace(/\s/g, ''));
    if (!second.ok) {
      return res.status(401).json({ message: 'Código inválido.' });
    }

    const plainCodes = generatePlainBackupCodes();
    usuario.twoFactorBackupCodes = await hashBackupCodes(plainCodes);
    await usuario.save();

    return res.json({
      success: true,
      message:
        'Novos códigos de recuperação gerados. Guarde-os em local seguro; os códigos anteriores deixaram de valer.',
      backupCodes: plainCodes.map(formatBackupCodeForUser),
    });
  } catch (e) {
    console.error('regenerarBackupCodes2FA:', e);
    return res.status(500).json({ message: 'Erro ao regenerar códigos de recuperação.' });
  }
};
