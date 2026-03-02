import { Request, Response } from 'express';
import mongoose from "mongoose";
import Secao, { ISecao } from "../models/secao";
import Trilha from "../models/trilha";
import { IUser } from '../models/user';

interface AuthRequest extends Request {
    user?: IUser;
}

export const listarSecoes = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { trilhaId } = req.query;
    const query: { trilhaId?: string } = {};
    if (trilhaId) {
        if (typeof trilhaId !== 'string' || !mongoose.Types.ObjectId.isValid(trilhaId)) {
            return res.status(400).json({ message: "ID da trilha inválido" });
        }
        query.trilhaId = trilhaId;
    }
    const secoes = await Secao.find(query).sort({ ordem: 1, createdAt: 1 }).populate({ path: "trilhaId", select: "titulo descricao materia" });
    return res.json(secoes);
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao listar seções:", err);
    return res.status(500).json({ message: "Erro ao listar seções", error: err.message });
  }
};

export const buscarSecoesPorTrilha = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { trilhaId } = req.params;
    if (typeof trilhaId !== 'string' || !mongoose.Types.ObjectId.isValid(trilhaId)) {
      return res.status(400).json({ message: "ID da trilha inválido" });
    }
    const trilha = await Trilha.findById(trilhaId);
    if (!trilha) return res.status(404).json({ message: "Trilha não encontrada" });
    const secoes = await Secao.find({ trilhaId }).sort({ ordem: 1, createdAt: 1 });
    return res.json(secoes);
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao buscar seções por trilha:", err);
    return res.status(500).json({ message: "Erro ao buscar seções por trilha", error: err.message });
  }
};

export const buscarSecaoPorId = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID da seção inválido" });
    }
    const secao = await Secao.findById(id).populate({ path: "trilhaId", select: "titulo descricao materia" });
    if (!secao) return res.status(404).json({ message: "Seção não encontrada" });
    return res.json(secao);
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao buscar seção:", err);
    return res.status(500).json({ message: "Erro ao buscar seção", error: err.message });
  }
};

export const criarSecao = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const tipoUsuario = req.user!.tipoUsuario;
    const { trilhaId, titulo, descricao, ordem }: Partial<ISecao> = req.body;
    if (!trilhaId || !titulo || ordem === undefined) return res.status(400).json({ message: "TrilhaId, título e ordem são obrigatórios" });
    if (!mongoose.Types.ObjectId.isValid(trilhaId as unknown as string)) return res.status(400).json({ message: "ID da trilha inválido" });
    const trilha = await Trilha.findById(trilhaId);
    if (!trilha) return res.status(404).json({ message: "Trilha não encontrada" });
    if (trilha.usuario.toString() !== userId.toString() && tipoUsuario !== "ADMINISTRADOR") return res.status(403).json({ message: "Acesso negado." });
    const secaoExistente = await Secao.findOne({ trilhaId, ordem });
    if (secaoExistente) return res.status(409).json({ message: "Já existe uma seção com esta ordem nesta trilha" });
    const novaSecao = await Secao.create({ trilhaId, titulo, descricao: descricao || "", ordem });
    return res.status(201).json({ message: "Seção criada com sucesso!", secao: novaSecao });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao criar seção:", err);
    return res.status(500).json({ message: "Erro ao criar seção", error: err.message });
  }
};

export const atualizarSecao = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const tipoUsuario = req.user!.tipoUsuario;
    const { id } = req.params;
    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID da seção inválido" });
    }
    const { trilhaId, titulo, descricao, ordem }: Partial<ISecao> = req.body;
    const secao = await Secao.findById(id);
    if (!secao) return res.status(404).json({ message: "Seção não encontrada" });
    const trilha = await Trilha.findById(secao.trilhaId);
    if (!trilha) return res.status(404).json({ message: "Trilha associada não encontrada" });
    if (trilha.usuario.toString() !== userId.toString() && tipoUsuario !== "ADMINISTRADOR") return res.status(403).json({ message: "Acesso negado." });
    if (trilhaId && (typeof trilhaId !== 'string' || !mongoose.Types.ObjectId.isValid(trilhaId))) {
        return res.status(400).json({ message: "ID da nova trilha é inválido" });
    }
    if (ordem !== undefined && ordem !== secao.ordem) {
      const secaoComOrdem = await Secao.findOne({ trilhaId: trilhaId || secao.trilhaId, ordem, _id: { $ne: id } });
      if (secaoComOrdem) return res.status(409).json({ message: "Já existe uma seção com esta ordem nesta trilha" });
    }
    const camposAtualizar: Partial<ISecao> = {};
    if (trilhaId) camposAtualizar.trilhaId = trilhaId;
    if (titulo) camposAtualizar.titulo = titulo;
    if (descricao !== undefined) camposAtualizar.descricao = descricao;
    if (ordem !== undefined) camposAtualizar.ordem = ordem;
    const secaoAtualizada = await Secao.findByIdAndUpdate(id, camposAtualizar, { new: true, runValidators: true });
    return res.json({ message: "Seção atualizada com sucesso!", secao: secaoAtualizada });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao atualizar seção:", err);
    return res.status(500).json({ message: "Erro ao atualizar seção", error: err.message });
  }
};

export const deletarSecao = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const tipoUsuario = req.user!.tipoUsuario;
    const { id } = req.params;
    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID da seção inválido" });
    }
    const secao = await Secao.findById(id);
    if (!secao) return res.status(404).json({ message: "Seção não encontrada" });
    const trilha = await Trilha.findById(secao.trilhaId);
    if (!trilha) {
      if (tipoUsuario !== "ADMINISTRADOR") return res.status(404).json({ message: "Trilha associada não encontrada." });
    } else {
      if (trilha.usuario.toString() !== userId.toString() && tipoUsuario !== "ADMINISTRADOR") return res.status(403).json({ message: "Acesso negado." });
    }
    await Secao.findByIdAndDelete(id);
    return res.json({ message: "Seção deletada com sucesso" });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao deletar seção:", err);
    return res.status(500).json({ message: "Erro ao deletar seção", error: err.message });
  }
};
