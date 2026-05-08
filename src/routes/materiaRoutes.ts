import { Router } from "express";
import { getMaterias } from "../controllers/materiaController";
import { verificarToken } from "../middlewares/authMiddleware";

const router = Router();

// Rota protegida para buscar matérias ativas
router.get("/", verificarToken, getMaterias);

export default router;