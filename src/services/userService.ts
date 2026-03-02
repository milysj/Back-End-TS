import User, { IUser } from '../models/user';
import bcrypt from 'bcryptjs';

export async function listarUsuarios(): Promise<IUser[]> {
  return await User.find().select("-senha");
}

export async function criarUsuario(dados: Partial<IUser>): Promise<IUser> {
  if (!dados.senha) {
    throw new Error('Senha é obrigatória para criar usuário.');
  }
  const senhaCriptografada = await bcrypt.hash(dados.senha, 10);
  const user = new User({ ...dados, senha: senhaCriptografada });
  return await user.save();
}

export async function loginUsuario(email: string, senha: string): Promise<IUser | null> {
  const user = await User.findOne({ email });
  if (!user) {
    return null;
  }

  const senhaCorreta = await bcrypt.compare(senha, user.senha);
  if (!senhaCorreta) {
    return null;
  }

  return user;
}
