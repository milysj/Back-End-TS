// @ts-nocheck
import request from 'supertest';
import app from '../server';
import { describe, it, expect, afterAll, jest, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../models/user';
import bcrypt from 'bcryptjs';
import * as userService from '../services/userService';

jest.setTimeout(30000);

describe('User Domain - Unit & Integration Tests', () => {
    beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe('userService (Unit)', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
        });

        it('listarUsuarios deve retornar lista de usuários sem senha', async () => {
            const mockUsers = [{ email: 'test@test.com' }];
            jest.spyOn(User, 'find').mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUsers as any)
            } as any);

            const result = await userService.listarUsuarios();
            expect(result).toEqual(mockUsers);
        });

        it('criarUsuario deve lançar erro se não houver senha', async () => {
            await expect(userService.criarUsuario({ email: 'test@test.com' } as any)).rejects.toThrow('Senha é obrigatória');
        });

        it('criarUsuario deve criptografar senha e salvar usuário', async () => {
            const dados = { email: 'test_unit@test.com', senha: '123' };
            const hashSpy = jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashed_123'));
            const saveSpy = jest.spyOn(User.prototype, 'save').mockImplementation(function(this: any) {
                return Promise.resolve(this);
            });

            await userService.criarUsuario(dados);
            expect(hashSpy).toHaveBeenCalledWith('123', 10);
            hashSpy.mockRestore();
            saveSpy.mockRestore();
        });

        it('loginUsuario deve retornar null se usuário não for encontrado', async () => {
            jest.spyOn(User, 'findOne').mockResolvedValue(null);
            const result = await userService.loginUsuario('email@test.com', '123');
            expect(result).toBeNull();
        });

        it('loginUsuario deve retornar null se senha estiver incorreta', async () => {
            const mockUser = { senha: 'hashed_password' };
            jest.spyOn(User, 'findOne').mockResolvedValue(mockUser as any);
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
            
            const result = await userService.loginUsuario('email@test.com', '123');
            expect(result).toBeNull();
        });
    });

    describe('emailVerificationService (Unit)', () => {
        let emailService;
        beforeEach(async () => {
            jest.resetModules();
            emailService = await import('../services/emailVerificationService');
            process.env.RESEND_API_KEY = '';
            process.env.MAIL_HOST = '';
        });

        it('lança erro se token não for fornecido', async () => {
            await expect(emailService.sendVerificationEmail('a@b.com', 'N', '')).rejects.toThrow('Token');
        });

        it('lança erro se destinatário for vazio', async () => {
            await expect(emailService.sendVerificationEmail('', 'N', 'tk')).rejects.toThrow('Destinatário');
            await expect(emailService.sendPasswordResetEmail('', 'tk')).rejects.toThrow('Destinatário');
        });

        it('não envia se nenhum provedor configurado (warn)', async () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            await emailService.sendVerificationEmail('a@b.com', 'N', 'tk');
            expect(warnSpy).toHaveBeenCalled();
        });

        it('tenta enviar via Resend e falha se incompleto', async () => {
            const resendConfig = await import('../config/resend');
            jest.spyOn(resendConfig, 'hasResendConfig').mockReturnValue(true);
            jest.spyOn(resendConfig, 'getResend').mockReturnValue(null); // Provoca erro de incompleto
            
            await expect(emailService.sendVerificationEmail('a@b.com', 'N', 'tk')).rejects.toThrow('incompleta');
        });

        it('tenta enviar via Resend e trata erro da API', async () => {
            const resendConfig = await import('../config/resend');
            const mockSend = jest.fn().mockResolvedValue({ error: { message: 'API Error' } });
            
            jest.spyOn(resendConfig, 'hasResendConfig').mockReturnValue(true);
            jest.spyOn(resendConfig, 'getResend').mockReturnValue({ emails: { send: mockSend } } as any);
            jest.spyOn(resendConfig, 'getResendFromEmail').mockReturnValue('onboarding@resend.dev');
            
            await expect(emailService.sendVerificationEmail('a@b.com', 'N', 'tk')).rejects.toThrow('API Error');
        });

        it('tenta enviar via Resend e falha se não retornar data', async () => {
            const resendConfig = await import('../config/resend');
            jest.spyOn(resendConfig, 'hasResendConfig').mockReturnValue(true);
            jest.spyOn(resendConfig, 'getResend').mockReturnValue({
                emails: { send: jest.fn().mockResolvedValue({ data: null, error: null }) }
            } as any);
            jest.spyOn(resendConfig, 'getResendFromEmail').mockReturnValue('from@test.com');
            await expect(emailService.sendVerificationEmail('a@b.com', 'N', 'tk')).rejects.toThrow('não retornou confirmação');
        });

        it('lança erro em recuperação de senha se token ausente', async () => {
            await expect(emailService.sendPasswordResetEmail('a@b.com', '')).rejects.toThrow('Token');
        });

        it('tenta enviar via SMTP com sucesso', async () => {
            const mailConfig = await import('../config/mail');
            const resendConfig = await import('../config/resend');
            const mockSendMail = jest.fn().mockResolvedValue({});
            
            jest.spyOn(resendConfig, 'hasResendConfig').mockReturnValue(false);
            jest.spyOn(mailConfig, 'hasSmtpConfig').mockReturnValue(true);
            jest.spyOn(mailConfig, 'getSmtpTransporter').mockReturnValue({ sendMail: mockSendMail } as any);
            
            await emailService.sendVerificationEmail('a@b.com', 'N', 'tk');
            expect(mockSendMail).toHaveBeenCalled();
        });
    });

    describe('Fluxo de Usuário (Integration)', () => {
        const testUser = {
            nome: "Usuário de Teste",
            email: `teste_${Date.now()}@exemplo.com`,
            senha: "senhaSegura123",
            dataNascimento: "1995-05-15",
            tipoUsuario: "ALUNO" as const,
            aceiteTermos: true
        };

        let authToken = '';

        it('Deve registrar, confirmar e logar usuário', async () => {
            // Register
            const resReg = await request(app).post('/api/users/register').send(testUser);
            expect(resReg.statusCode).toEqual(201);

            const userInDb = await User.findOne({ email: testUser.email });
            expect(userInDb).not.toBeNull();

            // Verify email (if token exists)
            if (userInDb?.verificationToken) {
                await request(app).get(`/api/auth/confirmar?token=${userInDb.verificationToken}`);
            } else {
                await User.updateOne({ email: testUser.email }, { isVerified: true });
            }

            // Login
            const resLogin = await request(app).post('/api/users/login').send({
                email: testUser.email,
                senha: testUser.senha
            });
            expect(resLogin.statusCode).toEqual(200);
            authToken = resLogin.body.token;
        });

        it('Deve gerenciar perfil e dados pessoais', async () => {
            // Criar Perfil
            const profileData = {
                username: `user_${Date.now()}`,
                personagem: "Guerreiro" as const,
                fotoPerfil: "/img/guerreiro.png"
            };
            const resProf = await request(app)
                .post('/api/users/criar-perfil')
                .set('Authorization', `Bearer ${authToken}`)
                .send(profileData);
            expect(resProf.statusCode).toEqual(200);

            // Buscar Me
            const resMe = await request(app)
                .get('/api/users/me')
                .set('Authorization', `Bearer ${authToken}`);
            expect(resMe.statusCode).toEqual(200);
            expect(resMe.body.email).toBe(testUser.email);

            // Atualizar Dados
            const resUpdate = await request(app)
                .put('/api/users/dados-pessoais')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ nome: 'Nome Atualizado' });
            expect(resUpdate.statusCode).toEqual(200);
        });

        it('Deve mudar senha e solicitar recuperação', async () => {
            // Mudar Senha
            const resPwd = await request(app)
                .put('/api/users/mudar-senha')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ senhaAtual: testUser.senha, novaSenha: 'senhaNova123' });
            expect(resPwd.statusCode).toEqual(200);

            // Solicitar Recuperação
            const resRec = await request(app)
                .post('/api/users/solicitar-recuperacao')
                .send({ email: testUser.email });
            expect(resRec.statusCode).toEqual(200);

            // Verify Token
            const resVerify = await request(app)
                .get('/api/users/verify')
                .set('Authorization', `Bearer ${authToken}`);
            expect(resVerify.statusCode).toEqual(200);
        });
    });
});
