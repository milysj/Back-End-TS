"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const progressoSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    faseId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Fase",
        required: true,
    },
    trilhaId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Trilha",
        required: true,
    },
    pontuacao: {
        type: Number,
        required: true,
        min: 0,
    },
    totalPerguntas: {
        type: Number,
        required: true,
    },
    porcentagemAcertos: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
    xpGanho: {
        type: Number,
        required: true,
        default: 0,
    },
    concluido: {
        type: Boolean,
        default: false,
    },
    respostasUsuario: {
        type: [Number],
        default: [],
    },
    // Rastrear quais perguntas foram respondidas (índices)
    perguntasRespondidas: {
        type: [Number],
        default: [],
    },
}, { timestamps: true });
// Índice único para evitar duplicatas (um usuário só pode completar uma fase uma vez)
progressoSchema.index({ userId: 1, faseId: 1 }, { unique: true });
exports.default = mongoose_1.default.model("Progresso", progressoSchema);
