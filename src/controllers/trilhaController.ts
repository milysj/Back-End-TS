import { Request, Response } from "express";
import mongoose from "mongoose";
import Trilha, { ITrilha } from "../models/trilha";
import { IUser } from "../models/user";
import { appLogger, logHandledError } from "../logging/appLogger";

interface AuthRequest extends Request {
    user?: IUser;
}

export const criarTrilha = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const dataCriacao = new Date().toISOString().split("T")[0];
    const imagem = req.body.imagem || "/img/fases/vila.jpg";
    const trilha = new Trilha({ ...req.body, usuario: userId, dataCriacao, imagem, usuariosIniciaram: [], visualizacoes: 0 });
    await trilha.save();
    const trilhaResponse = trilha.toObject();
    delete (trilhaResponse as unknown as { usuariosIniciaram?: unknown }).usuariosIniciaram;
    return res.status(201).json(trilhaResponse);
  } catch (error) {
    const err = error as Error;
    logHandledError("trilhaController.criarTrilha", err);
    return res.status(500).json({ message: "Erro ao criar trilha", error: err.message });
  }
};
export const listarTrilhas = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const tipoUsuario = req.user!.tipoUsuario;
    const query = tipoUsuario === "ADMINISTRADOR" ? {} : { usuario: userId };
    let trilhasQuery = Trilha.find(query).select("-usuariosIniciaram");
    if (tipoUsuario === "ADMINISTRADOR") trilhasQuery = trilhasQuery.populate({ path: "usuario", select: "nome username email tipoUsuario" });
    const trilhas = await trilhasQuery.sort({ createdAt: -1 });
    void appLogger.info("trilha.list.success", { count: trilhas.length, userId: String(userId) });
    return res.json(trilhas);
  } catch (error) {
    const err = error as Error;
    logHandledError("trilhaController.listarTrilhas", err);
    return res.status(500).json({ message: "Erro ao listar trilhas", error: err.message });
  }
};
export const atualizarTrilha = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const tipoUsuario = req.user!.tipoUsuario;
    const { id } = req.params;
    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID da trilha inválido" });
    }
    const dadosAtualizacao = { ...req.body };
    if (!dadosAtualizacao.imagem) {
      const trilhaAtual = await Trilha.findById(id);
      dadosAtualizacao.imagem = trilhaAtual?.imagem || "/img/fases/vila.jpg";
    }
    const query = tipoUsuario === "ADMINISTRADOR" ? { _id: id } : { _id: id, usuario: userId };
    const trilha = await Trilha.findOneAndUpdate(query, dadosAtualizacao, { new: true });
    if (!trilha) return res.status(404).json({ message: "Trilha não encontrada ou você não tem permissão para editar." });
    const trilhaResponse = trilha.toObject();
    delete (trilhaResponse as unknown as { usuariosIniciaram?: unknown }).usuariosIniciaram;
    return res.json(trilhaResponse);
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao atualizar trilha:", err);
    return res.status(500).json({ message: "Erro ao atualizar trilha", error: err.message });
  }
};
export const deletarTrilha = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const tipoUsuario = req.user!.tipoUsuario;
    const { id } = req.params;
    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID da trilha inválido" });
    }
    const query = tipoUsuario === "ADMINISTRADOR" ? { _id: id } : { _id: id, usuario: userId };
    const trilha = await Trilha.findOneAndDelete(query);
    if (!trilha) return res.status(404).json({ message: "Trilha não encontrada ou você não tem permissão para deletar." });
    return res.json({ message: "Trilha excluída com sucesso" });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao deletar trilha:", err);
    return res.status(500).json({ message: "Erro ao deletar trilha", error: err.message });
  }
};
export const trilhasNovidades = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const userId = req.user!._id;
        const trilhas = await Trilha.find({ usuariosIniciaram: { $ne: userId } }).select("-usuariosIniciaram").sort({ createdAt: -1 }).limit(10);
        return res.json(trilhas);
    } catch (error) {
        const err = error as Error;
        console.error("Erro ao buscar novidades:", err);
        return res.status(500).json({ message: "Erro ao buscar novidades", error: err.message });
    }
};
export const trilhasPopulares = async (req: Request, res: Response): Promise<Response> => {
    try {
        const trilhas = await Trilha.find().select("-usuariosIniciaram").sort({ visualizacoes: -1 }).limit(10);
        return res.json(trilhas);
    } catch (error) {
        const err = error as Error;
        console.error("Erro ao buscar trilhas populares:", err);
        return res.status(500).json({ message: "Erro ao buscar populares", error: err.message });
    }
};
export const trilhasContinue = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const userId = req.user!._id;
        const trilhas = await Trilha.find({ usuariosIniciaram: userId }).select("-usuariosIniciaram").sort({ updatedAt: -1 }).limit(10);
        return res.json(trilhas);
    } catch (error) {
        const err = error as Error;
        console.error("Erro ao buscar trilhas em andamento:", err);
        return res.status(500).json({ message: "Erro ao buscar trilhas iniciadas", error: err.message });
    }
};
export const iniciarTrilha = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const { trilhaId } = req.params;
    if (typeof trilhaId !== 'string' || !mongoose.Types.ObjectId.isValid(trilhaId)) {
        return res.status(400).json({ message: "ID da trilha inválido" });
    }
    const trilha = await Trilha.findById(trilhaId);
    if (!trilha) return res.status(404).json({ message: "Trilha não encontrada" });
    if (!trilha.usuariosIniciaram.includes(userId)) {
      trilha.usuariosIniciaram.push(userId);
      await trilha.save();
    }
    const trilhaResponse = trilha.toObject();
    delete (trilhaResponse as unknown as { usuariosIniciaram?: unknown }).usuariosIniciaram;
    return res.json({ message: "Trilha iniciada com sucesso", trilha: trilhaResponse });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao iniciar trilha:", err);
    return res.status(500).json({ message: "Erro ao iniciar trilha", error: err.message });
  }
};
export const buscarTrilhas = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { q, materia } = req.query as { q?: string, materia?: string };
        const tipoUsuario = req.user?.tipoUsuario;
        const conditions: mongoose.FilterQuery<ITrilha> = {};
        if (req.user === undefined) conditions.disponibilidade = "Aberto";
        if (q) conditions.$or = [ { titulo: { $regex: q, $options: "i" } }, { descricao: { $regex: q, $options: "i" } }, { materia: { $regex: q, $options: "i" } } ];
        if (materia && materia.trim() !== "" && materia !== "Todas") conditions.materia = { $regex: materia.trim(), $options: "i" };
        let trilhasQuery = Trilha.find(conditions).select("-usuariosIniciaram");
        const populateSelect = tipoUsuario === "ADMINISTRADOR" ? "nome username email tipoUsuario" : "nome username";
        trilhasQuery = trilhasQuery.populate({ path: "usuario", select: populateSelect });
        const trilhas = await trilhasQuery.sort({ visualizacoes: -1, createdAt: -1 });
        return res.json(trilhas);
    } catch (error) {
        const err = error as Error;
        console.error("Erro ao buscar trilhas:", err);
        return res.status(500).json({ message: "Erro ao buscar trilhas", error: err.message });
    }
};
export const buscarTrilhaPorId = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID da trilha inválido" });
        }
        const tipoUsuario = req.user?.tipoUsuario;
        const populateSelect = tipoUsuario === "ADMINISTRADOR" ? "nome username email tipoUsuario" : "nome username";
        const trilha = await Trilha.findById(id).select("-usuariosIniciaram").populate({ path: "usuario", select: populateSelect });
        if (!trilha) return res.status(404).json({ message: "Trilha não encontrada" });
        return res.json(trilha);
    } catch (error) {
        const err = error as Error;
        console.error("Erro ao buscar trilha:", err);
        return res.status(500).json({ message: "Erro ao buscar trilha", error: err.message });
    }
};
export const visualizarTrilha = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID da trilha inválido" });
    }
    const trilha = await Trilha.findByIdAndUpdate(id, { $inc: { visualizacoes: 1 } }, { new: true });
    if (!trilha) return res.status(404).json({ message: "Trilha não encontrada" });
    return res.json({ message: "Visualização registrada", visualizacoes: trilha.visualizacoes });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao registrar visualização:", err);
    return res.status(500).json({ message: "Erro ao registrar visualização", error: err.message });
  }
};
