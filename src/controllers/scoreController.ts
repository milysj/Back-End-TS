import { Request, Response } from "express";
import mongoose from "mongoose";
import Score, { IScore } from "../models/score";
import { appLogger, logHandledError } from "../logging/appLogger";

// Interface customizada para a Request se usar middleware de auth
interface AuthRequest extends Request {
  user?: any;
  userId?: string;
}

export const calcularXP = (porcentagemAcertos: number): number => {
  return Math.round((porcentagemAcertos / 100) * 500);
};

export const calcularNivel = (xpTotal: number) => {
  if (xpTotal < 0) xpTotal = 0;
  
  let nivel = 1;
  let xpParaProximoNivel = 100;
  let xpAcumuladoAteNivelAtual = 0;

  while (xpTotal >= xpAcumuladoAteNivelAtual + xpParaProximoNivel) {
    xpAcumuladoAteNivelAtual += xpParaProximoNivel;
    xpParaProximoNivel = Math.round(100 + xpParaProximoNivel * 1.1);
    nivel++;
  }

  const xpAtual = xpTotal - xpAcumuladoAteNivelAtual;

  return {
    nivel,
    xpAtual,
    xpNecessario: xpParaProximoNivel,
    xpAcumulado: xpAcumuladoAteNivelAtual,
  };
};

/**
 * Função interna para adicionar XP sem passar pelo Express
 */
export const adicionarXPInterno = async (userId: string | mongoose.Types.ObjectId, xpGanho: number) => {
  if (xpGanho === undefined || xpGanho < 0) {
    throw new Error("xpGanho é obrigatório e deve ser maior ou igual a 0");
  }

  const userIdObjectId = typeof userId === "string" 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  let score = await Score.findOne({ userId: userIdObjectId });

  if (!score) {
    score = await Score.create({
      userId: userIdObjectId,
      xpTotal: xpGanho,
    });
  } else {
    score.xpTotal = (score.xpTotal || 0) + xpGanho;
  }

  const dadosNivel = calcularNivel(score.xpTotal);
  score.nivel = dadosNivel.nivel;
  score.xpAtual = dadosNivel.xpAtual;
  score.xpNecessario = dadosNivel.xpNecessario;
  score.xpAcumulado = dadosNivel.xpAcumulado;

  await score.save();

  return score;
};

/**
 * Endpoint Express: POST /api/score/adicionar-xp
 */
export const adicionarXP = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id || req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const { xpGanho } = req.body;
    
    if (xpGanho === undefined || xpGanho < 0) {
      return res.status(400).json({
        message: "xpGanho é obrigatório e deve ser maior ou igual a 0",
      });
    }

    const score = await adicionarXPInterno(userId, xpGanho);

    return res.status(200).json({
      message: "XP adicionado com sucesso",
      xpGanho,
      score: {
        xpTotal: score.xpTotal,
        nivel: score.nivel,
        xpAtual: score.xpAtual,
        xpNecessario: score.xpNecessario,
        xpAcumulado: score.xpAcumulado,
      },
    });
  } catch (error) {
    const err = error as Error;
    logHandledError("scoreController.adicionarXP", err);
    return res.status(500).json({
      message: "Erro ao adicionar XP",
      error: err.message,
    });
  }
};

/**
 * Função interna para obter score do usuário
 */
export const obterScoreUsuarioInterno = async (userId: string | mongoose.Types.ObjectId) => {
  const userIdObjectId = typeof userId === "string" 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  let score = await Score.findOne({ userId: userIdObjectId });

  if (!score) {
    score = await Score.create({
      userId: userIdObjectId,
      xpTotal: 0,
    });
    const dadosNivel = calcularNivel(0);
    score.nivel = dadosNivel.nivel;
    score.xpAtual = dadosNivel.xpAtual;
    score.xpNecessario = dadosNivel.xpNecessario;
    score.xpAcumulado = dadosNivel.xpAcumulado;
    await score.save();
  } else {
    const dadosNivel = calcularNivel(score.xpTotal);
    if (
      score.nivel !== dadosNivel.nivel ||
      score.xpAtual !== dadosNivel.xpAtual ||
      score.xpNecessario !== dadosNivel.xpNecessario ||
      score.xpAcumulado !== dadosNivel.xpAcumulado
    ) {
      score.nivel = dadosNivel.nivel;
      score.xpAtual = dadosNivel.xpAtual;
      score.xpNecessario = dadosNivel.xpNecessario;
      score.xpAcumulado = dadosNivel.xpAcumulado;
      await score.save();
    }
  }

  return score;
};

/**
 * Endpoint Express: GET /api/score/usuario
 */
export const obterScoreUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id || req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const score = await obterScoreUsuarioInterno(userId);

    return res.json({
      xpTotal: score.xpTotal,
      nivel: score.nivel,
      xpAtual: score.xpAtual,
      xpNecessario: score.xpNecessario,
      xpAcumulado: score.xpAcumulado,
    });
  } catch (error) {
    const err = error as Error;
    logHandledError("scoreController.obterScoreUsuario", err);
    return res.status(500).json({
      message: "Erro ao obter score do usuário",
      error: err.message,
    });
  }
};

/**
 * Função interna para obter scores de múltiplos usuários
 */
export const obterScoreUsuariosInterno = async (userIds: string[] | mongoose.Types.ObjectId[]) => {
  const scores = await Score.find({
    userId: { $in: userIds },
  });

  const scoresMap = new Map<string, IScore>();
  scores.forEach((score) => {
    scoresMap.set(score.userId.toString(), score);
  });

  const resultados = userIds.map((userId) => {
    const userIdStr = userId.toString();
    const score = scoresMap.get(userIdStr);
    
    if (score) {
      const dadosNivel = calcularNivel(score.xpTotal);
      return {
        userId: score.userId.toString(),
        xpTotal: score.xpTotal,
        nivel: dadosNivel.nivel,
        xpAtual: dadosNivel.xpAtual,
        xpNecessario: dadosNivel.xpNecessario,
        xpAcumulado: dadosNivel.xpAcumulado,
      };
    } else {
      const dadosNivel = calcularNivel(0);
      return {
        userId: userIdStr,
        xpTotal: 0,
        nivel: dadosNivel.nivel,
        xpAtual: dadosNivel.xpAtual,
        xpNecessario: dadosNivel.xpNecessario,
        xpAcumulado: dadosNivel.xpAcumulado,
      };
    }
  });

  return resultados;
};

/**
 * Endpoint Express: POST /api/score/usuarios
 */
export const obterScoreUsuarios = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        message: "userIds deve ser um array não vazio",
      });
    }

    const resultados = await obterScoreUsuariosInterno(userIds);

    return res.json(resultados);
  } catch (error) {
    const err = error as Error;
    logHandledError("scoreController.obterScoreUsuarios", err);
    return res.status(500).json({
      message: "Erro ao obter scores de usuários",
      error: err.message,
    });
  }
};

/**
 * Endpoint Express: POST /api/score/calcular-xp
 */
export const calcularXPFromPercentage = async (req: Request, res: Response) => {
  try {
    const { porcentagemAcertos } = req.body;

    if (porcentagemAcertos === undefined || porcentagemAcertos < 0 || porcentagemAcertos > 100) {
      return res.status(400).json({
        message: "porcentagemAcertos deve ser um número entre 0 e 100",
      });
    }

    const xpGanho = calcularXP(porcentagemAcertos);

    return res.json({
      porcentagemAcertos,
      xpGanho,
    });
  } catch (error) {
    const err = error as Error;
    logHandledError("scoreController.calcularXPFromPercentage", err);
    return res.status(500).json({
      message: "Erro ao calcular XP",
      error: err.message,
    });
  }
};
