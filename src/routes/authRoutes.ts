import express from "express";
import {
    loginUser,
    registerUser,
    verificarAutenticacao,
    criarPerfil,
    confirmarEmail,
} from "../controllers/userController";
import { verificarToken } from "../middlewares/authMiddleware";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// --- Configuração do Multer para Upload de Imagem de Perfil ---
const uploadDir = path.join(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});
const upload = multer({ storage });

// --- Rotas de Autenticação ---
router.post("/login", loginUser);
router.post("/register", registerUser);
router.get("/verify", verificarToken, verificarAutenticacao);
router.get("/confirmar", confirmarEmail);

// --- Rotas de Perfil (Autenticação) ---
router.post("/criarPerfil", verificarToken, upload.single('fotoPerfil'), criarPerfil);

export default router;
