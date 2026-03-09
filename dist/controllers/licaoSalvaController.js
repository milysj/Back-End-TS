"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificarSeSalva = exports.listarTrilhasSalvas = exports.removerTrilhaSalva = exports.salvarTrilha = void 0;
const licaoSalva_1 = __importDefault(require("../models/licaoSalva"));
const trilha_1 = __importDefault(require("../models/trilha"));
const salvarTrilha = async (req, res) => {
    try {
        const userId = req.user._id;
        const { trilhaId } = req.body;
        if (!trilhaId)
            return res.status(400).json({ message: "trilhaId é obrigatório" });
        const trilha = await trilha_1.default.findById(trilhaId);
        if (!trilha)
            return res.status(404).json({ message: "Trilha não encontrada" });
        const jaSalva = await licaoSalva_1.default.findOne({ usuario: userId, trilha: trilhaId });
        if (jaSalva)
            return res.status(400).json({ message: "Trilha já está salva" });
        const licaoSalva = await licaoSalva_1.default.create({ usuario: userId, trilha: trilhaId });
        return res.status(201).json({ message: "Trilha salva com sucesso", licaoSalva });
    }
    catch (error) {
        const err = error;
        if (err.code === 11000)
            return res.status(400).json({ message: "Trilha já está salva" });
        console.error("Erro ao salvar trilha:", err);
        return res.status(500).json({ message: "Erro ao salvar trilha", error: err.message });
    }
};
exports.salvarTrilha = salvarTrilha;
const removerTrilhaSalva = async (req, res) => {
    try {
        const userId = req.user._id;
        const { trilhaId } = req.params;
        const licaoSalva = await licaoSalva_1.default.findOneAndDelete({ usuario: userId, trilha: trilhaId });
        if (!licaoSalva)
            return res.status(404).json({ message: "Trilha não estava salva" });
        return res.json({ message: "Trilha removida das salvas com sucesso" });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao remover trilha salva:", err);
        return res.status(500).json({ message: "Erro ao remover trilha salva", error: err.message });
    }
};
exports.removerTrilhaSalva = removerTrilhaSalva;
const listarTrilhasSalvas = async (req, res) => {
    try {
        const userId = req.user._id;
        const licoesSalvas = await licaoSalva_1.default.find({ usuario: userId }).populate({ path: 'trilha', select: 'titulo descricao materia dificuldade imagem usuario', populate: { path: 'usuario', select: 'nome username' } }).sort({ createdAt: -1 });
        const trilhas = licoesSalvas.map(ls => ls.trilha).filter(t => t !== null);
        return res.json(trilhas);
    }
    catch (error) {
        const err = error;
        console.error("Erro ao listar trilhas salvas:", err);
        return res.status(500).json({ message: "Erro ao listar trilhas salvas", error: err.message });
    }
};
exports.listarTrilhasSalvas = listarTrilhasSalvas;
const verificarSeSalva = async (req, res) => {
    try {
        const userId = req.user._id;
        const { trilhaId } = req.params;
        const licaoSalva = await licaoSalva_1.default.findOne({ usuario: userId, trilha: trilhaId });
        return res.json({ salva: !!licaoSalva });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao verificar se trilha está salva:", err);
        return res.status(500).json({ message: "Erro ao verificar", error: err.message });
    }
};
exports.verificarSeSalva = verificarSeSalva;
