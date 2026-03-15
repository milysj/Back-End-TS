"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Carrega as variáveis de ambiente para configuração do e-mail.
// É CRÍTICO que estas variáveis estejam configuradas no ambiente de produção (ex: Render, Vercel).
const mailHost = process.env.MAIL_HOST; // Ex: 'smtp.hostinger.com'
const mailPort = Number(process.env.MAIL_PORT || 0); // Ex: 465 (SSL) ou 587 (TLS)
const mailUser = process.env.MAIL_USER; // Ex: 'seu-email@seudominio.com'
const mailPass = process.env.MAIL_PASS; // A senha do seu e-mail ou uma senha de aplicativo.
// Adiciona um aviso no console se alguma variável de ambiente estiver faltando.
if (!mailHost || !mailPort || !mailUser || !mailPass) {
    console.warn("CONFIGURAÇÃO DE E-MAIL INCOMPLETA: Verifique as variáveis MAIL_HOST, MAIL_PORT, MAIL_USER, e MAIL_PASS no seu arquivo .env ou nas configurações do ambiente de produção.");
}
/**
 * Nodemailer Transport Configuration.
 *
 * Configuração do transporte de e-mail usando Nodemailer.
 * A configuração correta é vital para o envio de e-mails de verificação e recuperação de senha.
 *
 * - host: O servidor SMTP do seu provedor de e-mail.
 * - port: A porta do servidor SMTP.
 *   - 465: Usada para SSL. `secure` deve ser `true`.
 *   - 587: Usada para TLS/STARTTLS. `secure` deve ser `false`.
 * - secure: `true` se a porta for 465. Nodemailer irá automaticamente usar STARTTLS se `secure` for `false` e a porta for 587.
 * - auth: As credenciais para autenticar no servidor SMTP.
 * - tls: Opções avançadas de TLS. A opção `ciphers: 'SSLv3'` é um fallback que pode ajudar com provedores mais antigos ou específicos como Hostinger.
 */
exports.transporter = nodemailer_1.default.createTransport({
    host: mailHost,
    port: mailPort,
    secure: mailPort === 465, // `true` para a porta 465, `false` para outras como 587.
    auth: mailUser && mailPass
        ? {
            user: mailUser,
            pass: mailPass,
        }
        : undefined,
});
//# sourceMappingURL=mail.js.map