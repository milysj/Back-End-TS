"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = exports.sendVerificationEmail = void 0;
const resend_1 = require("../config/resend");
// Verifica se a chave da API do Resend está configurada.
const hasResendConfig = () => !!process.env.RESEND_API_KEY;
// O endereço 'from' para o Resend quando não se tem um domínio verificado.
// O nome pode ser personalizado, mas o e-mail é fixo.
const resendFromAddress = "EstudeMy <onboarding@resend.dev>";
const sendVerificationEmail = async (to, nomeUsuario, token) => {
    const destinatario = (to || "").toString().trim();
    if (!destinatario) {
        throw new Error("Destinatário de e-mail de verificação (to) não fornecido.");
    }
    if (!token || !token.toString().trim()) {
        throw new Error("Token de verificação não fornecido.");
    }
    if (!hasResendConfig()) {
        console.warn("RESEND_API_KEY não configurada. O e-mail de verificação não será enviado.");
        return;
    }
    // Alinhado com o fluxo de recuperação de senha, o link agora aponta para o frontend.
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const verificationLink = `${frontendUrl}/confirmar?token=${token}`;
    try {
        await resend_1.resend.emails.send({
            from: resendFromAddress,
            to: destinatario, // Lembrete: No modo de desenvolvimento, só funcionará se este for seu e-mail cadastrado no Resend.
            subject: "Confirme seu e-mail - EstudeMy",
            html: `
        <h1>Olá, ${nomeUsuario}!</h1>
        <p>Obrigado por se cadastrar. Para ativar sua conta, clique no botão abaixo:</p>
        <p>
          <a href="${verificationLink}"
             style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block">
             Confirmar E-mail
          </a>
        </p>
        <p>Se o botão não funcionar, copie este link:</p>
        <p>${verificationLink}</p>
      `,
        });
    }
    catch (error) {
        console.error("Erro ao enviar e-mail de verificação via Resend:", error);
        // Lançar o erro pode ser uma boa ideia para que o chamador saiba que o envio falhou.
        throw new Error("Falha ao enviar e-mail de verificação.");
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendPasswordResetEmail = async (to, token) => {
    if (!to || !to.trim()) {
        throw new Error("Destinatário de e-mail de recuperação não fornecido.");
    }
    if (!token || !token.toString().trim()) {
        throw new Error("Token de recuperação de senha não fornecido.");
    }
    if (!hasResendConfig()) {
        console.warn("RESEND_API_KEY não configurada. O e-mail de recuperação não será enviado.");
        return;
    }
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/recuperar-senha?token=${token}`;
    try {
        await resend_1.resend.emails.send({
            from: resendFromAddress,
            to: to, // Lembrete: No modo de desenvolvimento, só funcionará se este for seu e-mail cadastrado no Resend.
            subject: "Recuperação de senha - EstudeMy",
            html: `
        <h1>Recuperar senha</h1>
        <p>Você solicitou a redefinição da sua senha no <strong>EstudeMy</strong>.</p>
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        <p>
          <a href="${resetLink}"
             style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block">
             Redefinir senha
          </a>
        </p>
        <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
        <p>${resetLink}</p>
        <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
      `,
        });
        console.warn(`Link de recuperação (enviado para ${to}): ${resetLink}`);
    }
    catch (error) {
        console.error("Erro ao enviar e-mail de recuperação via Resend:", error);
        throw new Error("Falha ao enviar e-mail de recuperação.");
    }
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
//# sourceMappingURL=emailVerificationService.js.map