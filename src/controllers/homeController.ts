import { Request, Response } from 'express';
import Trilha, { ITrilha } from '../models/trilha';
import { IUser } from '../models/user';

interface AuthRequest extends Request {
    user?: IUser;
}

export const getHomeData = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const user = req.user!;
    const novidades: ITrilha[] = await Trilha.find().select("-usuariosIniciaram").sort({ dataCriacao: -1 }).limit(10);
    const populares: ITrilha[] = await Trilha.find().select("-usuariosIniciaram").sort({ visualizacoes: -1 }).limit(10);
    const continueTrilhas: ITrilha[] = await Trilha.find({ usuariosIniciaram: userId }).select("-usuariosIniciaram").limit(10);
    return res.json({ usuario: { nome: user.nome, materiaFavorita: user.materiaFavorita, personagem: user.personagem, fotoPerfil: user.fotoPerfil, }, trilhas: { novidades, populares, continue: continueTrilhas } });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao carregar dados da home:", err);
    return res.status(500).json({ message: "Erro ao carregar dados da home", error: err.message });
  }
};
