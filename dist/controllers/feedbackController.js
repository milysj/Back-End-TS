"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarFeedbacks = exports.criarFeedback = void 0;
const feedback_1 = __importDefault(require("../models/feedback"));
const criarFeedback = async (req, res) => {
    try {
        const { tipo, avaliacao, sugestao } = req.body;
        const userId = req.user?._id || null;
        if (!tipo || !avaliacao)
            return res.status(400).json({ message: "Tipo e avaliação são obrigatórios" });
        const tiposValidos = ["bug", "suggestion", "doubt", "praise", "other"];
        if (!tiposValidos.includes(tipo))
            return res.status(400).json({ message: "Tipo de feedback inválido" });
        if (avaliacao < 1 || avaliacao > 5)
            return res.status(400).json({ message: "Avaliação deve ser entre 1 e 5" });
        const feedback = await feedback_1.default.create({ usuario: userId, tipo, avaliacao, sugestao: sugestao || "", data: new Date() });
        return res.status(201).json({ message: "Feedback enviado com sucesso!", feedback: { _id: feedback._id, tipo: feedback.tipo, avaliacao: feedback.avaliacao, sugestao: feedback.sugestao, data: feedback.data } });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao criar feedback:", err);
        return res.status(500).json({ message: "Erro ao enviar feedback", error: err.message });
    }
};
exports.criarFeedback = criarFeedback;
const listarFeedbacks = async (req, res) => {
    try {
        if (req.user?.tipoUsuario !== "ADMINISTRADOR")
            return res.status(403).json({ message: "Acesso negado. Apenas administradores podem ver feedbacks." });
        const feedbacks = await feedback_1.default.find().populate("usuario", "nome email username").sort({ createdAt: -1 });
        return res.status(200).json({ feedbacks });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao listar feedbacks:", err);
        return res.status(500).json({ message: "Erro ao listar feedbacks", error: err.message });
    }
};
exports.listarFeedbacks = listarFeedbacks;
//# sourceMappingURL=feedbackController.js.map