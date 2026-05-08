import { Request, Response } from "express";
import { IUser } from "../models/user";
import { gerarSugestaoTrilhaViaServicoIa, type DificuldadeTrilha } from "../services/geminiTrilhaSugestaoService";

interface AuthRequest extends Request {
  user?: IUser;
}

const DIFICULDADES: DificuldadeTrilha[] = ["Facil", "Medio", "Dificil"];

/**
 * POST /api/trilhas/gerar-com-ia — encaminha ao microsserviço Integra-o-LLM (`POST .../api/trilha/gerar`).
 * `TRILHA_IA_API_URL`: URL base (ex.: http://localhost:3780) ou URL completa do endpoint.
 * O backend monta o texto de tema com matéria, objetivo e RAG do Mongo; resposta `{ modulos, descricaoTrilha }` é convertida para `{ trilha, secoes }`.
 */
export const gerarTrilhaComIa = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    if (!process.env.TRILHA_IA_API_URL?.trim()) {
      return res
        .status(503)
        .json({
          message:
            "Serviço de IA não configurado. Defina TRILHA_IA_API_URL (ex.: http://localhost:3780 — Integra-o-LLM). Opcional: TRILHA_IA_API_KEY = SERVICE_API_KEY do microsserviço.",
        });
    }

    const {
      materia,
      titulo,
      dificuldade,
      temaOuObjetivo,
      numeroSecoes,
      fasesPorSecao,
      perguntasPorFase,
    } = req.body as Record<string, unknown>;

    if (typeof materia !== "string" || !materia.trim()) {
      return res.status(400).json({ message: "Campo materia é obrigatório." });
    }

    let diff: DificuldadeTrilha | undefined;
    if (dificuldade !== undefined && dificuldade !== null && dificuldade !== "") {
      if (typeof dificuldade !== "string" || !DIFICULDADES.includes(dificuldade as DificuldadeTrilha)) {
        return res.status(400).json({ message: "dificuldade deve ser Facil, Medio ou Dificil." });
      }
      diff = dificuldade as DificuldadeTrilha;
    }

    const sugestao = await gerarSugestaoTrilhaViaServicoIa({
      materia,
      titulo: typeof titulo === "string" ? titulo : undefined,
      dificuldade: diff,
      temaOuObjetivo: typeof temaOuObjetivo === "string" ? temaOuObjetivo : undefined,
      numeroSecoes: typeof numeroSecoes === "number" ? numeroSecoes : undefined,
      fasesPorSecao: typeof fasesPorSecao === "number" ? fasesPorSecao : undefined,
      perguntasPorFase: typeof perguntasPorFase === "number" ? perguntasPorFase : undefined,
    });

    return res.status(200).json(sugestao);
  } catch (error) {
    const err = error as Error;
    console.error("Erro em gerarTrilhaComIa:", err.message);
    return res.status(500).json({ message: "Erro ao gerar sugestões com IA.", error: err.message });
  }
};
