import { Request, Response } from 'express';
import User from '../models/user';
import bcrypt from 'bcryptjs';
import { appLogger, logHandledError } from '../logging/appLogger';
import { gerarToken, getExpiresInMs } from '../utils/tokenHelper';

export const loginUser = async (req: Request, res: Response): Promise<Response> => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ message: "Email e senha são obrigatórios." });
  }

  try {
    const user = await User.findOne({ email }).select('+senha');
    if (!user) {
      return res.status(401).json({ message: "Credenciais inválidas" }); 
    }

    // Check user status before verifying password
    if (user.status === 'BANIDO') {
      return res.status(403).json({ message: 'Esta conta foi banida do sistema.' });
    }

    if (user.status === 'BLOQUEADO') {
      if (user.bloqueadoAte && new Date() > user.bloqueadoAte) {
        user.status = 'ATIVO';
        user.bloqueadoAte = null;
        user.tentativasLogin = 0;
        await user.save();
      } else {
        let msgBloqueio = 'Esta conta está temporariamente bloqueada.';
        if (user.bloqueadoAte) {
          const dataFormatada = new Date(user.bloqueadoAte).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          msgBloqueio = `Esta conta está bloqueada até ${dataFormatada}.`;
        }
        return res.status(403).json({ message: msgBloqueio });
      }
    }

    const senhaValida = await bcrypt.compare(senha, user.senha!);
    if (!senhaValida) {
      user.tentativasLogin = (user.tentativasLogin || 0) + 1;
      if (user.tentativasLogin >= 5) {
        user.status = 'BLOQUEADO';
        user.bloqueadoAte = new Date(Date.now() + 15 * 60 * 1000);
        user.tentativasLogin = 0;
        if (typeof user.save === 'function') await user.save();
        return res.status(403).json({ message: 'Muitas tentativas incorretas. Sua conta foi temporariamente bloqueada por 15 minutos.' });
      }
      if (typeof user.save === 'function') await user.save();
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    if (user.tentativasLogin > 0) {
      user.tentativasLogin = 0;
      if (typeof user.save === 'function') await user.save();
    }

    // 🔐 NOVO: verifica se tem 2FA ativado
    if (user.twoFactorEnabled) {
      return res.json({
        require2FA: true,
        userId: user._id
      });
    }

    // 🔑 Só entra aqui se NÃO tiver 2FA
    const payload = { 
      id: user._id, 
      nome: user.nome, 
      email: user.email,
      tipoUsuario: user.tipoUsuario 
    };

    const token = gerarToken(payload);
    const cookieMaxAge = getExpiresInMs();

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: cookieMaxAge,
    });

    const userData = {
      id: String(user._id),
      nome: user.nome,
      email: user.email,
      username: user.username,
      personagem: user.personagem,
      fotoPerfil: user.fotoPerfil,
      xpTotal: user.xpTotal,
      tema: user.tema,
      idioma: user.idioma,
      isVerified: user.isVerified,
      twoFactorEnabled: user.twoFactorEnabled,
    };

    // Cookie para o frontend ler dados básicos sem precisar de fetch /me
    res.cookie('user_data', JSON.stringify(userData), {
      httpOnly: false, // Precisa ser acessível pelo JS do frontend
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: cookieMaxAge,
    });

    void appLogger.info('auth.legacy_login.success', { userId: String(user._id) });
    return res.json({
      token,
      usuario: {
        ...userData,
        tipoUsuario: user.tipoUsuario,
      },
    });

  } catch (err) {
    logHandledError('authController.login', err);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
};