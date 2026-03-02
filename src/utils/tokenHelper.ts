import * as jwt from "jsonwebtoken";

// O payload do JWT pode ser um objeto, buffer ou string.
// Na nossa aplicação, geralmente é um objeto com dados do usuário.
type TokenPayload = string | object | Buffer;

/**
 * Gera um token JWT.
 * @param payload Os dados para incluir no token.
 * @returns O token JWT assinado.
 * @throws {Error} Se a chave secreta (JWT_SECRET) não estiver definida.
 */
export const gerarToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("Erro fatal: JWT_SECRET não está definido nas variáveis de ambiente.");
    throw new Error("A configuração do servidor está incompleta.");
  }

  return jwt.sign(payload, secret, { expiresIn: "7d" });
};
