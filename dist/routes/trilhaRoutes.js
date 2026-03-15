"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const trilhaController_1 = require("../controllers/trilhaController");
const router = express_1.default.Router();
// Rotas para gerenciar trilhas (criar, listar do professor, atualizar, deletar)
router.post("/", authMiddleware_1.verificarToken, authMiddleware_1.verificarProfessor, trilhaController_1.criarTrilha);
router.get("/", authMiddleware_1.verificarToken, authMiddleware_1.verificarProfessor, trilhaController_1.listarTrilhas);
router.put("/:id", authMiddleware_1.verificarToken, authMiddleware_1.verificarProfessor, trilhaController_1.atualizarTrilha);
router.delete("/:id", authMiddleware_1.verificarToken, authMiddleware_1.verificarProfessor, trilhaController_1.deletarTrilha);
// Rotas da Home e descoberta
router.get("/novidades", authMiddleware_1.verificarToken, trilhaController_1.trilhasNovidades);
router.get("/populares", trilhaController_1.trilhasPopulares); // Rota pública
router.get("/continue", authMiddleware_1.verificarToken, trilhaController_1.trilhasContinue);
router.post("/iniciar/:trilhaId", authMiddleware_1.verificarToken, trilhaController_1.iniciarTrilha);
// Rotas de busca e visualização (com token opcional)
router.get("/buscar", authMiddleware_1.verificarTokenOpcional, trilhaController_1.buscarTrilhas);
router.post("/visualizar/:id", authMiddleware_1.verificarTokenOpcional, trilhaController_1.visualizarTrilha);
router.get("/:id", authMiddleware_1.verificarTokenOpcional, trilhaController_1.buscarTrilhaPorId);
exports.default = router;
//# sourceMappingURL=trilhaRoutes.js.map