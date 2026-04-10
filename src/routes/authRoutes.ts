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
import crypto from "crypto";
import User from "../models/user";
import { sendVerificationEmail } from "../services/emailVerificationService";


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

 router.post("/reenviar-verificacao", async (req, res, next) => {
     try {
        const { email } = req.body;
        if (!email || !email.toString().trim()) {
            return res.status(400).json({ message: "Email é obrigatório para reenviar verificação." });
         }

//         const emailLower = email.toString().trim().toLowerCase();
//         const usuario = await User.findOne({ email: emailLower });
//         if (!usuario) {
//             return res.status(404).json({ message: "Usuário não encontrado para este e-mail." });
//         }
//         if (usuario.isVerified) {
//             return res.status(400).json({ message: "Conta já está verificada." });
//         }

//         if (!usuario.verificationToken || !usuario.tokenExpires || usuario.tokenExpires < new Date()) {
//             usuario.verificationToken = crypto.randomBytes(32).toString("hex");
//             usuario.tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
//             await usuario.save();
//         }

//         await sendVerificationEmail(usuario.email, usuario.nome || "Usuário", usuario.verificationToken!);
//         res.status(200).json({ message: "E-mail de verificação reenviado com sucesso." });
//     } catch (error) {
//         next(error);
//     }
// });

// --- Rotas de Perfil (Autenticação) ---
router.post("/criarPerfil", verificarToken, upload.single('fotoPerfil'), criarPerfil);

export default router;
}
