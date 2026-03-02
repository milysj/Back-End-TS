import { Request, Response } from "express";
import Fase, { IPergunta } from "../models/fase";
import Trilha from "../models/trilha";
import { IUser } from "../models/user";

interface AuthRequest extends Request {
    user?: IUser;
}

export const listarPerguntasPorFase = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { faseId } = req.params;
    if (!faseId) return res.status(400).json({ message: "ID da fase é obrigatório" });
    const fase = await Fase.findById(faseId);
    if (!fase) return res.status(404).json({ message: "Fase não encontrada" });
    return res.status(200).json(fase.perguntas || []);
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao listar perguntas:", err);
    return res.status(500).json({ message: "Erro ao listar perguntas", error: err.message });
  }
};
export const criarPergunta = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const { faseId, enunciado, alternativas, respostaCorreta }: IPergunta & { faseId: string } = req.body;
    if (!faseId || !enunciado || !alternativas || respostaCorreta === undefined) return res.status(400).json({ message: "faseId, enunciado, alternativas e respostaCorreta são obrigatórios" });
    if (!Array.isArray(alternativas) || alternativas.length < 2) return res.status(400).json({ message: "Alternativas deve ser um array com pelo menos 2 opções" });
    if (Number(respostaCorreta) < 0 || Number(respostaCorreta) >= alternativas.length) return res.status(400).json({ message: "respostaCorreta deve ser um índice válido do array de alternativas" });
    const fase = await Fase.findById(faseId);
    if (!fase) return res.status(404).json({ message: "Fase não encontrada" });
    const trilha = await Trilha.findById(fase.trilhaId);
    if (!trilha) return res.status(404).json({ message: "Trilha associada não encontrada" });
    if (trilha.usuario.toString() !== userId.toString() && req.user!.tipoUsuario !== "ADMINISTRADOR") return res.status(403).json({ message: "Acesso negado." });
    const novaPergunta: IPergunta = { enunciado, alternativas, respostaCorreta: String(respostaCorreta) };
    fase.perguntas.push(novaPergunta);
    await fase.save();
    return res.status(201).json({ message: "Pergunta criada com sucesso", pergunta: novaPergunta });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao criar pergunta:", err);
    return res.status(500).json({ message: "Erro ao criar pergunta", error: err.message });
  }
};
export const atualizarPergunta = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const { faseId, perguntaIndex } = req.params;
    const { enunciado, alternativas, respostaCorreta }: Partial<IPergunta> = req.body;
    const fase = await Fase.findById(faseId);
    if (!fase) return res.status(404).json({ message: "Fase não encontrada" });
    const trilha = await Trilha.findById(fase.trilhaId);
    if (!trilha) return res.status(404).json({ message: "Trilha associada não encontrada" });
    if (trilha.usuario.toString() !== userId.toString() && req.user!.tipoUsuario !== "ADMINISTRADOR") return res.status(403).json({ message: "Acesso negado." });
    if (typeof perguntaIndex !== 'string') {
        return res.status(400).json({ message: "Parâmetro 'perguntaIndex' inválido." });
    }
    const index = parseInt(perguntaIndex, 10);
    if (isNaN(index) || !fase.perguntas || index < 0 || index >= fase.perguntas.length) return res.status(404).json({ message: "Pergunta não encontrada" });
    if (enunciado !== undefined) fase.perguntas[index].enunciado = enunciado;
    if (alternativas !== undefined) {
      if (!Array.isArray(alternativas) || alternativas.length < 2) return res.status(400).json({ message: "Alternativas deve ser um array com pelo menos 2 opções" });
      fase.perguntas[index].alternativas = alternativas;
    }
    if (respostaCorreta !== undefined) {
      const altArray = alternativas || fase.perguntas[index].alternativas;
      if (Number(respostaCorreta) < 0 || Number(respostaCorreta) >= altArray.length) return res.status(400).json({ message: "respostaCorreta deve ser um índice válido" });
      fase.perguntas[index].respostaCorreta = String(respostaCorreta);
    }
    await fase.save();
    return res.status(200).json({ message: "Pergunta atualizada com sucesso", pergunta: fase.perguntas[index] });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao atualizar pergunta:", err);
    return res.status(500).json({ message: "Erro ao atualizar pergunta", error: err.message });
  }
};
export const deletarPergunta = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const { faseId, perguntaIndex } = req.params;
    const fase = await Fase.findById(faseId);
    if (!fase) return res.status(404).json({ message: "Fase não encontrada" });
    const trilha = await Trilha.findById(fase.trilhaId);
    if (!trilha) return res.status(404).json({ message: "Trilha associada não encontrada" });
    if (trilha.usuario.toString() !== userId.toString() && req.user!.tipoUsuario !== "ADMINISTRADOR") return res.status(403).json({ message: "Acesso negado." });
    if (typeof perguntaIndex !== 'string') {
        return res.status(400).json({ message: "Parâmetro 'perguntaIndex' inválido." });
    }
    const index = parseInt(perguntaIndex, 10);
    if (isNaN(index) || !fase.perguntas || index < 0 || index >= fase.perguntas.length) return res.status(404).json({ message: "Pergunta não encontrada" });
    fase.perguntas.splice(index, 1);
    await fase.save();
    return res.status(200).json({ message: "Pergunta deletada com sucesso" });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao deletar pergunta:", err);
    return res.status(500).json({ message: "Erro ao deletar pergunta", error: err.message });
  }
};
