import { Request, Response } from "express";
import mongoose from "mongoose";
import Fase, { IFase } from "../models/fase";
import Trilha from "../models/trilha";
import Secao from "../models/secao";
import Progresso from "../models/progresso";
import { IUser } from "../models/user";

interface AuthRequest extends Request {
    user?: IUser;
}

export const criarFase = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { trilhaId, secaoId, titulo, descricao, conteudo, ordem, perguntas }: Partial<IFase> = req.body;
    if (!trilhaId) return res.status(400).json({ message: "trilhaId é obrigatório" });
    const trilha = await Trilha.findById(trilhaId);
    if (!trilha) return res.status(404).json({ message: "Trilha não encontrada" });
    if (trilha.usuario.toString() !== req.user!._id.toString() && req.user!.tipoUsuario !== 'ADMINISTRADOR') {
        return res.status(403).json({ message: "Acesso negado. Você não é o dono desta trilha." });
    }
    if (secaoId) {
      if (!mongoose.Types.ObjectId.isValid(secaoId)) return res.status(400).json({ message: "ID da seção inválido" });
      const secao = await Secao.findById(secaoId);
      if (!secao) return res.status(404).json({ message: "Seção não encontrada" });
      if (secao.trilhaId.toString() !== trilhaId.toString()) return res.status(400).json({ message: "A seção não pertence a esta trilha" });
    }
    if (ordem === undefined) return res.status(400).json({ message: "ordem é obrigatória" });
    const novaFase = await Fase.create({ trilhaId, secaoId: secaoId || null, titulo, descricao, conteudo: conteudo || "", ordem, perguntas: perguntas || [] });
    const fasePopulada = await Fase.findById(novaFase._id).populate("trilhaId", "titulo descricao materia");
    return res.status(201).json(fasePopulada);
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao criar fase:", err);
    return res.status(500).json({ message: "Erro ao criar fase", error: err.message });
  }
};
export const listarFases = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { trilhaId } = req.query;
    const query: { trilhaId?: string } = {};
    if (trilhaId && typeof trilhaId === 'string') query.trilhaId = trilhaId;
    const fases = await Fase.find(query).populate("trilhaId", "titulo descricao materia").sort({ ordem: 1, createdAt: -1 });
    return res.json(fases);
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao buscar fases:", err);
    return res.status(500).json({ message: "Erro ao buscar fases", error: err.message });
  }
};
export const buscarFasePorId = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const fase = await Fase.findById(id).populate("trilhaId", "titulo descricao materia");
    if (!fase) return res.status(404).json({ message: "Fase não encontrada" });
    return res.json(fase);
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao buscar fase:", err);
    return res.status(500).json({ message: "Erro ao buscar fase", error: err.message });
  }
};
export const buscarFasesPorTrilha = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { trilhaId } = req.params;
    const trilha = await Trilha.findById(trilhaId);
    if (!trilha) return res.status(404).json({ message: "Trilha não encontrada" });
    const fases = await Fase.find({ trilhaId }).populate("trilhaId", "titulo descricao materia").sort({ ordem: 1 });
    return res.json(fases);
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao buscar fases da trilha:", err);
    return res.status(500).json({ message: "Erro ao buscar fases da trilha", error: err.message });
  }
};
export const atualizarFase = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const tipoUsuario = req.user!.tipoUsuario;
    const { id } = req.params;
    const { trilhaId, titulo, descricao, conteudo, ordem, perguntas } = req.body;
    const faseAtual = await Fase.findById(id);
    if (!faseAtual) return res.status(404).json({ message: "Fase não encontrada" });
    if (tipoUsuario !== "ADMINISTRADOR") {
      const trilha = await Trilha.findById(faseAtual.trilhaId);
      if (!trilha || trilha.usuario.toString() !== userId.toString()) return res.status(403).json({ message: "Acesso negado." });
    }
    if (trilhaId) {
      const trilha = await Trilha.findById(trilhaId);
      if (!trilha) return res.status(404).json({ message: "Nova trilha não encontrada" });
      if (tipoUsuario !== "ADMINISTRADOR" && trilha.usuario.toString() !== userId.toString()) return res.status(403).json({ message: "Acesso negado para mover a fase." });
    }
    const faseAtualizada = await Fase.findByIdAndUpdate(id, { trilhaId, titulo, descricao, conteudo, ordem, perguntas }, { new: true, runValidators: true }).populate("trilhaId", "titulo descricao materia");
    if (!faseAtualizada) return res.status(404).json({ message: "Fase não encontrada para atualizar" });
    return res.json(faseAtualizada);
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao atualizar fase:", err);
    return res.status(500).json({ message: "Erro ao atualizar fase", error: err.message });
  }
};
export const deletarFase = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const tipoUsuario = req.user!.tipoUsuario;
    const { id } = req.params;
    const fase = await Fase.findById(id);
    if (!fase) return res.status(404).json({ message: "Fase não encontrada" });
    if (tipoUsuario !== "ADMINISTRADOR") {
      const trilha = await Trilha.findById(fase.trilhaId);
      if (!trilha || trilha.usuario.toString() !== userId.toString()) return res.status(403).json({ message: "Acesso negado." });
    }
    const deletada = await Fase.findByIdAndDelete(id);
    if (!deletada) return res.status(404).json({ message: "Fase não encontrada para deletar" });
    await Progresso.deleteMany({ faseId: id });
    return res.json({ message: "Fase deletada com sucesso" });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao deletar fase:", err);
    return res.status(500).json({ message: "Erro ao deletar fase", error: err.message });
  }
};
export const buscarFasesPorSecao = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const secaoId = req.params.secaoId;
    if (typeof secaoId !== 'string' || !mongoose.Types.ObjectId.isValid(secaoId)) {
      return res.status(400).json({ message: "ID da seção inválido" });
    }
    const secao = await Secao.findById(secaoId);
    if (!secao) return res.status(404).json({ message: "Seção não encontrada" });
    const fases = await Fase.find({ secaoId }).populate("trilhaId", "titulo descricao materia").sort({ ordem: 1 });
    return res.json(fases);
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao buscar fases da seção:", err);
    return res.status(500).json({ message: "Erro ao buscar fases da seção", error: err.message });
  }
};
export const concluirFase = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const { faseId, acertos } = req.body;
    if (!faseId) return res.status(400).json({ message: "faseId é obrigatório" });
    if (!mongoose.Types.ObjectId.isValid(faseId)) return res.status(400).json({ message: "ID da fase inválido" });
    const fase = await Fase.findById(faseId);
    if (!fase) return res.status(404).json({ message: "Fase não encontrada" });
    let progresso = await Progresso.findOne({ userId, faseId });
    const totalPerguntas = fase.perguntas?.length || 0;
    const acertosNum = acertos !== undefined ? Number(acertos) : 0;
    const porcentagemAcertos = totalPerguntas > 0 ? Math.round((acertosNum / totalPerguntas) * 100) : 0;
    const xpGanho = Math.round((porcentagemAcertos / 100) * 500);
    if (!progresso) {
      progresso = await Progresso.create({ userId, faseId, trilhaId: fase.trilhaId, pontuacao: acertosNum, totalPerguntas, porcentagemAcertos, xpGanho, concluido: true });
    } else {
      progresso.pontuacao = acertosNum;
      progresso.totalPerguntas = totalPerguntas;
      progresso.porcentagemAcertos = porcentagemAcertos;
      progresso.xpGanho = xpGanho;
      progresso.concluido = true;
      await progresso.save();
    }
    return res.json({ message: "Fase concluída com sucesso!", progresso });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao concluir fase:", err);
    return res.status(500).json({ message: "Erro ao concluir fase", error: err.message });
  }
};
