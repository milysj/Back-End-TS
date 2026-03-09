import { transporter } from "../config/mail";

const hasMailConfig = () =>
  !!process.env.MAIL_HOST &&
  !!process.env.MAIL_PORT &&
  !!process.env.MAIL_USER &&
  !!process.env.MAIL_PASS;

const getFromAddress = () =>
  process.env.MAIL_FROM || process.env.MAIL_USER || "no-reply@localhost";

export const sendVerificationEmail = async (
  to: string,
  nomeUsuario: string,
  token: string
): Promise<void> => {
  if (!hasMailConfig()) {
    console.warn("Config de e-mail incompleta (MAIL_*). E-mail de verificação não será enviado.");
    return;
  }

  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const verificationLink = `${backendUrl}/api/auth/confirmar?token=${token}`;

  const from = getFromAddress();

  await transporter.sendMail({
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

export const sendPasswordResetEmail = async (
  to: string,
  token: string
): Promise<void> => {
  if (!hasMailConfig()) {
    console.warn("Config de e-mail incompleta (MAIL_*). E-mail de recuperação não será enviado.");
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${frontendUrl}/recuperar-senha?token=${token}`;

  const from = getFromAddress();

  await transporter.sendMail({
    from: `Suporte <${from}>`,
    to,
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
};
