import express from "express";
import { verificarToken, verificarProfessor, verificarTokenOpcional } from "../middlewares/authMiddleware";
import {
  criarTrilha,
  listarTrilhas,
  atualizarTrilha,
  deletarTrilha,
  trilhasNovidades,
  trilhasPopulares,
  trilhasContinue,
  iniciarTrilha,
  buscarTrilhas,
  visualizarTrilha,
  buscarTrilhaPorId,
} from "../controllers/trilhaController";

const router = express.Router();

// Rotas para gerenciar trilhas (criar, listar do professor, atualizar, deletar)
router.post("/", verificarToken, verificarProfessor, criarTrilha);
router.get("/", verificarToken, verificarProfessor, listarTrilhas);
router.put("/:id", verificarToken, verificarProfessor, atualizarTrilha);
router.delete("/:id", verificarToken, verificarProfessor, deletarTrilha);

// Rotas da Home e descoberta
router.get("/novidades", verificarToken, trilhasNovidades);
router.get("/populares", trilhasPopulares); // Rota pública
router.get("/continue", verificarToken, trilhasContinue);
router.post("/iniciar/:trilhaId", verificarToken, iniciarTrilha);

// Rotas de busca e visualização (com token opcional)
router.get("/buscar", verificarTokenOpcional, buscarTrilhas);
router.post("/visualizar/:id", verificarTokenOpcional, visualizarTrilha);
router.get("/:id", verificarTokenOpcional, buscarTrilhaPorId);

export default router;
