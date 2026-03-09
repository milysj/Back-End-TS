"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.visualizarTrilha = exports.buscarTrilhaPorId = exports.buscarTrilhas = exports.iniciarTrilha = exports.trilhasContinue = exports.trilhasPopulares = exports.trilhasNovidades = exports.deletarTrilha = exports.atualizarTrilha = exports.listarTrilhas = exports.criarTrilha = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const trilha_1 = __importDefault(require("../models/trilha"));
const criarTrilha = async (req, res) => {
    try {
        const userId = req.user._id;
        const dataCriacao = new Date().toISOString().split("T")[0];
        const imagem = req.body.imagem || "/img/fases/vila.jpg";
        const trilha = new trilha_1.default({ ...req.body, usuario: userId, dataCriacao, imagem, usuariosIniciaram: [], visualizacoes: 0 });
        await trilha.save();
        const trilhaResponse = trilha.toObject();
        delete trilhaResponse.usuariosIniciaram;
        return res.status(201).json(trilhaResponse);
    }
    catch (error) {
        const err = error;
        console.error("Erro ao criar trilha:", err);
        return res.status(500).json({ message: "Erro ao criar trilha", error: err.message });
    }
};
exports.criarTrilha = criarTrilha;
const listarTrilhas = async (req, res) => {
    try {
        const userId = req.user._id;
        const tipoUsuario = req.user.tipoUsuario;
        const query = tipoUsuario === "ADMINISTRADOR" ? {} : { usuario: userId };
        let trilhasQuery = trilha_1.default.find(query).select("-usuariosIniciaram");
        if (tipoUsuario === "ADMINISTRADOR")
            trilhasQuery = trilhasQuery.populate({ path: "usuario", select: "nome username email tipoUsuario" });
        const trilhas = await trilhasQuery.sort({ createdAt: -1 });
        return res.json(trilhas);
    }
    catch (error) {
        const err = error;
        console.error("Erro ao listar trilhas:", err);
        return res.status(500).json({ message: "Erro ao listar trilhas", error: err.message });
    }
};
exports.listarTrilhas = listarTrilhas;
const atualizarTrilha = async (req, res) => {
    try {
        const userId = req.user._id;
        const tipoUsuario = req.user.tipoUsuario;
        const { id } = req.params;
        if (typeof id !== 'string' || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID da trilha inválido" });
        }
        const dadosAtualizacao = { ...req.body };
        if (!dadosAtualizacao.imagem) {
            const trilhaAtual = await trilha_1.default.findById(id);
            dadosAtualizacao.imagem = trilhaAtual?.imagem || "/img/fases/vila.jpg";
        }
        const query = tipoUsuario === "ADMINISTRADOR" ? { _id: id } : { _id: id, usuario: userId };
        const trilha = await trilha_1.default.findOneAndUpdate(query, dadosAtualizacao, { new: true });
        if (!trilha)
            return res.status(404).json({ message: "Trilha não encontrada ou você não tem permissão para editar." });
        const trilhaResponse = trilha.toObject();
        delete trilhaResponse.usuariosIniciaram;
        return res.json(trilhaResponse);
    }
    catch (error) {
        const err = error;
        console.error("Erro ao atualizar trilha:", err);
        return res.status(500).json({ message: "Erro ao atualizar trilha", error: err.message });
    }
};
exports.atualizarTrilha = atualizarTrilha;
const deletarTrilha = async (req, res) => {
    try {
        const userId = req.user._id;
        const tipoUsuario = req.user.tipoUsuario;
        const { id } = req.params;
        if (typeof id !== 'string' || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID da trilha inválido" });
        }
        const query = tipoUsuario === "ADMINISTRADOR" ? { _id: id } : { _id: id, usuario: userId };
        const trilha = await trilha_1.default.findOneAndDelete(query);
        if (!trilha)
            return res.status(404).json({ message: "Trilha não encontrada ou você não tem permissão para deletar." });
        return res.json({ message: "Trilha excluída com sucesso" });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao deletar trilha:", err);
        return res.status(500).json({ message: "Erro ao deletar trilha", error: err.message });
    }
};
exports.deletarTrilha = deletarTrilha;
const trilhasNovidades = async (req, res) => {
    try {
        const userId = req.user._id;
        const trilhas = await trilha_1.default.find({ usuariosIniciaram: { $ne: userId } }).select("-usuariosIniciaram").sort({ createdAt: -1 }).limit(10);
        return res.json(trilhas);
    }
    catch (error) {
        const err = error;
        console.error("Erro ao buscar novidades:", err);
        return res.status(500).json({ message: "Erro ao buscar novidades", error: err.message });
    }
};
exports.trilhasNovidades = trilhasNovidades;
const trilhasPopulares = async (req, res) => {
    try {
        const trilhas = await trilha_1.default.find().select("-usuariosIniciaram").sort({ visualizacoes: -1 }).limit(10);
        return res.json(trilhas);
    }
    catch (error) {
        const err = error;
        console.error("Erro ao buscar trilhas populares:", err);
        return res.status(500).json({ message: "Erro ao buscar populares", error: err.message });
    }
};
exports.trilhasPopulares = trilhasPopulares;
const trilhasContinue = async (req, res) => {
    try {
        const userId = req.user._id;
        const trilhas = await trilha_1.default.find({ usuariosIniciaram: userId }).select("-usuariosIniciaram").sort({ updatedAt: -1 }).limit(10);
        return res.json(trilhas);
    }
    catch (error) {
        const err = error;
        console.error("Erro ao buscar trilhas em andamento:", err);
        return res.status(500).json({ message: "Erro ao buscar trilhas iniciadas", error: err.message });
    }
};
exports.trilhasContinue = trilhasContinue;
const iniciarTrilha = async (req, res) => {
    try {
        const userId = req.user._id;
        const { trilhaId } = req.params;
        if (typeof trilhaId !== 'string' || !mongoose_1.default.Types.ObjectId.isValid(trilhaId)) {
            return res.status(400).json({ message: "ID da trilha inválido" });
        }
        const trilha = await trilha_1.default.findById(trilhaId);
        if (!trilha)
            return res.status(404).json({ message: "Trilha não encontrada" });
        if (!trilha.usuariosIniciaram.includes(userId)) {
            trilha.usuariosIniciaram.push(userId);
            await trilha.save();
        }
        const trilhaResponse = trilha.toObject();
        delete trilhaResponse.usuariosIniciaram;
        return res.json({ message: "Trilha iniciada com sucesso", trilha: trilhaResponse });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao iniciar trilha:", err);
        return res.status(500).json({ message: "Erro ao iniciar trilha", error: err.message });
    }
};
exports.iniciarTrilha = iniciarTrilha;
const buscarTrilhas = async (req, res) => {
    try {
        const { q, materia } = req.query;
        const tipoUsuario = req.user?.tipoUsuario;
        const conditions = {};
        if (req.user === undefined)
            conditions.disponibilidade = "Aberto";
        if (q)
            conditions.$or = [{ titulo: { $regex: q, $options: "i" } }, { descricao: { $regex: q, $options: "i" } }, { materia: { $regex: q, $options: "i" } }];
        if (materia && materia.trim() !== "" && materia !== "Todas")
            conditions.materia = { $regex: materia.trim(), $options: "i" };
        let trilhasQuery = trilha_1.default.find(conditions).select("-usuariosIniciaram");
        const populateSelect = tipoUsuario === "ADMINISTRADOR" ? "nome username email tipoUsuario" : "nome username";
        trilhasQuery = trilhasQuery.populate({ path: "usuario", select: populateSelect });
        const trilhas = await trilhasQuery.sort({ visualizacoes: -1, createdAt: -1 });
        return res.json(trilhas);
    }
    catch (error) {
        const err = error;
        console.error("Erro ao buscar trilhas:", err);
        return res.status(500).json({ message: "Erro ao buscar trilhas", error: err.message });
    }
};
exports.buscarTrilhas = buscarTrilhas;
const buscarTrilhaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        if (typeof id !== 'string' || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID da trilha inválido" });
        }
        const tipoUsuario = req.user?.tipoUsuario;
        const populateSelect = tipoUsuario === "ADMINISTRADOR" ? "nome username email tipoUsuario" : "nome username";
        const trilha = await trilha_1.default.findById(id).select("-usuariosIniciaram").populate({ path: "usuario", select: populateSelect });
        if (!trilha)
            return res.status(404).json({ message: "Trilha não encontrada" });
        return res.json(trilha);
    }
    catch (error) {
        const err = error;
        console.error("Erro ao buscar trilha:", err);
        return res.status(500).json({ message: "Erro ao buscar trilha", error: err.message });
    }
};
exports.buscarTrilhaPorId = buscarTrilhaPorId;
const visualizarTrilha = async (req, res) => {
    try {
        const { id } = req.params;
        if (typeof id !== 'string' || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID da trilha inválido" });
        }
        const trilha = await trilha_1.default.findByIdAndUpdate(id, { $inc: { visualizacoes: 1 } }, { new: true });
        if (!trilha)
            return res.status(404).json({ message: "Trilha não encontrada" });
        return res.json({ message: "Visualização registrada", visualizacoes: trilha.visualizacoes });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao registrar visualização:", err);
        return res.status(500).json({ message: "Erro ao registrar visualização", error: err.message });
    }
};
exports.visualizarTrilha = visualizarTrilha;
