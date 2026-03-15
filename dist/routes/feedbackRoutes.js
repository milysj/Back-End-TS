"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const feedbackController_1 = require("../controllers/feedbackController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Permite feedback anônimo (token opcional) ou de usuário logado
router.post("/", authMiddleware_1.verificarTokenOpcional, feedbackController_1.criarFeedback);
// Apenas usuários autenticados (e administradores, conforme lógica do controller) podem listar
router.get("/", authMiddleware_1.verificarToken, feedbackController_1.listarFeedbacks);
exports.default = router;
//# sourceMappingURL=feedbackRoutes.js.map