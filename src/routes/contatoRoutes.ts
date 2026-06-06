import express from "express";
import { criarContato, listarContatos } from "../controllers/contatoController";
import { verificarToken, verificarTokenOpcional } from "../middlewares/authMiddleware";

const router = express.Router();

// Permite contato anônimo ou de usuário logado
router.post("/", verificarTokenOpcional, criarContato);

// Apenas administradores logados podem ver mensagens
router.get("/", verificarToken, listarContatos);

export default router;
