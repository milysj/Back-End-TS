import { Resend } from "resend";

/**
 * Resend: defina RESEND_API_KEY e RESEND_FROM_EMAIL (ex: "EstudeMy <noreply@seudominio.com>").
 * O domínio do "from" precisa estar verificado no painel do Resend.
 */
export function getResendFromEmail(): string | null {
  const v = process.env.RESEND_FROM_EMAIL?.trim();
  return v || null;
}

export function hasResendConfig(): boolean {
  return !!(process.env.RESEND_API_KEY?.trim() && getResendFromEmail());
}

let client: Resend | null | undefined;

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return null;
  }
  if (client === undefined) {
    client = new Resend(key);
  }
  return client;
}
