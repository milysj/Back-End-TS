import express from "express";
import { obterRanking, obterRankingNivel } from "../controllers/rankingController";
import { verificarToken } from "../middlewares/authMiddleware";

const router = express.Router();

// Ambas as rotas de ranking exigem um usuário autenticado
router.use(verificarToken);

router.get("/", obterRanking);
router.get("/nivel", obterRankingNivel);

export default router;
