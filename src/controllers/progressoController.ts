import { Request, Response } from "express";
import Progresso from "../models/progresso";
import User, { IUser } from "../models/user";
import Fase from "../models/fase";

interface AuthRequest extends Request {
    user?: IUser;
}

interface ScoreData {
    score?: {
        nivel: number;
        xpAtual: number;
        xpNecessario: number;
        xpAcumulado: number;
        xpTotal: number;
    };
    xpTotal?: number;
    nivel?: number;
    xpAtual?: number;
    xpNecessario?: number;
    xpAcumulado?: number;
}

interface AddXpResponse extends ScoreData {
    score: {
        nivel: number;
        xpAtual: number;
        xpNecessario: number;
        xpAcumulado: number;
        xpTotal: number;
    };
}

interface UserScoreResponse extends ScoreData {
    xpTotal: number;
    nivel: number;
    xpAtual: number;
    xpNecessario: number;
    xpAcumulado: number;
}

const SCORE_SERVICE_URL = process.env.SCORE_SERVICE_URL || "http://localhost:5001";

export const calcularXP = (porcentagemAcertos: number): number => {
  return Math.round((porcentagemAcertos / 100) * 500);
};

const chamarScoreService = async (endpoint: string, method = "GET", body: unknown = null, token: string | null = null): Promise<ScoreData | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const options: RequestInit = { method, headers: { "Content-Type": "application/json" }, signal: controller.signal };
    if (token) (options.headers as Headers).set("Authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
    if (body && (method === "POST" || method === "PUT" || method === "PATCH")) options.body = JSON.stringify(body);
    const response = await fetch(`${SCORE_SERVICE_URL}${endpoint}`, options);
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.error(`[SCORE Service] Erro HTTP ${response.status} em ${endpoint}`);
      return null;
    }
    return await response.json() as ScoreData;
  } catch (error) {
    const err = error as Error;
    if (err.name === "AbortError" || err.message.includes("ECONNREFUSED")) console.warn(`[SCORE Service] Microsserviço não disponível (${SCORE_SERVICE_URL}).`);
    else console.error(`[SCORE Service] Erro ao chamar ${endpoint}:`, err.message);
    return null;
  }
};

export const salvarResultado = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!._id;
    const { faseId, pontuacao, totalPerguntas, respostasUsuario } = req.body;
    if (!faseId || pontuacao === undefined || !totalPerguntas) return res.status(400).json({ message: "faseId, pontuacao e totalPerguntas são obrigatórios" });
    const fase = await Fase.findById(faseId);
    if (!fase) return res.status(404).json({ message: "Fase não encontrada" });
    const porcentagemAcertos = Math.round((pontuacao / totalPerguntas) * 100);
    const xpGanho = calcularXP(porcentagemAcertos);
    let progresso = await Progresso.findOne({ userId, faseId });
    if (progresso && progresso.concluido) return res.status(400).json({ message: "Esta fase já foi completada anteriormente", progresso });
    if (progresso) {
      progresso.pontuacao = pontuacao;
      progresso.totalPerguntas = totalPerguntas;
      progresso.porcentagemAcertos = porcentagemAcertos;
      progresso.xpGanho = xpGanho;
      progresso.concluido = true;
      progresso.respostasUsuario = respostasUsuario || progresso.respostasUsuario || [];
      progresso.perguntasRespondidas = Array.from({ length: totalPerguntas }, (_, i) => i);
      await progresso.save();
    } else {
      progresso = await Progresso.create({ userId, faseId, trilhaId: fase.trilhaId, pontuacao, totalPerguntas, porcentagemAcertos, xpGanho, concluido: true, respostasUsuario: respostasUsuario || [], perguntasRespondidas: Array.from({ length: totalPerguntas }, (_, i) => i) });
    }
    const authHeader = req.headers.authorization || null;
    const scoreData = await chamarScoreService("/api/score/adicionar-xp", "POST", { xpGanho }, authHeader) as AddXpResponse | null;
    const usuario = await User.findById(userId).select("-senha -email -dataNascimento");
    return res.status(201).json({ message: "Resultado salvo com sucesso", progresso, xpGanho, nivel: scoreData?.score || { nivel: 1, xpAtual: 0, xpNecessario: 100, xpAcumulado: 0 }, usuario: { xpTotal: scoreData?.score?.xpTotal || usuario?.xpTotal, nivel: scoreData?.score?.nivel || 1 } });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao salvar resultado:", err);
    return res.status(500).json({ message: "Erro ao salvar resultado", error: err.message });
  }
};
export const salvarResposta = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const userId = req.user!._id;
        const { faseId, perguntaIndex, resposta } = req.body;
        if (faseId === undefined || perguntaIndex === undefined || resposta === undefined) return res.status(400).json({ message: "faseId, perguntaIndex e resposta são obrigatórios" });
        const fase = await Fase.findById(faseId);
        if (!fase) return res.status(404).json({ message: "Fase não encontrada" });
        let progresso = await Progresso.findOne({ userId, faseId });
        if (!progresso) {
            progresso = await Progresso.create({ userId, faseId, trilhaId: fase.trilhaId, pontuacao: 0, totalPerguntas: fase.perguntas?.length || 0, porcentagemAcertos: 0, xpGanho: 0, concluido: false, respostasUsuario: [], perguntasRespondidas: [] });
        }
        if (!progresso.perguntasRespondidas.includes(perguntaIndex)) {
            progresso.respostasUsuario[perguntaIndex] = resposta;
            progresso.perguntasRespondidas.push(perguntaIndex);
            let pontuacaoAtual = 0;
            fase.perguntas.forEach((pergunta, index) => {
                if (progresso!.respostasUsuario[index] === Number(pergunta.respostaCorreta)) pontuacaoAtual++;
            });
            progresso.pontuacao = pontuacaoAtual;
            progresso.porcentagemAcertos = Math.round((pontuacaoAtual / fase.perguntas.length) * 100);
            await progresso.save();
        }
        return res.json({ message: "Resposta salva com sucesso", progresso });
    } catch (error) {
        const err = error as Error;
        console.error("Erro ao salvar resposta:", err);
        return res.status(500).json({ message: "Erro ao salvar resposta", error: err.message });
    }
};
export const verificarProgresso = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const userId = req.user!._id;
        const { faseId } = req.params;
        const progresso = await Progresso.findOne({ userId, faseId });
        if (!progresso) return res.json({ completado: false, progresso: null, respostasSalvas: [], perguntasRespondidas: [] });
        return res.json({ completado: progresso.concluido || false, progresso, respostasSalvas: progresso.respostasUsuario || [], perguntasRespondidas: progresso.perguntasRespondidas || [] });
    } catch (error) {
        const err = error as Error;
        console.error("Erro ao verificar progresso:", err);
        return res.status(500).json({ message: "Erro ao verificar progresso", error: err.message });
    }
};
export const obterProgressoTrilha = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const userId = req.user!._id;
        const { trilhaId } = req.params;
        if (!trilhaId) return res.status(400).json({ message: "trilhaId é obrigatório" });
        const progressos = await Progresso.find({ userId, trilhaId }).select("faseId concluido");
        const progressoMap = progressos.reduce((acc, prog) => {
            acc[prog.faseId.toString()] = prog.concluido || false;
            return acc;
        }, {} as Record<string, boolean>);
        return res.json({ progresso: progressoMap });
    } catch (error) {
        const err = error as Error;
        console.error("Erro ao obter progresso da trilha:", err);
        return res.status(500).json({ message: "Erro ao obter progresso da trilha", error: err.message });
    }
};
export const obterDadosUsuario = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const userId = req.user!._id;
        const usuario = await User.findById(userId).select("-senha -email -dataNascimento");
        if (!usuario) return res.status(404).json({ message: "Usuário não encontrado" });
        const authHeader = req.headers.authorization || null;
        let scoreData = await chamarScoreService("/api/score/usuario", "GET", null, authHeader) as UserScoreResponse | null;
        if (!scoreData) scoreData = { xpTotal: 0, nivel: 1, xpAtual: 0, xpNecessario: 100, xpAcumulado: 0 };
        return res.json({ usuario: { ...usuario.toObject(), xpTotal: scoreData.xpTotal || 0 }, nivel: scoreData.nivel || 1, xpAtual: scoreData.xpAtual || 0, xpNecessario: scoreData.xpNecessario || 100, xpAcumulado: scoreData.xpAcumulado || 0 });
    } catch (error) {
        const err = error as Error;
        console.error("Erro ao obter dados do usuário:", err);
        return res.status(500).json({ message: "Erro ao obter dados do usuário", error: err.message });
    }
};
