import { getSmtpTransporter, hasSmtpConfig } from "../config/mail";
import { getResend, getResendFromEmail, hasResendConfig } from "../config/resend";
import { getPublicApiBaseUrl, getFrontendBaseUrl } from "../config/publicUrls";

export function isTransactionalEmailConfigured(): boolean {
  return hasResendConfig() || hasSmtpConfig();
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function smtpFromAddress(): string {
  return (
    process.env.MAIL_FROM?.trim() ||
    process.env.MAIL_USER?.trim() ||
    "no-reply@localhost"
  );
}

async function deliverHtmlEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (hasResendConfig()) {
    const resend = getResend();
    const from = getResendFromEmail();
    if (!resend || !from) {
      throw new Error("Resend configurado de forma incompleta.");
    }
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      throw new Error(error.message || "Falha ao enviar e-mail via Resend.");
    }
    if (!data) {
      throw new Error("Resend não retornou confirmação de envio.");
    }
    return;
  }

  const smtp = getSmtpTransporter();
  if (smtp) {
    const fromAddr = smtpFromAddress();
    await smtp.sendMail({
      from: `EstudeMy <${fromAddr}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(process.env.MAIL_REPLY_TO?.trim()
        ? { replyTo: process.env.MAIL_REPLY_TO.trim() }
        : {}),
    });
    return;
  }

  console.warn(
    "[email] Nenhum provedor configurado. Defina Resend (RESEND_API_KEY + RESEND_FROM_EMAIL) ou SMTP (MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS)."
  );
}

export const sendVerificationEmail = async (
  to: string,
  nomeUsuario: string,
  token: string
): Promise<void> => {
  const destinatario = (to || "").toString().trim();
  if (!destinatario) {
    throw new Error("Destinatário de e-mail de verificação (to) não fornecido.");
  }

  if (!token || !token.toString().trim()) {
    throw new Error("Token de verificação não fornecido.");
  }

  if (!isTransactionalEmailConfigured()) {
    console.warn(
      "[email] E-mail de verificação não enviado: configure Resend ou SMTP para produção."
    );
    return;
  }

  const apiBase = getPublicApiBaseUrl();
  const verificationLink = `${apiBase}/api/auth/confirmar?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(nomeUsuario || "usuário");

  await deliverHtmlEmail({
    to: destinatario,
    subject: "Confirme seu e-mail - EstudeMy",
    html: `
      <h1>Olá, ${safeName}!</h1>
      <p>Obrigado por se cadastrar. Para ativar sua conta, clique no botão abaixo:</p>
      <p>
        <a href="${verificationLink}"
           style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block">
           Confirmar e-mail
        </a>
      </p>
      <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
      <p style="word-break:break-all">${verificationLink}</p>
      <p style="color:#666;font-size:12px">O link expira em 24 horas. Se você não criou esta conta, ignore este e-mail.</p>
    `,
  });
};

export const sendPasswordResetEmail = async (
  to: string,
  token: string
): Promise<void> => {
  if (!to || !to.trim()) {
    throw new Error("Destinatário de e-mail de recuperação não fornecido.");
  }

  if (!token || !token.toString().trim()) {
    throw new Error("Token de recuperação de senha não fornecido.");
  }

  if (!isTransactionalEmailConfigured()) {
    console.warn(
      "[email] E-mail de recuperação não enviado: configure Resend ou SMTP para produção."
    );
    return;
  }

  const frontendBase = getFrontendBaseUrl();
  const resetPath = (process.env.PASSWORD_RESET_FRONTEND_PATH || "/recuperar-senha").trim();
  const normalizedPath = resetPath.startsWith("/") ? resetPath : `/${resetPath}`;
  const sep = normalizedPath.includes("?") ? "&" : "?";
  const resetLink = `${frontendBase}${normalizedPath}${sep}token=${encodeURIComponent(token)}`;

  await deliverHtmlEmail({
    to: to.trim(),
    subject: "Recuperação de senha - EstudeMy",
    html: `
      <h1>Redefinir senha</h1>
      <p>Você solicitou a redefinição da sua senha no <strong>EstudeMy</strong>.</p>
      <p>Clique no botão abaixo para criar uma nova senha:</p>
      <p>
        <a href="${resetLink}"
           style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block">
           Redefinir senha
        </a>
      </p>
      <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
      <p style="word-break:break-all">${resetLink}</p>
      <p style="color:#666;font-size:12px">O link expira em aproximadamente 1 hora. Se você não solicitou esta alteração, ignore este e-mail.</p>
    `,
  });
};
