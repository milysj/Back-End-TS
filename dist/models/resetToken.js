"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const resetTokenSchema = new mongoose_1.default.Schema({
    email: {
        type: String,
        required: true,
        index: true,
    },
    token: {
        type: String,
        required: true,
        unique: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 3600000), // Expira em 1 hora
        index: { expireAfterSeconds: 0 },
    },
    used: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });
exports.default = mongoose_1.default.model("ResetToken", resetTokenSchema);
//# sourceMappingURL=resetToken.js.map