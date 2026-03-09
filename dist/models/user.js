"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const UserSchema = new mongoose_1.default.Schema({
    nome: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/^\S+@\S+\.\S+$/, "Email inválido"],
    },
    senha: { type: String, required: true },
    dataNascimento: { type: Date, required: true },
    tipoUsuario: {
        type: String,
        enum: ["ALUNO", "PROFESSOR", "ADMINISTRADOR"],
        required: true,
    },
    username: {
        type: String,
        default: "",
    },
    personagem: {
        type: String,
        enum: ["", "Guerreiro", "Mago", "Samurai"],
        required: false,
        default: ""
    },
    fotoPerfil: { type: String, default: "" },
    materiaFavorita: { type: String, default: "" },
    xpTotal: { type: Number, default: 0 },
    trilhasIniciadas: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Trilha" }],
    trilhasConcluidas: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Trilha" }],
    telefone: { type: String, default: "" },
    endereco: { type: String, default: "" },
    aceiteTermos: {
        type: Boolean,
        default: false,
        required: true,
    },
    dataAceiteTermos: {
        type: Date,
        default: null,
    },
    tema: {
        type: String,
        enum: ["light", "dark"],
        default: "light",
    },
    idioma: {
        type: String,
        enum: ["pt-BR", "en-US", "es-ES"],
        default: "pt-BR",
    },
    isVerified: {
        type: Boolean, default: false
    },
    verificationToken: {
        type: String
    },
    tokenExpires: {
        type: Date
    }
}, { timestamps: true });
UserSchema.index({ username: 1 }, {
    unique: true,
    sparse: true,
    partialFilterExpression: { username: { $ne: "", $exists: true } }
});
// Exporta o modelo, garantindo que ele não seja recriado se já existir.
exports.default = mongoose_1.default.models.User || mongoose_1.default.model('User', UserSchema);
