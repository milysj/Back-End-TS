import express from "express";
import { verificarToken } from "../middlewares/authMiddleware";
import { getHomeData } from "../controllers/homeController";
import GoogleGemini from "../controllers/geminiController";

const router = express.Router();

router.get("/", verificarToken, getHomeData);

router.get("/geminiController", GoogleGemini.gerarTexto);

export default router;
