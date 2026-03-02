import express from "express";
import { verificarToken } from "../middlewares/authMiddleware";
import {
  salvarTrilha,
  removerTrilhaSalva,
  listarTrilhasSalvas,
  verificarSeSalva,
} from "../controllers/licaoSalvaController";

const router = express.Router();

// Todas as rotas aqui exigem um usuário autenticado
router.use(verificarToken);

router.post("/", salvarTrilha);
router.delete("/:trilhaId", removerTrilhaSalva);
router.get("/", listarTrilhasSalvas);
router.get("/verificar/:trilhaId", verificarSeSalva);

export default router;
