import { Request, Response } from 'express';
import User from '../models/user';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const login = async (req: Request, res: Response): Promise<Response> => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ message: "Email e senha são obrigatórios." });
  }

  try {
    // 1. Verificar se o usuário existe e selecionar a senha explicitamente
    // É uma boa prática não retornar a senha por padrão no model
    const user = await User.findOne({ email }).select('+senha');
    if (!user) {
      // Mensagem genérica por segurança para não revelar se o usuário existe
      return res.status(401).json({ message: "Credenciais inválidas" }); 
    }

    // 2. Verificar a senha (comparando hash)
    // O campo user.senha existe por causa do .select('+senha')
    const senhaValida = await bcrypt.compare(senha, user.senha!);
    if (!senhaValida) {
       // Mensagem genérica por segurança
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    // 3. Gerar token JWT com dados essenciais
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

    // 4. Configurar cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Em produção, use 'true'
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    res.cookie('approved', 'true', {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });
    
    // 5. Retornar os dados do usuário logado
    return res.json({
      token,
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        materiaFavorita: user.materiaFavorita || null,
        personagem: user.personagem,
        fotoPerfil: user.fotoPerfil,
        tipoUsuario: user.tipoUsuario,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
};
