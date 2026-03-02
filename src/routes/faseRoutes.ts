import express from "express";
import {
  criarFase,
  listarFases,
  buscarFasePorId,
  buscarFasesPorTrilha,
  buscarFasesPorSecao,
  concluirFase,
  atualizarFase,
  deletarFase,
} from "../controllers/faseController";
import { verificarToken, verificarProfessor } from "../middlewares/authMiddleware";

const router = express.Router();

// As rotas de listagem e busca são públicas ou para qualquer usuário autenticado
router.get("/", verificarToken, listarFases);
router.get("/trilha/:trilhaId", verificarToken, buscarFasesPorTrilha);
router.get("/secao/:secaoId", verificarToken, buscarFasesPorSecao);
router.get("/:id", verificarToken, buscarFasePorId);

// Apenas usuários autenticados podem concluir uma fase
router.post("/concluir", verificarToken, concluirFase);

// Apenas professores e administradores podem criar, atualizar e deletar fases
router.post("/", verificarToken, verificarProfessor, criarFase);
router.put("/:id", verificarToken, verificarProfessor, atualizarFase);
router.delete("/:id", verificarToken, verificarProfessor, deletarFase);

export default router;
