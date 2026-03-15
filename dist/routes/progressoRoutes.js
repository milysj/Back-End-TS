"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const progressoController_1 = require("../controllers/progressoController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Todas as rotas de progresso exigem um usuário autenticado
router.use(authMiddleware_1.verificarToken);
router.post("/salvar", progressoController_1.salvarResultado);
router.post("/salvar-resposta", progressoController_1.salvarResposta);
router.get("/verificar/:faseId", progressoController_1.verificarProgresso);
router.get("/trilha/:trilhaId", progressoController_1.obterProgressoTrilha);
router.get("/usuario", progressoController_1.obterDadosUsuario);
exports.default = router;
//# sourceMappingURL=progressoRoutes.js.map