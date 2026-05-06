import { Router } from "express";
import {
  adicionarXP,
  obterScoreUsuario,
  obterScoreUsuarios,
  calcularXPFromPercentage,
} from "../controllers/scoreController";
import { verificarToken } from "../middlewares/authMiddleware";

const router = Router();

router.post("/adicionar-xp", verificarToken, adicionarXP);
router.get("/usuario", verificarToken, obterScoreUsuario);
router.post("/usuarios", verificarToken, obterScoreUsuarios);
router.post("/calcular-xp", verificarToken, calcularXPFromPercentage);

export default router;
