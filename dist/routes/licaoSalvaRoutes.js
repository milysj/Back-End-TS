"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const licaoSalvaController_1 = require("../controllers/licaoSalvaController");
const router = express_1.default.Router();
// Todas as rotas aqui exigem um usuário autenticado
router.use(authMiddleware_1.verificarToken);
router.post("/", licaoSalvaController_1.salvarTrilha);
router.delete("/:trilhaId", licaoSalvaController_1.removerTrilhaSalva);
router.get("/", licaoSalvaController_1.listarTrilhasSalvas);
router.get("/verificar/:trilhaId", licaoSalvaController_1.verificarSeSalva);
exports.default = router;
