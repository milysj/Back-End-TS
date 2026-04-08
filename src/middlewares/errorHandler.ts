import { Request, Response, NextFunction } from 'express';
import { appLogger } from '../logging/appLogger';

// Interface para um erro com propriedades adicionais que podemos usar
interface ApiError extends Error {
    statusCode?: number;
    errors?: any; // Para erros de validação do Mongoose
}

/**
 * Middleware de tratamento de erros.
 * Captura erros que ocorrem na aplicação e envia uma resposta HTTP formatada.
 */
export const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction): void => {
  const statusCode = err.statusCode || 500;
  void appLogger.error('express.errorHandler', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    statusCode,
    errorName: err.name,
    errorMessage: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Tratamento específico para erros de validação do Mongoose
  if (err.name === "ValidationError") {
    res.status(400).json({
        message: "Erro de validação dos dados",
        // Extrai as mensagens de erro de cada campo
        errors: err.errors ? Object.values(err.errors).map((e: any) => e.message) : 'N/A',
    });
    return;
  }

  // Tratamento para erros de token JWT
  if (err.name === "JsonWebTokenError") {
    res.status(401).json({ message: "Token inválido ou malformado." });
    return;
  }
  if (err.name === "TokenExpiredError") {
    res.status(401).json({ message: "Token expirado. Por favor, faça login novamente." });
    return;
  }

  // Resposta padrão para outros tipos de erro
  res.status(statusCode).json({
    message: err.message || "Ocorreu um erro interno no servidor.",
    // Em desenvolvimento, pode ser útil enviar a stack do erro
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
