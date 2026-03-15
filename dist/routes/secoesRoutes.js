"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const secaoController_1 = require("../controllers/secaoController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.get("/", authMiddleware_1.verificarToken, secaoController_1.listarSecoes);
router.get("/trilha/:trilhaId", authMiddleware_1.verificarToken, secaoController_1.buscarSecoesPorTrilha);
router.get("/:id", authMiddleware_1.verificarToken, secaoController_1.buscarSecaoPorId);
// Apenas professores e administradores podem criar, atualizar e deletar seções
router.post("/", authMiddleware_1.verificarToken, authMiddleware_1.verificarProfessor, secaoController_1.criarSecao);
router.put("/:id", authMiddleware_1.verificarToken, authMiddleware_1.verificarProfessor, secaoController_1.atualizarSecao);
router.delete("/:id", authMiddleware_1.verificarToken, authMiddleware_1.verificarProfessor, secaoController_1.deletarSecao);
exports.default = router;
//# sourceMappingURL=secoesRoutes.js.map