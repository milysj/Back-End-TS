import * as jwt from "jsonwebtoken";

// O payload do JWT pode ser um objeto, buffer ou string.
// Na nossa aplicação, geralmente é um objeto com dados do usuário.
type TokenPayload = string | object | Buffer;

/**
 * Gera um token JWT usando a expiração configurada no .env (ou 7d como fallback).
 * @param payload Os dados para incluir no token.
 * @returns O token JWT assinado.
 * @throws {Error} Se a chave secreta (JWT_SECRET) não estiver definida.
 */
export const gerarToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET;
  const expires = process.env.JWT_EXPIRES || "1d";

  if (!secret) {
    console.error("Erro fatal: JWT_SECRET não está definido nas variáveis de ambiente.");
    throw new Error("A configuração do servidor está incompleta.");
  }

  return jwt.sign(payload, secret, { expiresIn: expires as any });
};

/**
 * Retorna o tempo de expiração do JWT (JWT_EXPIRES) convertido em milissegundos
 * para ser utilizado na configuração de maxAge dos Cookies.
 */
export const getExpiresInMs = (): number => {
  const expires = process.env.JWT_EXPIRES || "1d";
  const amount = parseInt(expires, 10);
  const unit = expires.replace(String(amount), "").trim().toLowerCase();

  switch (unit) {
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      return 1 * 24 * 60 * 60 * 1000; // Fallback: 7 dias
  }
};
