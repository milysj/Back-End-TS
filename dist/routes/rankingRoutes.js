"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rankingController_1 = require("../controllers/rankingController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Ambas as rotas de ranking exigem um usuário autenticado
router.use(authMiddleware_1.verificarToken);
router.get("/", rankingController_1.obterRanking);
router.get("/nivel", rankingController_1.obterRankingNivel);
exports.default = router;
//# sourceMappingURL=rankingRoutes.js.map