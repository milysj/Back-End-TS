import Materia from "../models/materia";
import { appLogger } from "../logging/appLogger";

const MATERIAS_INICIAIS = [
  "Matemática",
  "Português",
  "Ciências",
  "História",
  "Geografia",
  "Inglês",
  "Física",
  "Química",
  "Biologia",
  "Artes",
  "Educação Física",
  "Filosofia",
  "Sociologia"
];

export const seedMaterias = async () => {
  try {
    const count = await Materia.countDocuments();
    if (count === 0) {
      appLogger.info("Semeando matérias iniciais no banco de dados...");
      const ops = MATERIAS_INICIAIS.map((nome) => ({
        insertOne: { document: { nome, ativo: true } },
      }));
      await Materia.bulkWrite(ops);
      appLogger.info("Matérias iniciais cadastradas com sucesso.");
    }
  } catch (error: any) {
    appLogger.error("Erro ao semear matérias", { errorMessage: error.message, stack: error.stack });
  }
};
