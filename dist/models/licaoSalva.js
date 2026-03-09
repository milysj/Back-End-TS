"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const licaoSalvaSchema = new mongoose_1.default.Schema({
    usuario: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    trilha: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Trilha",
        required: true,
    },
}, { timestamps: true });
// Índice único para evitar duplicatas (um usuário só pode salvar uma trilha uma vez)
licaoSalvaSchema.index({ usuario: 1, trilha: 1 }, { unique: true });
exports.default = mongoose_1.default.model("LicaoSalva", licaoSalvaSchema);
