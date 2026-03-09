"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = void 0;
const mail_1 = require("../config/mail");
const sendVerificationEmail = async (to, nomeUsuario, token) => {
    if (!process.env.MAIL_HOST || !process.env.MAIL_PORT || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
        console.warn("Config de e-mail incompleta (MAIL_*). E-mail de verificação não será enviado.");
        return;
    }
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    const verificationLink = `${backendUrl}/api/auth/confirmar?token=${token}`;
    const from = process.env.MAIL_FROM || process.env.MAIL_USER || "no-reply@localhost";
    await mail_1.transporter.sendMail({
        from: `Suporte <${from}>`,
        to,
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
};
exports.sendVerificationEmail = sendVerificationEmail;
