"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const perguntaSchema = new mongoose_1.default.Schema({
    enunciado: { type: String, required: true },
    alternativas: [{ type: String, required: true }],
    respostaCorreta: { type: String, required: true },
});
const faseSchema = new mongoose_1.default.Schema({
    trilhaId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Trilha",
        required: true,
    },
    secaoId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Secao",
        default: null,
    },
    titulo: { type: String, required: true },
    descricao: { type: String },
    conteudo: { type: String, default: "" },
    ordem: { type: Number, required: true },
    perguntas: [perguntaSchema],
}, { timestamps: true });
exports.default = mongoose_1.default.model("Fase", faseSchema);
