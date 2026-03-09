"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const trilhaSchema = new mongoose_1.default.Schema({
    usuario: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    titulo: { type: String, required: true },
    descricao: { type: String, required: true },
    dataCriacao: { type: String, required: true },
    dataTermino: { type: String },
    materia: { type: String, required: true },
    dificuldade: { type: String, enum: ["Facil", "Medio", "Dificil"], default: "Facil" },
    disponibilidade: { type: String, enum: ["Privado", "Aberto"], default: "Privado" },
    pagamento: { type: String, enum: ["Paga", "Gratuita"], default: "Gratuita" },
    faseSelecionada: { type: Number, required: true },
    imagem: { type: String, default: "/img/fases/vila.jpg" }, // Caminho da imagem
    usuariosIniciaram: [{
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: "User"
        }],
    visualizacoes: { type: Number, default: 0 },
}, { timestamps: true });
const Trilha = mongoose_1.default.model("Trilha", trilhaSchema);
exports.default = Trilha;
