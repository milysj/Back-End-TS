import express from "express";
import {
  listarPerguntasPorFase,
  criarPergunta,
  atualizarPergunta,
  deletarPergunta,
} from "../controllers/perguntaController";
import { verificarToken } from "../middlewares/authMiddleware";

const router = express.Router();

// Todas as rotas de perguntas exigem autenticação
router.use(verificarToken);

router.get("/fase/:faseId", listarPerguntasPorFase);
router.post("/", criarPergunta);
router.put("/:faseId/:perguntaIndex", atualizarPergunta);
router.delete("/:faseId/:perguntaIndex", deletarPergunta);

export default router;
