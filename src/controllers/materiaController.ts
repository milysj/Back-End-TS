import { Request, Response } from "express";
import Materia from "../models/materia";
import Trilha from "../models/trilha";
import { appLogger, logHandledError } from "../logging/appLogger";

export const getMaterias = async (req: Request, res: Response) => {
  try {
    const materias = await Materia.find({ ativo: true })
      .select("nome")
      .sort({ nome: 1 })
      .lean();
    res.json(materias.map((m) => m.nome));
  } catch (error) {
    logHandledError('materiaController.getMaterias', error as Error);
    res.status(500).json({ message: "Erro ao buscar matérias." });
  }
};

export const criarMateria = async (req: Request, res: Response): Promise<Response> => {
  const { nome } = req.body;
  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return res.status(400).json({ message: "Nome da matéria é obrigatório." });
  }
  try {
    const nomeTrimmed = nome.trim();
    // Busca case-insensitive
    const materiaExistente = await Materia.findOne({
      nome: { $regex: new RegExp(`^${nomeTrimmed}$`, "i") }
    });
    if (materiaExistente) {
      return res.status(409).json({ message: "Matéria já cadastrada." });
    }
    const novaMateria = new Materia({ nome: nomeTrimmed });
    await novaMateria.save();
    void appLogger.info("materia.create.success", { nome: novaMateria.nome });
    return res.status(201).json(novaMateria);
  } catch (error) {
    logHandledError("materiaController.criarMateria", error as Error);
    return res.status(500).json({ message: "Erro ao criar matéria." });
  }
};

export const deletarMateria = async (req: Request, res: Response): Promise<Response> => {
  const { nome } = req.params;
  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return res.status(400).json({ message: "Nome da matéria é obrigatório para exclusão." });
  }
  try {
    const nomeTrimmed = nome.trim();
    const materia = await Materia.findOne({ nome: { $regex: new RegExp(`^${nomeTrimmed}$`, "i") } });
    if (!materia) {
      return res.status(404).json({ message: "Matéria não encontrada." });
    }
    
    // Validar se há alguma Trilha utilizando essa matéria
    const trilhaAssociada = await Trilha.findOne({ materia: materia.nome });
    if (trilhaAssociada) {
      return res.status(400).json({
        message: `Não é possível excluir a matéria "${materia.nome}" pois ela possui trilhas associadas.`
      });
    }

    await Materia.deleteOne({ _id: materia._id });
    void appLogger.info("materia.delete.success", { nome: materia.nome });
    return res.json({ message: "Matéria excluída com sucesso." });
  } catch (error) {
    logHandledError("materiaController.deletarMateria", error as Error);
    return res.status(500).json({ message: "Erro ao excluir matéria." });
  }
};

export const atualizarMateria = async (req: Request, res: Response): Promise<Response> => {
  const { nome } = req.params;
  const { novoNome } = req.body;

  if (!nome || typeof nome !== "string" || !nome.trim() || !novoNome || typeof novoNome !== "string" || !novoNome.trim()) {
    return res.status(400).json({ message: "Nome antigo e novo nome são obrigatórios." });
  }


  try {
    const nomeTrimmed = nome.trim();
    const novoNomeTrimmed = novoNome.trim();

    // Encontra a matéria antiga
    const materia = await Materia.findOne({ nome: { $regex: new RegExp(`^${nomeTrimmed}$`, "i") } });
    if (!materia) {
      return res.status(404).json({ message: "Matéria não encontrada." });
    }

    // Verifica se já existe outra com o novo nome
    if (nomeTrimmed.toLowerCase() !== novoNomeTrimmed.toLowerCase()) {
      const existeOutra = await Materia.findOne({ nome: { $regex: new RegExp(`^${novoNomeTrimmed}$`, "i") } });
      if (existeOutra) {
        return res.status(409).json({ message: "Já existe uma matéria com este nome." });
      }
    }

    // Atualiza matérias
    materia.nome = novoNomeTrimmed;
    await materia.save();

    // Atualiza trilhas que usavam o nome antigo
    await Trilha.updateMany({ materia: nomeTrimmed }, { materia: novoNomeTrimmed });

    void appLogger.info("materia.update.success", { de: nomeTrimmed, para: novoNomeTrimmed });
    return res.json({ message: "Matéria atualizada com sucesso.", materia });
  } catch (error) {
    logHandledError("materiaController.atualizarMateria", error as Error);
    return res.status(500).json({ message: "Erro ao atualizar matéria." });
  }
};

