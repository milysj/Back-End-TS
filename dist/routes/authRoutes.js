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
// --- Rotas de Perfil (Autenticação) ---
router.post("/criarPerfil", authMiddleware_1.verificarToken, upload.single('fotoPerfil'), userController_1.criarPerfil);
exports.default = router;
