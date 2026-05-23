import { Request, Response } from "express";
import User, { IUser } from "../models/user";
import { logHandledError } from "../logging/appLogger";

interface AuthRequest extends Request {
    user?: IUser;
}

// Auxiliar para checar permissão hierárquica
const canModifyTarget = (currentUser: IUser, targetUser: IUser): boolean => {
    // Owner pode modificar qualquer um
    if (currentUser.tipoUsuario === "OWNER") return true;

    // Admin NÃO pode modificar Owner nem outro Admin
    if (currentUser.tipoUsuario === "ADMINISTRADOR") {
        if (targetUser.tipoUsuario === "OWNER" || targetUser.tipoUsuario === "ADMINISTRADOR") {
            return false;
        }
        return true;
    }

    return false;
};

export const listarUsuarios = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const usuarios = await User.find().select("-senha -twoFactorSecret -twoFactorBackupCodes").sort({ createdAt: -1 });
        return res.json(usuarios);
    } catch (error) {
        logHandledError("adminController.listarUsuarios", error as Error);
        return res.status(500).json({ message: "Erro ao listar usuários." });
    }
};

export const alterarTipoUsuario = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        const { tipoUsuario } = req.body;
        const currentUserId = String(req.user!._id);

        if (id === currentUserId) {
            return res.status(403).json({ message: "Você não pode alterar seu próprio tipo de usuário por aqui." });
        }

        const validTypes = ["ALUNO", "PROFESSOR", "ADMINISTRADOR", "OWNER"];
        if (!validTypes.includes(tipoUsuario)) {
            return res.status(400).json({ message: "Tipo de usuário inválido." });
        }

        const targetUser = await User.findById(id);
        if (!targetUser) return res.status(404).json({ message: "Usuário não encontrado." });

        if (!canModifyTarget(req.user!, targetUser)) {
            return res.status(403).json({ message: "Você não tem permissão para modificar este usuário." });
        }

        // Somente um OWNER pode promover alguém a OWNER
        if (tipoUsuario === "OWNER" && req.user!.tipoUsuario !== "OWNER") {
            return res.status(403).json({ message: "Apenas um OWNER pode promover outro usuário a OWNER." });
        }

        // Restrição para Administrador promover a Administrador
        if (tipoUsuario === "ADMINISTRADOR" && req.user!.tipoUsuario === "ADMINISTRADOR") {
            if (!req.user!.canPromoteToAdmin) {
                return res.status(403).json({ message: "Você não tem permissão para promover usuários a Administrador." });
            }
        }

        targetUser.tipoUsuario = tipoUsuario;
        await targetUser.save();

        return res.json({ message: "Tipo de usuário atualizado com sucesso.", usuario: targetUser });
    } catch (error) {
        logHandledError("adminController.alterarTipoUsuario", error as Error);
        return res.status(500).json({ message: "Erro ao alterar tipo de usuário." });
    }
};

export const alterarStatusUsuario = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        const { status, bloqueadoAte } = req.body;
        const currentUserId = String(req.user!._id);

        if (id === currentUserId) {
            return res.status(403).json({ message: "Você não pode alterar seu próprio status." });
        }

        const validStatus = ["ATIVO", "BLOQUEADO", "BANIDO"];
        if (!validStatus.includes(status)) {
            return res.status(400).json({ message: "Status inválido." });
        }

        const targetUser = await User.findById(id);
        if (!targetUser) return res.status(404).json({ message: "Usuário não encontrado." });

        if (!canModifyTarget(req.user!, targetUser)) {
            return res.status(403).json({ message: "Você não tem permissão para modificar o status deste usuário." });
        }

        targetUser.status = status;
        
        if (status === "BLOQUEADO") {
            targetUser.bloqueadoAte = bloqueadoAte ? new Date(bloqueadoAte) : null;
        } else {
            targetUser.bloqueadoAte = null;
        }

        await targetUser.save();

        return res.json({ message: "Status do usuário atualizado com sucesso.", usuario: targetUser });
    } catch (error) {
        logHandledError("adminController.alterarStatusUsuario", error as Error);
        return res.status(500).json({ message: "Erro ao alterar status do usuário." });
    }
};

export const excluirUsuario = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        const currentUserId = String(req.user!._id);

        if (id === currentUserId) {
            return res.status(403).json({ message: "Você não pode excluir sua própria conta por aqui." });
        }

        const targetUser = await User.findById(id);
        if (!targetUser) return res.status(404).json({ message: "Usuário não encontrado." });

        if (!canModifyTarget(req.user!, targetUser)) {
            return res.status(403).json({ message: "Você não tem permissão para excluir este usuário." });
        }

        await User.findByIdAndDelete(id);

        return res.json({ message: "Usuário excluído com sucesso." });
    } catch (error) {
        logHandledError("adminController.excluirUsuario", error as Error);
        return res.status(500).json({ message: "Erro ao excluir usuário." });
    }
};

export const alterarPermissoesAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        const { canPromoteToAdmin } = req.body;

        if (req.user!.tipoUsuario !== "OWNER") {
            return res.status(403).json({ message: "Apenas um OWNER pode alterar permissões especiais." });
        }

        const targetUser = await User.findById(id);
        if (!targetUser) return res.status(404).json({ message: "Usuário não encontrado." });

        if (targetUser.tipoUsuario !== "ADMINISTRADOR") {
            return res.status(400).json({ message: "Este usuário não é um administrador." });
        }

        targetUser.canPromoteToAdmin = Boolean(canPromoteToAdmin);
        await targetUser.save();

        return res.json({ message: "Permissões atualizadas com sucesso.", usuario: targetUser });
    } catch (error) {
        logHandledError("adminController.alterarPermissoesAdmin", error as Error);
        return res.status(500).json({ message: "Erro ao alterar permissões do usuário." });
    }
};
