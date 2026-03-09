"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificarTokenOpcional = exports.verificarAdministrador = exports.verificarProfessor = exports.verificarToken = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const user_1 = __importDefault(require("../models/user"));
/**
 * Middleware para verificar o token JWT e adicionar o usuário à requisição.
 */
const verificarToken = async (req, res, next) => {
    try {
        let token = '';
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
        else if (req.cookies?.token) {
            token = req.cookies.token;
        }
        if (!token) {
            return res.status(401).json({ success: false, message: "Acesso negado. Token não fornecido." });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await user_1.default.findById(decoded.id).select("-senha");
        if (!user) {
            return res.status(401).json({ success: false, message: "Usuário do token não encontrado." });
        }
        req.user = user;
        next();
    }
    catch (error) {
        const err = error;
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Token expirado. Faça login novamente." });
        }
        return res.status(401).json({ success: false, message: "Token inválido." });
    }
};
exports.verificarToken = verificarToken;
/**
 * Middleware para verificar se o usuário é PROFESSOR ou ADMINISTRADOR.
 */
const verificarProfessor = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Usuário não autenticado." });
    }
    if (req.user.tipoUsuario !== "PROFESSOR" && req.user.tipoUsuario !== "ADMINISTRADOR") {
        return res.status(403).json({ success: false, message: "Acesso negado. Apenas professores e administradores podem realizar esta ação." });
    }
    next();
};
exports.verificarProfessor = verificarProfessor;
/**
 * Middleware para verificar se o usuário é ADMINISTRADOR.
 */
const verificarAdministrador = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Usuário não autenticado." });
    }
    if (req.user.tipoUsuario !== "ADMINISTRADOR") {
        return res.status(403).json({ success: false, message: "Acesso negado. Apenas administradores podem realizar esta ação." });
    }
    next();
};
exports.verificarAdministrador = verificarAdministrador;
/**
 * Middleware opcional para verificar token.
 */
const verificarTokenOpcional = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await user_1.default.findById(decoded.id).select("-senha");
            if (user) {
                req.user = user;
            }
        }
    }
    catch (error) {
        // Ignora erros
    }
    next();
};
exports.verificarTokenOpcional = verificarTokenOpcional;
