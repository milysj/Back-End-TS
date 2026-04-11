import { Request, Response } from "express";
import Progresso from "../models/progresso";
import User, { IUser } from "../models/user";
import { appLogger, logHandledError } from "../logging/appLogger";

interface AuthRequest extends Request {
    user?: IUser;
}

interface UserScore {
    userId: string;
    xpTotal: number;
    nivel: number;
}

const SCORE_SERVICE_URL = process.env.SCORE_SERVICE_URL || "http://localhost:5001";

const chamarScoreService = async (endpoint: string, method = "GET", body: unknown = null, token: string | null = null): Promise<unknown | null> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const options: RequestInit = { method, headers: { "Content-Type": "application/json" }, signal: controller.signal, };
        if (token) (options.headers as Headers).set("Authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
        if (body && ["POST", "PUT", "PATCH"].includes(method)) options.body = JSON.stringify(body);
        const response = await fetch(`${SCORE_SERVICE_URL}${endpoint}`, options);
        clearTimeout(timeoutId);
        if (!response.ok) {
            void appLogger.warn("score_service_http_error", { status: response.status, endpoint });
            return null;
        }
        return await response.json();
    } catch (error) {
        const err = error as Error;
        if (err.name === "AbortError" || err.message.includes("ECONNREFUSED")) {
            void appLogger.warn("score_service_unavailable", { url: SCORE_SERVICE_URL });
        } else {
            void appLogger.error("score_service_fetch_error", { endpoint, errorMessage: err.message });
        }
        return null;
    }
};

export const obterRanking = async (req: Request, res: Response): Promise<Response> => {
  try {
    const ranking = await Progresso.aggregate([
      { $group: { _id: "$userId", totalFases: { $sum: 1 }, totalAcertos: { $sum: "$pontuacao" }, totalPerguntas: { $sum: "$totalPerguntas" }, porcentagens: { $push: "$porcentagemAcertos" } } },
      { $addFields: { mediaAcertos: { $cond: { if: { $gt: ["$totalFases", 0] }, then: { $divide: [ { $reduce: { input: "$porcentagens", initialValue: 0, in: { $add: ["$$value", "$$this"] } } }, "$totalFases" ] }, else: 0 } } } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "usuario" } },
      { $unwind: { path: "$usuario", preserveNullAndEmptyArrays: false } },
      { $match: { totalFases: { $gt: 0 }, "usuario.tipoUsuario": "ALUNO" } },
      { $project: { _id: 1, nome: "$usuario.nome", username: "$usuario.username", personagem: "$usuario.personagem", fotoPerfil: "$usuario.fotoPerfil", totalFases: 1, totalAcertos: 1, totalPerguntas: 1, mediaAcertos: { $round: ["$mediaAcertos", 2] } } },
      { $sort: { mediaAcertos: -1, totalAcertos: -1 } },
    ]);
    const rankingComPosicao = ranking.slice(0, 10).map((item, index) => ({ position: index + 1, ...item, name: item.username || item.nome || "Usuário", initial: (item.username || item.nome || "U").charAt(0).toUpperCase() }));
    return res.json(rankingComPosicao);
  } catch (error) {
    const err = error as Error;
    logHandledError("rankingController.obterRanking", err);
    return res.status(500).json({ message: "Erro ao obter ranking", error: err.message });
  }
};
export const obterRankingNivel = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const usuarios = await User.find({ tipoUsuario: "ALUNO" }).select("nome username personagem fotoPerfil");
    if (usuarios.length === 0) return res.json([]);
    const authHeader = req.headers.authorization || null;
    const userIds = usuarios.map((u) => u._id.toString());
    const scoresData = (await chamarScoreService("/api/score/usuarios", "POST", { userIds }, authHeader) as UserScore[]) || [];
    const scoresMap = new Map<string, UserScore>(scoresData.map((score) => [score.userId, score]));
    const rankingComNivel = usuarios.map((usuario) => {
        const score = scoresMap.get(usuario._id.toString()) || { userId: '', xpTotal: 0, nivel: 1 };
        return { _id: usuario._id.toString(), name: usuario.username || usuario.nome || "Usuário", initial: (usuario.username || usuario.nome || "U").charAt(0).toUpperCase(), personagem: usuario.personagem || "", fotoPerfil: usuario.fotoPerfil || "", xpTotal: score.xpTotal || 0, nivel: score.nivel || 1 };
      }).sort((a, b) => b.nivel - a.nivel || b.xpTotal - a.xpTotal);
    const rankingComPosicao = rankingComNivel.slice(0, 10).map((item, index) => ({ position: index + 1, ...item }));
    return res.json(rankingComPosicao);
  } catch (error) {
    const err = error as Error;
    logHandledError("rankingController.obterRankingNivel", err);
    return res.status(500).json({ message: "Erro ao obter ranking de nível", error: err.message });
  }
};
