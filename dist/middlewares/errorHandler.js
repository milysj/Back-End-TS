"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
/**
 * Middleware de tratamento de erros.
 * Captura erros que ocorrem na aplicação e envia uma resposta HTTP formatada.
 */
const errorHandler = (err, req, res, next) => {
    console.error("🔥 Erro capturado pelo Error Handler:", err);
    const statusCode = err.statusCode || 500;
    // Tratamento específico para erros de validação do Mongoose
    if (err.name === "ValidationError") {
        res.status(400).json({
            message: "Erro de validação dos dados",
            // Extrai as mensagens de erro de cada campo
            errors: err.errors ? Object.values(err.errors).map((e) => e.message) : 'N/A',
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
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map