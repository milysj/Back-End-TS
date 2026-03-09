"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const homeController_1 = require("../controllers/homeController");
const router = express_1.default.Router();
router.get("/", authMiddleware_1.verificarToken, homeController_1.getHomeData);
exports.default = router;
