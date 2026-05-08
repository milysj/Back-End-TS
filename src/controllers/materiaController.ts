import { Request, Response } from "express";
import Materia from "../models/materia";
import { appLogger } from "../logging/appLogger";

export const getMaterias = async (req: Request, res: Response) => {
  try {
    const materias = await Materia.find({ ativo: true })
      .select("nome")
      .sort({ nome: 1 })
      .lean();
    res.json(materias.map((m) => m.nome));
  } catch (error) {
    appLogger.error("Erro ao buscar matérias:", error);
    res.status(500).json({ message: "Erro ao buscar matérias." });
  }
};
