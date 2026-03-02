import express from "express";
import { verificarToken } from "../middlewares/authMiddleware";
import { getHomeData } from "../controllers/homeController";

const router = express.Router();

router.get("/", verificarToken, getHomeData);

export default router;
