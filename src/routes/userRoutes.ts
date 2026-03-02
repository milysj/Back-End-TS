import express from "express";
import {
    loginUser,
    registerUser,
    obterTermos,
    criarPerfil,
    verificarAutenticacao,
    buscarMeusDados,
    atualizarDadosPessoais,
    mudarSenha,
    solicitarRecuperacaoSenha,
    redefinirSenha,
    verificarTokenReset,
    excluirConta,
    atualizarTema,
    atualizarPersonagem,
    atualizarIdioma,
    listarUsuarios
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

// --- Rotas de Autenticação e Registro ---
router.post("/login", loginUser);
router.post("/register", registerUser);
router.get("/termos", obterTermos);

// --- Rotas de Perfil e Usuário ---
router.post("/criar-perfil", verificarToken, upload.single('fotoPerfil'), criarPerfil);
router.get("/verify", verificarToken, verificarAutenticacao);
router.get("/me", verificarToken, buscarMeusDados);
router.delete("/me", verificarToken, excluirConta);
router.get("/", verificarToken, listarUsuarios); 

// --- Rotas de Gerenciamento de Conta ---
router.put("/dados-pessoais", verificarToken, atualizarDadosPessoais);
router.put("/mudar-senha", verificarToken, mudarSenha);

// --- Rotas de Recuperação de Senha ---
router.post("/solicitar-recuperacao", solicitarRecuperacaoSenha);
router.post("/redefinir-senha", redefinirSenha);
router.get("/verificar-token/:token", verificarTokenReset);

// --- Rotas de Preferências ---
router.put("/tema", verificarToken, atualizarTema);
router.put("/idioma", verificarToken, atualizarIdioma);
router.put("/atualizar-personagem", verificarToken, atualizarPersonagem);

export default router;
