import nodemailer, { Transporter } from "nodemailer";

const mailHost = process.env.MAIL_HOST;
const mailPort = Number(process.env.MAIL_PORT || 0);
const mailUser = process.env.MAIL_USER;
const mailPass = process.env.MAIL_PASS;

export function hasSmtpConfig(): boolean {
  return !!(mailHost && mailPort && mailUser && mailPass);
}

let smtpCache: Transporter | null | undefined;

/**
 * Transporte SMTP (Hostinger, Gmail app password, etc.). Null se MAIL_* incompleto.
 */
export function getSmtpTransporter(): Transporter | null {
  if (smtpCache !== undefined) {
    return smtpCache;
  }
  if (!hasSmtpConfig()) {
    smtpCache = null;
    return null;
  }
  smtpCache = nodemailer.createTransport({
    host: mailHost,
    port: mailPort,
    secure: mailPort === 465,
    auth: {
      user: mailUser,
      pass: mailPass,
    },
  });
  return smtpCache;
}
