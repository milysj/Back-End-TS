import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn(
    'RESEND_API_KEY não encontrada. O envio de e-mail via Resend está desativado.'
  );
}

// Inicializa o cliente Resend.
// A API key é lida das variáveis de ambiente.
export const resend = new Resend(apiKey);
