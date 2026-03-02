import { Request, Response } from 'express';
import LicaoSalva from '../models/licaoSalva';
import Trilha from '../models/trilha';
import { IUser } from '../models/user';

interface AuthRequest extends Request {
    user?: IUser;
}

export const salvarTrilha = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const { trilhaId }: { trilhaId: string } = req.body;
    if (!trilhaId) return res.status(400).json({ message: "trilhaId é obrigatório" });
    const trilha = await Trilha.findById(trilhaId);
    if (!trilha) return res.status(404).json({ message: "Trilha não encontrada" });
    const jaSalva = await LicaoSalva.findOne({ usuario: userId, trilha: trilhaId });
    if (jaSalva) return res.status(400).json({ message: "Trilha já está salva" });
    const licaoSalva = await LicaoSalva.create({ usuario: userId, trilha: trilhaId });
    return res.status(201).json({ message: "Trilha salva com sucesso", licaoSalva });
  } catch (error) {
    const err = error as Error & { code?: number };
    if (err.code === 11000) return res.status(400).json({ message: "Trilha já está salva" });
    console.error("Erro ao salvar trilha:", err);
    return res.status(500).json({ message: "Erro ao salvar trilha", error: err.message });
  }
};
export const removerTrilhaSalva = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const { trilhaId } = req.params;
    const licaoSalva = await LicaoSalva.findOneAndDelete({ usuario: userId, trilha: trilhaId });
    if (!licaoSalva) return res.status(404).json({ message: "Trilha não estava salva" });
    return res.json({ message: "Trilha removida das salvas com sucesso" });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao remover trilha salva:", err);
    return res.status(500).json({ message: "Erro ao remover trilha salva", error: err.message });
  }
};
export const listarTrilhasSalvas = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const licoesSalvas = await LicaoSalva.find({ usuario: userId }).populate({ path: 'trilha', select: 'titulo descricao materia dificuldade imagem usuario', populate: { path: 'usuario', select: 'nome username' } }).sort({ createdAt: -1 });
    const trilhas = licoesSalvas.map(ls => ls.trilha).filter(t => t !== null);
    return res.json(trilhas);
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao listar trilhas salvas:", err);
    return res.status(500).json({ message: "Erro ao listar trilhas salvas", error: err.message });
  }
};
export const verificarSeSalva = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const { trilhaId } = req.params;
    const licaoSalva = await LicaoSalva.findOne({ usuario: userId, trilha: trilhaId });
    return res.json({ salva: !!licaoSalva });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao verificar se trilha está salva:", err);
    return res.status(500).json({ message: "Erro ao verificar", error: err.message });
  }
};
