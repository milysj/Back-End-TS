"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/secao.ts
const mongoose_1 = __importDefault(require("mongoose"));
const secaoSchema = new mongoose_1.default.Schema({
    trilhaId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Trilha",
        required: true,
    },
    titulo: {
        type: String,
        required: true,
    },
    descricao: {
        type: String,
        default: "",
    },
    ordem: {
        type: Number,
        required: true,
    },
}, { timestamps: true });
// Índice para melhorar performance nas buscas por trilhaId
secaoSchema.index({ trilhaId: 1, ordem: 1 });
exports.default = mongoose_1.default.model("Secao", secaoSchema);
