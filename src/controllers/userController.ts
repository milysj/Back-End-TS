import { Request, Response } from "express";
import User, { IUser } from "../models/user";
import ResetToken from "../models/resetToken";
import bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/emailVerificationService";
import { getFrontendBaseUrl } from "../config/publicUrls";
import { signTwoFactorPendingToken } from "../utils/twoFactorPendingToken";
import { appLogger, logHandledError } from "../logging/appLogger";

// Interface local para requisições autenticadas
interface AuthRequest extends Request {
    user?: IUser;
    file?: Express.Multer.File;
}

// =================================
// LOGIN E REGISTRO
// =================================

export const loginUser = async (req: Request, res: Response): Promise<Response> => {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ message: "Email e senha são obrigatórios." });
    const emailLower = email.toLowerCase();

    try {
        const usuario = await User.findOne({ email: emailLower }).select('+senha');
        if (!usuario) return res.status(401).json({ message: "Credenciais inválidas." });

        const senhaValida = await bcrypt.compare(senha, usuario.senha!);
        if (!senhaValida) return res.status(401).json({ message: "Credenciais inválidas." });

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

        if (usuario.twoFactorEnabled) {
            try {
                const tempToken = signTwoFactorPendingToken(String(usuario._id));
                return res.json({
                    success: true,
                    require2FA: true,
                    tempToken,
                });
            } catch (e) {
                logHandledError("userController.loginUser.2fa_temp_token", e);
                return res.status(500).json({ message: "Erro interno no servidor." });
            }
        }

        const payload = { id: usuario._id, email: usuario.email, tipoUsuario: usuario.tipoUsuario };
        const token = jwt.sign(payload, secret, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
        });

        void appLogger.info("auth.login.success", { userId: String(usuario._id) });
        return res.json({ 
            success: true,
            token,
            perfilCriado: !!usuario.personagem, 
            usuario: { id: usuario._id, nome: usuario.nome } 
        });
    } catch (error) {
        const err = error as Error;
        logHandledError("userController.loginUser", err);
        return res.status(500).json({ message: "Erro ao fazer login", error: err.message });
    }
};

export const registerUser = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { email, senha, dataNascimento, tipoUsuario, aceiteTermos } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email é obrigatório." });
        }
        const emailLower = email.toLowerCase();

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

        const userExistente = await User.findOne({ email: emailLower });
        if (userExistente) return res.status(409).json({ message: "Email já cadastrado." });

        const hashedSenha = await bcrypt.hash(senha, 10);

        const verificationToken = crypto.randomBytes(32).toString("hex");
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        const usuario = new User({
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
            await sendVerificationEmail(usuario.email, usuario.nome, verificationToken);
        } catch (error) {
            logHandledError("userController.registerUser.sendVerificationEmail", error);
        }

        void appLogger.info("auth.register.success", { email });
        return res.status(201).json({ message: "Usuário cadastrado com sucesso! Verifique seu e-mail para ativar a conta." });
    } catch (error) {
        const err = error as Error;
        logHandledError("userController.registerUser", err);
        return res.status(500).json({ message: "Erro ao cadastrar usuário", error: err.message });
    }
};

// =================================
// PERFIL
// =================================

export const criarPerfil = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const userId = req.user!._id;
        const { username, personagem, fotoPerfil: fotoBody } = req.body;
        
        let fotoFinal = fotoBody;
        if (req.file) {
            fotoFinal = `/uploads/${req.file.filename}`;
        }

        if (!username || !personagem || !fotoFinal) {
            return res.status(400).json({ message: "Username, personagem e foto são obrigatórios!" });
        }

        const usernameTrimmed = username.trim();
        const usuarioComUsername = await User.findOne({ username: usernameTrimmed, _id: { $ne: userId } });
        if (usuarioComUsername) {
            return res.status(409).json({ message: "Username já está em uso." });
        }
        
        const personagensValidos = ["Guerreiro", "Mago", "Samurai"];
        if (!personagensValidos.includes(personagem)) {
            return res.status(400).json({ message: "Personagem inválido." });
        }

        const usuario = await User.findByIdAndUpdate(userId, {
            username: usernameTrimmed,
            personagem,
            fotoPerfil: fotoFinal,
        }, { new: true }).select("-senha");

        if (!usuario) return res.status(404).json({ message: "Usuário não encontrado." });

        return res.json({ message: "Perfil criado com sucesso!", usuario });
    } catch (error) {
        const err = error as Error & { code?: number };
        logHandledError("userController.criarPerfil", err, { code: err.code });
        if (err.code === 11000) return res.status(409).json({ message: "Username já está em uso." });
        return res.status(500).json({ message: "Erro ao criar perfil.", error: err.message });
    }
};

export const buscarMeusDados = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const usuario = await User.findById(req.user!._id).select("-senha");
        if (!usuario) return res.status(404).json({ message: "Usuário não encontrado" });
        return res.json(usuario);
    } catch (error) {
        const err = error as Error;
        logHandledError("userController.buscarMeusDados", err);
        return res.status(500).json({ message: "Erro ao buscar dados do usuário" });
    }
};

export const atualizarDadosPessoais = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { nome, telefone, endereco, dataNascimento } = req.body;
        
        const camposParaAtualizar: Partial<IUser> = {};
        if (nome !== undefined) camposParaAtualizar.nome = nome;
        if (telefone !== undefined) camposParaAtualizar.telefone = telefone;
        if (endereco !== undefined) camposParaAtualizar.endereco = endereco;
        if (dataNascimento !== undefined) camposParaAtualizar.dataNascimento = dataNascimento;

        const usuarioAtualizado = await User.findByIdAndUpdate(req.user!._id, camposParaAtualizar, { new: true }).select("-senha");
        if (!usuarioAtualizado) return res.status(404).json({ message: "Usuário não encontrado" });

        return res.json({ message: "Dados atualizados com sucesso!", usuario: usuarioAtualizado });
    } catch (error) {
        const err = error as Error;
        logHandledError("userController.atualizarDadosPessoais", err);
        return res.status(500).json({ message: "Erro ao atualizar dados pessoais" });
    }
};


// =================================
// SENHA E RECUPERAÇÃO
// =================================

export const mudarSenha = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { senhaAtual, novaSenha } = req.body;
        if (!senhaAtual || !novaSenha) return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias." });
        if (novaSenha.length < 8) return res.status(400).json({ message: "A nova senha deve ter no mínimo 8 caracteres." });

        const usuario = await User.findById(req.user!._id).select('+senha');
        if (!usuario) return res.status(404).json({ message: "Usuário não encontrado." });

        const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha!);
        if (!senhaValida) return res.status(401).json({ message: "Senha atual incorreta." });

        usuario.senha = await bcrypt.hash(novaSenha, 10);
        await usuario.save();

        return res.json({ message: "Senha alterada com sucesso!" });
    } catch (error) {
        const err = error as Error;
        logHandledError("userController.mudarSenha", err);
        return res.status(500).json({ message: "Erro ao mudar senha", error: err.message });
    }
};

export const solicitarRecuperacaoSenha = async (req: Request, res: Response): Promise<Response> => {
    try {
        let { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email é obrigatório." });
        email = email.toLowerCase();

        const usuario = await User.findOne({ email });
        if (usuario) {
            await ResetToken.deleteMany({ email, used: false });
            const token = crypto.randomBytes(32).toString("hex");
            await ResetToken.create({ email, token });

            try {
                await sendPasswordResetEmail(email, token);
            } catch (err) {
                logHandledError("userController.solicitarRecuperacaoSenha.sendPasswordResetEmail", err);
            }
        }

        return res.status(200).json({ message: "Se o email estiver cadastrado, um link de recuperação será enviado." });
    } catch (error) {
        const err = error as Error;
        logHandledError("userController.solicitarRecuperacaoSenha", err);
        return res.status(500).json({ message: "Erro ao processar solicitação" });
    }
};

export const redefinirSenha = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { token, novaSenha } = req.body;
        if (!token || !novaSenha) return res.status(400).json({ message: "Token e nova senha são obrigatórios." });
        if (novaSenha.length < 8) return res.status(400).json({ message: "A nova senha deve ter no mínimo 8 caracteres." });

        const resetToken = await ResetToken.findOne({ token, used: false, expiresAt: { $gt: new Date() } });
        if (!resetToken) return res.status(400).json({ message: "Token inválido ou expirado." });

        const usuario = await User.findOne({ email: resetToken.email });
        if (!usuario) return res.status(404).json({ message: "Usuário associado ao token não encontrado." });

        usuario.senha = await bcrypt.hash(novaSenha, 10);
        await usuario.save();
        resetToken.used = true;
        await resetToken.save();

        return res.json({ message: "Senha alterada com sucesso!" });
    } catch (error) {
        const err = error as Error;
        logHandledError("userController.redefinirSenha", err);
        return res.status(500).json({ message: "Erro ao alterar senha" });
    }
};

export const verificarTokenReset = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { token } = req.params;
        const resetToken = await ResetToken.findOne({ token, used: false, expiresAt: { $gt: new Date() } });
        return res.json({ valid: !!resetToken });
    } catch (error) {
        const err = error as Error;
        logHandledError("userController.verificarTokenReset", err);
        return res.status(500).json({ message: "Erro ao verificar token" });
    }
};

// =================================
// PREFERÊNCIAS E OUTROS
// =================================

export const atualizarTema = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { tema } = req.body;
    if (!tema || !["light", "dark"].includes(tema)) return res.status(400).json({ message: "Tema inválido." });
    await User.updateOne({ _id: req.user!._id }, { tema });
    return res.json({ message: "Tema atualizado." });
};

export const atualizarPersonagem = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { personagem, fotoPerfil } = req.body;
    if (!personagem || !["Guerreiro", "Mago", "Samurai"].includes(personagem)) return res.status(400).json({ message: "Personagem inválido." });
    
    const updateData: { personagem: string, fotoPerfil?: string } = { personagem };
    if (fotoPerfil) updateData.fotoPerfil = fotoPerfil;
    
    const usuario = await User.findByIdAndUpdate(req.user!._id, updateData, { new: true }).select('-senha');
    return res.json({ message: "Personagem atualizado.", usuario });
};

export const atualizarIdioma = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { idioma } = req.body;
    if (!idioma || !["pt-BR", "en-US", "es-ES"].includes(idioma)) return res.status(400).json({ message: "Idioma inválido." });
    await User.updateOne({ _id: req.user!._id }, { idioma });
    return res.json({ message: "Idioma atualizado." });
};

export const excluirConta = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ message: "Senha é obrigatória." });
    const usuario = await User.findById(req.user!._id).select('+senha');
    if (!usuario) return res.status(404).json({ message: "Usuário não encontrado." });
    const senhaValida = await bcrypt.compare(senha, usuario.senha!);
    if (!senhaValida) return res.status(401).json({ message: "Senha incorreta." });
    await User.findByIdAndDelete(req.user!._id);
    // TODO: Deletar dados relacionados em outros models/serviços
    return res.json({ message: "Conta excluída com sucesso." });
};

// =================================
// PÚBLICO / GERAL
// =================================

export const listarUsuarios = async (req: Request, res: Response): Promise<Response> => {
    const usuarios = await User.find().select("username nome fotoPerfil personagem tipoUsuario").sort({ createdAt: -1 });
    return res.json(usuarios);
};

export const verificarAutenticacao = (req: AuthRequest, res: Response): Response => {
    return res.json({ authenticated: true, userId: req.user!._id });
};

export const obterTermos = (req: Request, res: Response): Response => {
    return res.json({
      termosUso: { titulo: "Termos de Uso", versao: "1.0", conteudo: "..." },
      politicaPrivacidade: { titulo: "Política de Privacidade", versao: "1.0", conteudo: "..." },
    });
};

// Confirmar email - nova função para lidar com a confirmação via token
export const confirmarEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.query;

        if (!token) {
            res.status(400).json({ message: "Token de verificação ausente." });
            return;
        }

        // 1. Buscar usuário pelo token e verificar se o token não expirou
        const usuario = await User.findOne({
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
        const loginPath =
          (process.env.FRONTEND_EMAIL_VERIFIED_REDIRECT_PATH || "/login?email_verificado=true").trim();
        const path = loginPath.startsWith("/") ? loginPath : `/${loginPath}`;
        res.redirect(`${getFrontendBaseUrl()}${path}`);

    } catch (error) {
        logHandledError("userController.confirmarEmail", error);
        res.status(500).json({ message: "Erro interno ao processar verificação." });
    }
};