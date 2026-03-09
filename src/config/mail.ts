import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const mailHost = process.env.MAIL_HOST;
const mailPort = Number(process.env.MAIL_PORT || 0);
const mailUser = process.env.MAIL_USER;
const mailPass = process.env.MAIL_PASS;

if (!mailHost || !mailPort || !mailUser || !mailPass) {
  console.warn("Config de e-mail incompleta. Verifique MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS no .env");
}

export const transporter = nodemailer.createTransport({
  host: mailHost,
  port: mailPort,
  secure: mailPort === 465,
  auth: mailUser && mailPass ? { user: mailUser, pass: mailPass } : undefined,
});