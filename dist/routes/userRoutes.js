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
// --- Rotas de Autenticação e Registro ---
router.post("/login", userController_1.loginUser);
router.post("/register", userController_1.registerUser);
router.get("/termos", userController_1.obterTermos);
// --- Rotas de Perfil e Usuário ---
router.post("/criar-perfil", authMiddleware_1.verificarToken, upload.single('fotoPerfil'), userController_1.criarPerfil);
router.get("/verify", authMiddleware_1.verificarToken, userController_1.verificarAutenticacao);
router.get("/me", authMiddleware_1.verificarToken, userController_1.buscarMeusDados);
router.delete("/me", authMiddleware_1.verificarToken, userController_1.excluirConta);
router.get("/", authMiddleware_1.verificarToken, userController_1.listarUsuarios);
// --- Rotas de Gerenciamento de Conta ---
router.put("/dados-pessoais", authMiddleware_1.verificarToken, userController_1.atualizarDadosPessoais);
router.put("/mudar-senha", authMiddleware_1.verificarToken, userController_1.mudarSenha);
// --- Rotas de Recuperação de Senha ---
router.post("/solicitar-recuperacao", userController_1.solicitarRecuperacaoSenha);
router.post("/redefinir-senha", userController_1.redefinirSenha);
router.get("/verificar-token/:token", userController_1.verificarTokenReset);
// --- Rotas de Preferências ---
router.put("/tema", authMiddleware_1.verificarToken, userController_1.atualizarTema);
router.put("/idioma", authMiddleware_1.verificarToken, userController_1.atualizarIdioma);
router.put("/atualizar-personagem", authMiddleware_1.verificarToken, userController_1.atualizarPersonagem);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map