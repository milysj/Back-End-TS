"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const feedbackSchema = new mongoose_1.default.Schema({
    usuario: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: false, // Permite feedback anônimo
    },
    tipo: {
        type: String,
        enum: ["bug", "suggestion", "doubt", "praise", "other"],
        required: true,
    },
    avaliacao: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
    },
    sugestao: {
        type: String,
        default: "",
    },
    data: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });
exports.default = mongoose_1.default.models.Feedback || mongoose_1.default.model("Feedback", feedbackSchema);
