import { Response, NextFunction, Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import User, { IUser } from '../models/user';
import { appLogger, logHandledError } from '../logging/appLogger';

// Interface local para requisições autenticadas
interface AuthRequest extends Request {
    user?: IUser;
}

/**
 * Middleware para verificar o token JWT e adicionar o usuário à requisição.
 */
export const verificarToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
        let token = '';
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ success: false, message: "Acesso negado. Token não fornecido." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & { id: string };
        
        const user = await User.findById(decoded.id).select("-senha");

        if (!user) {
            return res.status(401).json({ success: false, message: "Usuário do token não encontrado." });
        }

        req.user = user;
        next();
    } catch (error) {
        const err = error as Error;
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            void appLogger.warn('authMiddleware.verificarToken.jwt', { errorName: err.name });
        } else {
            logHandledError('authMiddleware.verificarToken', err);
        }
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Token expirado. Faça login novamente." });
        }
        return res.status(401).json({ success: false, message: "Token inválido." });
    }
};

/**
 * Middleware para verificar se o usuário é PROFESSOR ou ADMINISTRADOR.
 */
export const verificarProfessor = (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Usuário não autenticado." });
    }
    if (req.user.tipoUsuario !== "PROFESSOR" && req.user.tipoUsuario !== "ADMINISTRADOR") {
        return res.status(403).json({ success: false, message: "Acesso negado. Apenas professores e administradores podem realizar esta ação." });
    }
    next();
};

/**
 * Middleware para verificar se o usuário é ADMINISTRADOR.
 */
export const verificarAdministrador = (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Usuário não autenticado." });
    }
    if (req.user.tipoUsuario !== "ADMINISTRADOR") {
        return res.status(403).json({ success: false, message: "Acesso negado. Apenas administradores podem realizar esta ação." });
    }
    next();
};

/**
 * Middleware opcional para verificar token.
 */
export const verificarTokenOpcional = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & { id: string };
            const user = await User.findById(decoded.id).select("-senha");
            if (user) {
                req.user = user;
            }
        }
    } catch (error) {
        // Ignora erros
    }
    next();
};
