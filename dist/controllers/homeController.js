"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomeData = void 0;
const trilha_1 = __importDefault(require("../models/trilha"));
const getHomeData = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = req.user;
        const novidades = await trilha_1.default.find().select("-usuariosIniciaram").sort({ dataCriacao: -1 }).limit(10);
        const populares = await trilha_1.default.find().select("-usuariosIniciaram").sort({ visualizacoes: -1 }).limit(10);
        const continueTrilhas = await trilha_1.default.find({ usuariosIniciaram: userId }).select("-usuariosIniciaram").limit(10);
        return res.json({ usuario: { nome: user.nome, materiaFavorita: user.materiaFavorita, personagem: user.personagem, fotoPerfil: user.fotoPerfil, }, trilhas: { novidades, populares, continue: continueTrilhas } });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao carregar dados da home:", err);
        return res.status(500).json({ message: "Erro ao carregar dados da home", error: err.message });
    }
};
exports.getHomeData = getHomeData;
