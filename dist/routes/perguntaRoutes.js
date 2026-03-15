"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const perguntaController_1 = require("../controllers/perguntaController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Todas as rotas de perguntas exigem autenticação
router.use(authMiddleware_1.verificarToken);
router.get("/fase/:faseId", perguntaController_1.listarPerguntasPorFase);
router.post("/", perguntaController_1.criarPergunta);
router.put("/:faseId/:perguntaIndex", perguntaController_1.atualizarPergunta);
router.delete("/:faseId/:perguntaIndex", perguntaController_1.deletarPergunta);
exports.default = router;
//# sourceMappingURL=perguntaRoutes.js.map