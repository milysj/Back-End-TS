"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const emailVerificationService_1 = require("../services/emailVerificationService");
const user_1 = __importDefault(require("../models/user"));
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
// --- Configuração do Multer para Upload de Imagem de Perfil ---
const uploadDir = path_1.default.join(process.cwd(), "public/uploads");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});
const upload = (0, multer_1.default)({ storage });
// --- Rotas de Autenticação ---
router.post("/login", userController_1.loginUser);
router.post("/register", userController_1.registerUser);
router.get("/verify", authMiddleware_1.verificarToken, userController_1.verificarAutenticacao);
router.get("/confirmar", userController_1.confirmarEmail);
router.post("/reenviar-verificacao", async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email || !email.toString().trim()) {
            return res.status(400).json({ message: "Email é obrigatório para reenviar verificação." });
        }
        const emailLower = email.toString().trim().toLowerCase();
        const usuario = await user_1.default.findOne({ email: emailLower });
        if (!usuario) {
            return res.status(404).json({ message: "Usuário não encontrado para este e-mail." });
        }
        if (usuario.isVerified) {
            return res.status(400).json({ message: "Conta já está verificada." });
        }
        if (!usuario.verificationToken || !usuario.tokenExpires || usuario.tokenExpires < new Date()) {
            usuario.verificationToken = crypto_1.default.randomBytes(32).toString("hex");
            usuario.tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
            await usuario.save();
        }
        await (0, emailVerificationService_1.sendVerificationEmail)(usuario.email, usuario.nome || "Usuário", usuario.verificationToken);
        return res.status(200).json({ message: "E-mail de verificação reenviado com sucesso." });
    }
    catch (error) {
        return next(error);
    }
});
// --- Rotas de Perfil (Autenticação) ---
router.post("/criarPerfil", authMiddleware_1.verificarToken, upload.single('fotoPerfil'), userController_1.criarPerfil);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map