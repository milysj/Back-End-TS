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
exports.confirmarEmail = exports.obterTermos = exports.verificarAutenticacao = exports.listarUsuarios = exports.excluirConta = exports.atualizarIdioma = exports.atualizarPersonagem = exports.atualizarTema = exports.verificarTokenReset = exports.redefinirSenha = exports.solicitarRecuperacaoSenha = exports.mudarSenha = exports.atualizarDadosPessoais = exports.buscarMeusDados = exports.criarPerfil = exports.registerUser = exports.loginUser = void 0;
const user_1 = __importDefault(require("../models/user"));
const resetToken_1 = __importDefault(require("../models/resetToken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const emailVerificationService_1 = require("../services/emailVerificationService");
// =================================
// LOGIN E REGISTRO
// =================================
const loginUser = async (req, res) => {
    let { email, senha } = req.body;
    if (!email || !senha)
        return res.status(400).json({ message: "Email e senha são obrigatórios." });
    email = email.toLowerCase();
    try {
        const usuario = await user_1.default.findOne({ email }).select('+senha');
        if (!usuario)
            return res.status(401).json({ message: "Credenciais inválidas." });
        const senhaValida = await bcryptjs_1.default.compare(senha, usuario.senha);
        if (!senhaValida)
            return res.status(401).json({ message: "Credenciais inválidas." });
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("Erro fatal: JWT_SECRET não está definido.");
            throw new Error("A configuração do servidor está incompleta.");
        }
        if (usuario && !usuario.isVerified) {
            return res.status(403).json({
                message: "Sua conta ainda não foi ativada. Verifique seu e-mail!"
            });
        }
        const payload = { id: usuario._id, email: usuario.email, tipoUsuario: usuario.tipoUsuario };
        const token = jwt.sign(payload, secret, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
        });
        return res.json({
            success: true,
            token,
            perfilCriado: !!usuario.personagem,
            usuario: { id: usuario._id, nome: usuario.nome }
        });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao fazer login:", err);
        return res.status(500).json({ message: "Erro ao fazer login", error: err.message });
    }
};
exports.loginUser = loginUser;
const registerUser = async (req, res) => {
    try {
        let { nome, email, senha, dataNascimento, tipoUsuario, aceiteTermos } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email é obrigatório." });
        }
        email = email.toLowerCase();
        if (tipoUsuario === "ADMINISTRADOR") {
            return res.status(403).json({ message: "Criação de administradores não é permitida via API." });
        }
        if (aceiteTermos !== true) {
            return res.status(400).json({ message: "É necessário aceitar os termos de uso." });
        }
        if (!dataNascimento) {
            return res.status(400).json({ message: "Data de nascimento é obrigatória." });
        }
        const idade = new Date().getFullYear() - new Date(dataNascimento).getFullYear();
        if (idade < 14) {
            return res.status(400).json({ message: "É necessário ter no mínimo 14 anos." });
        }
        if (!senha || senha.length < 8) {
            return res.status(400).json({ message: "A senha deve ter no mínimo 8 caracteres." });
        }
        const userExistente = await user_1.default.findOne({ email });
        if (userExistente)
            return res.status(409).json({ message: "Email já cadastrado." });
        const hashedSenha = await bcryptjs_1.default.hash(senha, 10);
        const verificationToken = crypto_1.default.randomBytes(32).toString("hex");
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
        const usuario = new user_1.default({
            ...req.body,
            email, // Sobrescreve com email em lowercase
            senha: hashedSenha,
            aceiteTermos: true,
            dataAceiteTermos: new Date(),
            isVerified: false,
            verificationToken,
            tokenExpires,
        });
        await usuario.save();
        try {
            await (0, emailVerificationService_1.sendVerificationEmail)(usuario.email, usuario.nome, verificationToken);
        }
        catch (error) {
            console.error("Erro ao enviar e-mail de verificação:", error);
        }
        return res.status(201).json({ message: "Usuário cadastrado com sucesso! Verifique seu e-mail para ativar a conta." });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao cadastrar usuário:", err);
        return res.status(500).json({ message: "Erro ao cadastrar usuário", error: err.message });
    }
};
exports.registerUser = registerUser;
// =================================
// PERFIL
// =================================
const criarPerfil = async (req, res) => {
    try {
        const userId = req.user._id;
        const { username, personagem, fotoPerfil: fotoBody } = req.body;
        let fotoFinal = fotoBody;
        if (req.file) {
            fotoFinal = `/uploads/${req.file.filename}`;
        }
        if (!username || !personagem || !fotoFinal) {
            return res.status(400).json({ message: "Username, personagem e foto são obrigatórios!" });
        }
        const usernameTrimmed = username.trim();
        const usuarioComUsername = await user_1.default.findOne({ username: usernameTrimmed, _id: { $ne: userId } });
        if (usuarioComUsername) {
            return res.status(409).json({ message: "Username já está em uso." });
        }
        const personagensValidos = ["Guerreiro", "Mago", "Samurai"];
        if (!personagensValidos.includes(personagem)) {
            return res.status(400).json({ message: "Personagem inválido." });
        }
        const usuario = await user_1.default.findByIdAndUpdate(userId, {
            username: usernameTrimmed,
            personagem,
            fotoPerfil: fotoFinal,
        }, { new: true }).select("-senha");
        if (!usuario)
            return res.status(404).json({ message: "Usuário não encontrado." });
        return res.json({ message: "Perfil criado com sucesso!", usuario });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao criar perfil:", err);
        if (err.code === 11000)
            return res.status(409).json({ message: "Username já está em uso." });
        return res.status(500).json({ message: "Erro ao criar perfil.", error: err.message });
    }
};
exports.criarPerfil = criarPerfil;
const buscarMeusDados = async (req, res) => {
    try {
        const usuario = await user_1.default.findById(req.user._id).select("-senha");
        if (!usuario)
            return res.status(404).json({ message: "Usuário não encontrado" });
        return res.json(usuario);
    }
    catch (error) {
        const err = error;
        console.error("Erro ao buscar dados:", err);
        return res.status(500).json({ message: "Erro ao buscar dados do usuário" });
    }
};
exports.buscarMeusDados = buscarMeusDados;
const atualizarDadosPessoais = async (req, res) => {
    try {
        const { nome, telefone, endereco, dataNascimento } = req.body;
        const camposParaAtualizar = {};
        if (nome !== undefined)
            camposParaAtualizar.nome = nome;
        if (telefone !== undefined)
            camposParaAtualizar.telefone = telefone;
        if (endereco !== undefined)
            camposParaAtualizar.endereco = endereco;
        if (dataNascimento !== undefined)
            camposParaAtualizar.dataNascimento = dataNascimento;
        const usuarioAtualizado = await user_1.default.findByIdAndUpdate(req.user._id, camposParaAtualizar, { new: true }).select("-senha");
        if (!usuarioAtualizado)
            return res.status(404).json({ message: "Usuário não encontrado" });
        return res.json({ message: "Dados atualizados com sucesso!", usuario: usuarioAtualizado });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao atualizar dados:", err);
        return res.status(500).json({ message: "Erro ao atualizar dados pessoais" });
    }
};
exports.atualizarDadosPessoais = atualizarDadosPessoais;
// =================================
// SENHA E RECUPERAÇÃO
// =================================
const mudarSenha = async (req, res) => {
    try {
        const { senhaAtual, novaSenha } = req.body;
        if (!senhaAtual || !novaSenha)
            return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias." });
        if (novaSenha.length < 8)
            return res.status(400).json({ message: "A nova senha deve ter no mínimo 8 caracteres." });
        const usuario = await user_1.default.findById(req.user._id).select('+senha');
        if (!usuario)
            return res.status(404).json({ message: "Usuário não encontrado." });
        const senhaValida = await bcryptjs_1.default.compare(senhaAtual, usuario.senha);
        if (!senhaValida)
            return res.status(401).json({ message: "Senha atual incorreta." });
        usuario.senha = await bcryptjs_1.default.hash(novaSenha, 10);
        await usuario.save();
        return res.json({ message: "Senha alterada com sucesso!" });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao mudar senha:", err);
        return res.status(500).json({ message: "Erro ao mudar senha", error: err.message });
    }
};
exports.mudarSenha = mudarSenha;
const solicitarRecuperacaoSenha = async (req, res) => {
    try {
        let { email } = req.body;
        if (!email)
            return res.status(400).json({ message: "Email é obrigatório." });
        email = email.toLowerCase();
        const usuario = await user_1.default.findOne({ email });
        if (usuario) {
            await resetToken_1.default.deleteMany({ email, used: false });
            const token = crypto_1.default.randomBytes(32).toString("hex");
            await resetToken_1.default.create({ email, token });
            const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/recuperar-senha?token=${token}`;
            console.log(`
🔗 Link de recuperação para ${email}: ${resetLink}
`);
            // Em um ambiente real, aqui seria enviado um email.
        }
        return res.status(200).json({ message: "Se o email estiver cadastrado, um link de recuperação será enviado." });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao solicitar recuperação:", err);
        return res.status(500).json({ message: "Erro ao processar solicitação" });
    }
};
exports.solicitarRecuperacaoSenha = solicitarRecuperacaoSenha;
const redefinirSenha = async (req, res) => {
    try {
        const { token, novaSenha } = req.body;
        if (!token || !novaSenha)
            return res.status(400).json({ message: "Token e nova senha são obrigatórios." });
        if (novaSenha.length < 8)
            return res.status(400).json({ message: "A nova senha deve ter no mínimo 8 caracteres." });
        const resetToken = await resetToken_1.default.findOne({ token, used: false, expiresAt: { $gt: new Date() } });
        if (!resetToken)
            return res.status(400).json({ message: "Token inválido ou expirado." });
        const usuario = await user_1.default.findOne({ email: resetToken.email });
        if (!usuario)
            return res.status(404).json({ message: "Usuário associado ao token não encontrado." });
        usuario.senha = await bcryptjs_1.default.hash(novaSenha, 10);
        await usuario.save();
        resetToken.used = true;
        await resetToken.save();
        return res.json({ message: "Senha alterada com sucesso!" });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao redefinir senha:", err);
        return res.status(500).json({ message: "Erro ao alterar senha" });
    }
};
exports.redefinirSenha = redefinirSenha;
const verificarTokenReset = async (req, res) => {
    try {
        const { token } = req.params;
        const resetToken = await resetToken_1.default.findOne({ token, used: false, expiresAt: { $gt: new Date() } });
        return res.json({ valid: !!resetToken });
    }
    catch (error) {
        const err = error;
        console.error("Erro ao verificar token:", err);
        return res.status(500).json({ message: "Erro ao verificar token" });
    }
};
exports.verificarTokenReset = verificarTokenReset;
// =================================
// PREFERÊNCIAS E OUTROS
// =================================
const atualizarTema = async (req, res) => {
    const { tema } = req.body;
    if (!tema || !["light", "dark"].includes(tema))
        return res.status(400).json({ message: "Tema inválido." });
    await user_1.default.updateOne({ _id: req.user._id }, { tema });
    return res.json({ message: "Tema atualizado." });
};
exports.atualizarTema = atualizarTema;
const atualizarPersonagem = async (req, res) => {
    const { personagem, fotoPerfil } = req.body;
    if (!personagem || !["Guerreiro", "Mago", "Samurai"].includes(personagem))
        return res.status(400).json({ message: "Personagem inválido." });
    const updateData = { personagem };
    if (fotoPerfil)
        updateData.fotoPerfil = fotoPerfil;
    const usuario = await user_1.default.findByIdAndUpdate(req.user._id, updateData, { new: true }).select('-senha');
    return res.json({ message: "Personagem atualizado.", usuario });
};
exports.atualizarPersonagem = atualizarPersonagem;
const atualizarIdioma = async (req, res) => {
    const { idioma } = req.body;
    if (!idioma || !["pt-BR", "en-US", "es-ES"].includes(idioma))
        return res.status(400).json({ message: "Idioma inválido." });
    await user_1.default.updateOne({ _id: req.user._id }, { idioma });
    return res.json({ message: "Idioma atualizado." });
};
exports.atualizarIdioma = atualizarIdioma;
const excluirConta = async (req, res) => {
    const { senha } = req.body;
    if (!senha)
        return res.status(400).json({ message: "Senha é obrigatória." });
    const usuario = await user_1.default.findById(req.user._id).select('+senha');
    if (!usuario)
        return res.status(404).json({ message: "Usuário não encontrado." });
    const senhaValida = await bcryptjs_1.default.compare(senha, usuario.senha);
    if (!senhaValida)
        return res.status(401).json({ message: "Senha incorreta." });
    await user_1.default.findByIdAndDelete(req.user._id);
    // TODO: Deletar dados relacionados em outros models/serviços
    return res.json({ message: "Conta excluída com sucesso." });
};
exports.excluirConta = excluirConta;
// =================================
// PÚBLICO / GERAL
// =================================
const listarUsuarios = async (req, res) => {
    const usuarios = await user_1.default.find().select("username nome fotoPerfil personagem tipoUsuario").sort({ createdAt: -1 });
    return res.json(usuarios);
};
exports.listarUsuarios = listarUsuarios;
const verificarAutenticacao = (req, res) => {
    return res.json({ authenticated: true, userId: req.user._id });
};
exports.verificarAutenticacao = verificarAutenticacao;
const obterTermos = (req, res) => {
    return res.json({
        termosUso: { titulo: "Termos de Uso", versao: "1.0", conteudo: "..." },
        politicaPrivacidade: { titulo: "Política de Privacidade", versao: "1.0", conteudo: "..." },
    });
};
exports.obterTermos = obterTermos;
// Confirmar email - nova função para lidar com a confirmação via token
const confirmarEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            res.status(400).json({ message: "Token de verificação ausente." });
            return;
        }
        // 1. Buscar usuário pelo token e verificar se o token não expirou
        const usuario = await user_1.default.findOne({
            verificationToken: token,
            tokenExpires: { $gt: new Date() } // Verifica se a data de expiração é maior que 'agora'
        });
        if (!usuario) {
            // Se não achar, redireciona para uma página de erro no React ou envia erro
            res.status(400).json({ message: "Link inválido ou expirado." });
            return;
        }
        // 2. Atualizar o status do usuário
        usuario.isVerified = true;
        usuario.verificationToken = undefined; // Remove o token para não ser reutilizado
        usuario.tokenExpires = undefined;
        await usuario.save();
        // 3. Redirecionar para o Front-end
        // O navegador sairá da rota da API e abrirá seu site React na página de login
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        res.redirect(`${frontendUrl}/login?email_verificado=true`);
    }
    catch (error) {
        console.error("Erro ao confirmar e-mail:", error);
        res.status(500).json({ message: "Erro interno ao processar verificação." });
    }
};
exports.confirmarEmail = confirmarEmail;
