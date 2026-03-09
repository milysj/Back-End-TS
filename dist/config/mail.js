"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mailHost = process.env.MAIL_HOST;
const mailPort = Number(process.env.MAIL_PORT || 0);
const mailUser = process.env.MAIL_USER;
const mailPass = process.env.MAIL_PASS;
if (!mailHost || !mailPort || !mailUser || !mailPass) {
    console.warn("Config de e-mail incompleta. Verifique MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS no .env");
}
exports.transporter = nodemailer_1.default.createTransport({
    host: mailHost,
    port: mailPort,
    secure: mailPort === 465,
    auth: mailUser && mailPass ? { user: mailUser, pass: mailPass } : undefined,
});
