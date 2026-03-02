import { Request, Response } from 'express';
import Feedback, { IFeedback } from '../models/feedback';
import { IUser } from '../models/user';

interface AuthRequest extends Request {
    user?: IUser;
}
export const criarFeedback = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { tipo, avaliacao, sugestao }: Partial<IFeedback> = req.body;
    const userId = req.user?._id || null;
    if (!tipo || !avaliacao) return res.status(400).json({ message: "Tipo e avaliação são obrigatórios" });
    const tiposValidos: IFeedback['tipo'][] = ["bug", "suggestion", "doubt", "praise", "other"];
    if (!tiposValidos.includes(tipo)) return res.status(400).json({ message: "Tipo de feedback inválido" });
    if (avaliacao < 1 || avaliacao > 5) return res.status(400).json({ message: "Avaliação deve ser entre 1 e 5" });
    const feedback = await Feedback.create({ usuario: userId, tipo, avaliacao, sugestao: sugestao || "", data: new Date() });
    return res.status(201).json({ message: "Feedback enviado com sucesso!", feedback: { _id: feedback._id, tipo: feedback.tipo, avaliacao: feedback.avaliacao, sugestao: feedback.sugestao, data: feedback.data } });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao criar feedback:", err);
    return res.status(500).json({ message: "Erro ao enviar feedback", error: err.message });
  }
};
export const listarFeedbacks = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    if (req.user?.tipoUsuario !== "ADMINISTRADOR") return res.status(403).json({ message: "Acesso negado. Apenas administradores podem ver feedbacks." });
    const feedbacks = await Feedback.find().populate<{ usuario: Pick<IUser, 'nome' | 'email' | 'username'> }>("usuario", "nome email username").sort({ createdAt: -1 });
    return res.status(200).json({ feedbacks });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao listar feedbacks:", err);
    return res.status(500).json({ message: "Erro ao listar feedbacks", error: err.message });
  }
};
