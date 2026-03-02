import express from "express";
import { criarFeedback, listarFeedbacks } from "../controllers/feedbackController";
import { verificarToken, verificarTokenOpcional } from "../middlewares/authMiddleware";

const router = express.Router();

// Permite feedback anônimo (token opcional) ou de usuário logado
router.post("/", verificarTokenOpcional, criarFeedback);

// Apenas usuários autenticados (e administradores, conforme lógica do controller) podem listar
router.get("/", verificarToken, listarFeedbacks);

export default router;
