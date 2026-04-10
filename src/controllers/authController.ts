import { Request, Response } from 'express';
import User from '../models/user';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { appLogger, logHandledError } from '../logging/appLogger';

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

    const senhaValida = await bcrypt.compare(senha, user.senha!);
    if (!senhaValida) {
      return res.status(401).json({ message: "Credenciais inválidas" });
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

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    void appLogger.info('auth.legacy_login.success', { userId: String(user._id) });
    return res.json({
      token,
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        tipoUsuario: user.tipoUsuario,
      },
    });

  } catch (err) {
    logHandledError('authController.login', err);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
};