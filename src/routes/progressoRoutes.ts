import express from "express";
import {
  salvarResultado,
  salvarResposta,
  verificarProgresso,
  obterProgressoTrilha,
  obterDadosUsuario,
} from "../controllers/progressoController";
import { verificarToken } from "../middlewares/authMiddleware";

const router = express.Router();

// Todas as rotas de progresso exigem um usuário autenticado
router.use(verificarToken);

router.post("/salvar", salvarResultado);
router.post("/salvar-resposta", salvarResposta);
router.get("/verificar/:faseId", verificarProgresso);
router.get("/trilha/:trilhaId", obterProgressoTrilha);
router.get("/usuario", obterDadosUsuario);

export default router;
