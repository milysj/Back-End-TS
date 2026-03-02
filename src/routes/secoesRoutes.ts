import express from "express";
import {
  listarSecoes,
  buscarSecoesPorTrilha,
  buscarSecaoPorId,
  criarSecao,
  atualizarSecao,
  deletarSecao,
} from "../controllers/secaoController";
import { verificarToken, verificarProfessor } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/", verificarToken, listarSecoes);
router.get("/trilha/:trilhaId", verificarToken, buscarSecoesPorTrilha);
router.get("/:id", verificarToken, buscarSecaoPorId);

// Apenas professores e administradores podem criar, atualizar e deletar seções
router.post("/", verificarToken, verificarProfessor, criarSecao);
router.put("/:id", verificarToken, verificarProfessor, atualizarSecao);
router.delete("/:id", verificarToken, verificarProfessor, deletarSecao);

export default router;
