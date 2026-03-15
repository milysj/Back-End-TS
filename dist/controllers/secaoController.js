"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletarSecao = exports.atualizarSecao = exports.criarSecao = exports.buscarSecaoPorId = exports.buscarSecoesPorTrilha = exports.listarSecoes = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const secao_1 = __importDefault(require("../models/secao"));
const trilha_1 = __importDefault(require("../models/trilha"));
const listarSecoes = async (req, res) => {
    try {
        const { trilhaId } = req.query;
        const query = {};
        if (trilhaId) {
            if (typeof trilhaId !== 'string' || !mongoose_1.default.Types.ObjectId.isValid(trilhaId)) {
                return res.status(400).json({ message: "ID da trilha inválido" });
            }
            query.trilhaId = trilhaId;
        }
        const secoes = await secao_1.default.find(query).sort({ ordem: 1, createdAt: 1 }).populate({ path: "trilhaId", select: "titulo descricao materia" });
        return res.json(secoes);
    }
    catch (error) {
        const err = error;
        console.error("Erro ao listar seções:", err);
        return res.status(500).json({ message: "Erro ao listar seções", error: err.message });
    }
};
exports.listarSecoes = listarSecoes;
const buscarSecoesPorTrilha = async (req, res) => {
    try {
        const { trilhaId } = req.params;
        if (typeof trilhaId !== 'string' || !mongoose_1.default.Types.ObjectId.isValid(trilhaId)) {
            return res.status(400).json({ message: "ID da trilha inválido" });
        }
        const trilha = await trilha_1.default.findById(trilhaId);
        if (!trilha)
            return res.status(404).json({ message: "Trilha não encontrada" });
        const secoes = await secao_1.default.find({ trilhaId }).sort({ ordem: 1, createdAt: 1 });
        return res.json(secoes);
    }
    catch (error) {
        const err = error;
        console.error("Erro ao buscar seções por trilha:", err);
        return res.status(500).json({ message: "Erro ao buscar seções por trilha", error: err.message });
    }
};
exports.buscarSecoesPorTrilha = buscarSecoesPorTrilha;
const buscarSecaoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        if (typeof id !== 'string' || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID da seção inválido" });
        }
        const secao = await secao_1.default.findById(id).populate({ path: "trilhaId", select: "titulo descricao materia" });
        if (!secao)
            return res.status(404).json({ message: "Seção não encontrada" });
        return res.json(secao);
    }
    catch (error) {
        const err = error;
        console.error("Erro ao buscar seção:", err);
        return res.status(500).json({ message: "Erro ao buscar seção", error: err.message });
    }
};
exports.buscarSecaoPorId = buscarSecaoPorId;
const criarSecao = async (req, res) => {
    try {
        const userId = req.user._id;
        const tipoUsuario = req.user.tipoUsuario;
        const { trilhaId, titulo, descricao, ordem } = req.body;
        if (!trilhaId || !titulo || ordem === undefined)
            return res.status(400).json({ message: "TrilhaId, título e ordem são obrigatórios" });
        if (!mongoose_1.default.Types.ObjectId.isValid(trilhaId))
            return res.status(400).json({ message: "ID da trilha inválido" });
        const trilha = await trilha_1.default.findById(trilhaId);
        if (!trilha)
            return res.status(404).json({ message: "Trilha não encontrada" });
        if (trilha.usuario.toString() !== userId.toString() && tipoUsuario !== "ADMINISTRADOR")
            return res.status(403).json({ message: "Acesso negado." });
        const secaoExistente = await secao_1.default.findOne({ trilhaId, ordem });
        if (secaoExistente)
            return res.status(409).json({ message: "Já existe uma seção com esta ordem nesta trilha" });
        const novaSecao = await secao_1.default.create({ trilhaId, titulo, descricao: descricao || "", ordem });
        return res.status(201).json({ message: "Seção criada com sucesso!", secao: novaSecao });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao criar seção:", err);
        return res.status(500).json({ message: "Erro ao criar seção", error: err.message });
    }
};
exports.criarSecao = criarSecao;
const atualizarSecao = async (req, res) => {
    try {
        const userId = req.user._id;
        const tipoUsuario = req.user.tipoUsuario;
        const { id } = req.params;
        if (typeof id !== 'string' || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID da seção inválido" });
        }
        const { trilhaId, titulo, descricao, ordem } = req.body;
        const secao = await secao_1.default.findById(id);
        if (!secao)
            return res.status(404).json({ message: "Seção não encontrada" });
        const trilha = await trilha_1.default.findById(secao.trilhaId);
        if (!trilha)
            return res.status(404).json({ message: "Trilha associada não encontrada" });
        if (trilha.usuario.toString() !== userId.toString() && tipoUsuario !== "ADMINISTRADOR")
            return res.status(403).json({ message: "Acesso negado." });
        if (trilhaId && (typeof trilhaId !== 'string' || !mongoose_1.default.Types.ObjectId.isValid(trilhaId))) {
            return res.status(400).json({ message: "ID da nova trilha é inválido" });
        }
        if (ordem !== undefined && ordem !== secao.ordem) {
            const secaoComOrdem = await secao_1.default.findOne({ trilhaId: trilhaId || secao.trilhaId, ordem, _id: { $ne: id } });
            if (secaoComOrdem)
                return res.status(409).json({ message: "Já existe uma seção com esta ordem nesta trilha" });
        }
        const camposAtualizar = {};
        if (trilhaId)
            camposAtualizar.trilhaId = trilhaId;
        if (titulo)
            camposAtualizar.titulo = titulo;
        if (descricao !== undefined)
            camposAtualizar.descricao = descricao;
        if (ordem !== undefined)
            camposAtualizar.ordem = ordem;
        const secaoAtualizada = await secao_1.default.findByIdAndUpdate(id, camposAtualizar, { new: true, runValidators: true });
        return res.json({ message: "Seção atualizada com sucesso!", secao: secaoAtualizada });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao atualizar seção:", err);
        return res.status(500).json({ message: "Erro ao atualizar seção", error: err.message });
    }
};
exports.atualizarSecao = atualizarSecao;
const deletarSecao = async (req, res) => {
    try {
        const userId = req.user._id;
        const tipoUsuario = req.user.tipoUsuario;
        const { id } = req.params;
        if (typeof id !== 'string' || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID da seção inválido" });
        }
        const secao = await secao_1.default.findById(id);
        if (!secao)
            return res.status(404).json({ message: "Seção não encontrada" });
        const trilha = await trilha_1.default.findById(secao.trilhaId);
        if (!trilha) {
            if (tipoUsuario !== "ADMINISTRADOR")
                return res.status(404).json({ message: "Trilha associada não encontrada." });
        }
        else {
            if (trilha.usuario.toString() !== userId.toString() && tipoUsuario !== "ADMINISTRADOR")
                return res.status(403).json({ message: "Acesso negado." });
        }
        await secao_1.default.findByIdAndDelete(id);
        return res.json({ message: "Seção deletada com sucesso" });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao deletar seção:", err);
        return res.status(500).json({ message: "Erro ao deletar seção", error: err.message });
    }
};
exports.deletarSecao = deletarSecao;
//# sourceMappingURL=secaoController.js.map