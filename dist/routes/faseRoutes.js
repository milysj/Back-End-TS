"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const faseController_1 = require("../controllers/faseController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// As rotas de listagem e busca são públicas ou para qualquer usuário autenticado
router.get("/", authMiddleware_1.verificarToken, faseController_1.listarFases);
router.get("/trilha/:trilhaId", authMiddleware_1.verificarToken, faseController_1.buscarFasesPorTrilha);
router.get("/secao/:secaoId", authMiddleware_1.verificarToken, faseController_1.buscarFasesPorSecao);
router.get("/:id", authMiddleware_1.verificarToken, faseController_1.buscarFasePorId);
// Apenas usuários autenticados podem concluir uma fase
router.post("/concluir", authMiddleware_1.verificarToken, faseController_1.concluirFase);
// Apenas professores e administradores podem criar, atualizar e deletar fases
router.post("/", authMiddleware_1.verificarToken, authMiddleware_1.verificarProfessor, faseController_1.criarFase);
router.put("/:id", authMiddleware_1.verificarToken, authMiddleware_1.verificarProfessor, faseController_1.atualizarFase);
router.delete("/:id", authMiddleware_1.verificarToken, authMiddleware_1.verificarProfessor, faseController_1.deletarFase);
exports.default = router;
//# sourceMappingURL=faseRoutes.js.map