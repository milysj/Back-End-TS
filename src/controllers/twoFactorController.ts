import { Request, Response } from 'express';
import QRCode from 'qrcode';
import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/user';
import * as twoFactor from '../services/twoFactorservice';
import { PURPOSE_2FA_PENDING } from '../utils/twoFactorPendingToken';

interface AuthRequest extends Request {
  user?: IUser;
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
 * Troca JWT temporário (após senha correta) + código TOTP pela sessão completa.
 */
export const verify2FALogin = async (req: Request, res: Response): Promise<Response> => {
  const { tempToken, token } = req.body;

  if (!tempToken || !token) {
    return res.status(400).json({ message: 'tempToken e token (TOTP) são obrigatórios.' });
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

    const usuario = await User.findById(decoded.id).select('+twoFactorSecret');
    if (!usuario || !usuario.twoFactorEnabled || !usuario.twoFactorSecret) {
      return res.status(400).json({ message: '2FA não está ativo para esta conta.' });
    }

    const ok = twoFactor.verifyToken(usuario.twoFactorSecret, String(token).replace(/\s/g, ''));
    if (!ok) {
      return res.status(401).json({ message: 'Código inválido.' });
    }

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
 * Confirma o primeiro código e ativa o 2FA.
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

    usuario.twoFactorEnabled = true;
    await usuario.save();

    return res.json({ success: true, message: 'Autenticação em dois fatores ativada.' });
  } catch (e) {
    console.error('confirmarSetup2FA:', e);
    return res.status(500).json({ message: 'Erro ao confirmar o 2FA.' });
  }
};

/**
 * Desativa 2FA com senha atual + código TOTP.
 */
export const desativar2FA = async (req: AuthRequest, res: Response): Promise<Response> => {
  const { senha, token } = req.body;
  if (!senha || !token) {
    return res.status(400).json({ message: 'Senha e código TOTP são obrigatórios.' });
  }

  try {
    const usuario = await User.findById(req.user!._id).select('+senha +twoFactorSecret');
    if (!usuario?.twoFactorEnabled || !usuario.twoFactorSecret) {
      return res.status(400).json({ message: '2FA não está ativo.' });
    }

    const senhaOk = await bcrypt.compare(senha, usuario.senha!);
    if (!senhaOk) {
      return res.status(401).json({ message: 'Senha incorreta.' });
    }

    const totpOk = twoFactor.verifyToken(usuario.twoFactorSecret, String(token).replace(/\s/g, ''));
    if (!totpOk) {
      return res.status(401).json({ message: 'Código inválido.' });
    }

    usuario.twoFactorSecret = undefined;
    usuario.twoFactorEnabled = false;
    await usuario.save();

    return res.json({ success: true, message: 'Autenticação em dois fatores desativada.' });
  } catch (e) {
    console.error('desativar2FA:', e);
    return res.status(500).json({ message: 'Erro ao desativar o 2FA.' });
  }
};
