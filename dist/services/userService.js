"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarUsuarios = listarUsuarios;
exports.criarUsuario = criarUsuario;
exports.loginUsuario = loginUsuario;
const user_1 = __importDefault(require("../models/user"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function listarUsuarios() {
    return await user_1.default.find().select("-senha");
}
async function criarUsuario(dados) {
    if (!dados.senha) {
        throw new Error('Senha é obrigatória para criar usuário.');
    }
    const senhaCriptografada = await bcryptjs_1.default.hash(dados.senha, 10);
    const user = new user_1.default({ ...dados, senha: senhaCriptografada });
    return await user.save();
}
async function loginUsuario(email, senha) {
    const user = await user_1.default.findOne({ email });
    if (!user) {
        return null;
    }
    const senhaCorreta = await bcryptjs_1.default.compare(senha, user.senha);
    if (!senhaCorreta) {
        return null;
    }
    return user;
}
//# sourceMappingURL=userService.js.map