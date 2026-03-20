import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Config / Middleware / Service coverage improvements', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('config/db should exit process when MONGO_URI is missing', async () => {
    const oldEnv = process.env.MONGO_URI;
    delete process.env.MONGO_URI;

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit:${code}`);
    });

    jest.doMock('mongoose', () => ({ connect: jest.fn() }));
    const { connectDB } = await import('../config/db');

    await expect(connectDB()).rejects.toThrow('process.exit:1');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    if (oldEnv) process.env.MONGO_URI = oldEnv;
  });

  it('config/mail should create transporter with environment variables', async () => {
    const oldHost = process.env.MAIL_HOST;
    const oldPort = process.env.MAIL_PORT;
    const oldUser = process.env.MAIL_USER;
    const oldPass = process.env.MAIL_PASS;

    process.env.MAIL_HOST = 'smtp.example.com';
    process.env.MAIL_PORT = '465';
    process.env.MAIL_USER = 'user@example.com';
    process.env.MAIL_PASS = 'password123';

    jest.resetModules();
    const { transporter } = await import('../config/mail');
    expect(transporter).toBeDefined();
    expect(transporter).toHaveProperty('sendMail');

    process.env.MAIL_HOST = oldHost;
    process.env.MAIL_PORT = oldPort;
    process.env.MAIL_USER = oldUser;
    process.env.MAIL_PASS = oldPass;
  });

  it('config/resend should initialize with API key from env', async () => {
    const oldKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = 're_test_key';

    jest.resetModules();
    const { resend } = await import('../config/resend');
    expect(resend).toBeDefined();

    if (oldKey) process.env.RESEND_API_KEY = oldKey; else delete process.env.RESEND_API_KEY;
  });


  it('services emailVerificationService throws on missing token', async () => {
    jest.doMock('../config/mail', () => ({ transporter: { sendMail: jest.fn() } }));
    const { sendVerificationEmail } = await import('../services/emailVerificationService');
    await expect(sendVerificationEmail('test@example.com', 'Teste', '')).rejects.toThrow('Token de verificação não fornecido.');
  });

  it('services userService loginUsuario returns null for unknown user', async () => {
    jest.doMock('../models/user', () => ({ findOne: () => Promise.resolve(null) }));
    const { loginUsuario } = await import('../services/userService');
    const result = await loginUsuario('x@y.com', 'senha');
    expect(result).toBeNull();
  });

  it('services userService listarUsuarios returns users without senha', async () => {
    jest.doMock('../models/user', () => ({ find: () => ({ select: () => Promise.resolve([{ _id: 'u1', nome: 'N' }]) }) }));
    const { listarUsuarios } = await import('../services/userService');
    const result = await listarUsuarios();
    expect(result).toEqual([{ _id: 'u1', nome: 'N' }]);
  });

  it('services userService criarUsuario throws when senha missing', async () => {
    const { criarUsuario } = await import('../services/userService');
    await expect(criarUsuario({ nome: 'N' } as any)).rejects.toThrow('Senha é obrigatória para criar usuário.');
  });

  it('services userService loginUsuario returns null when wrong senha', async () => {
    jest.resetModules();
    jest.doMock('../models/user', () => ({ findOne: () => Promise.resolve({ _id: 'u1', senha: 'hash' }) }));
    jest.doMock('bcryptjs', () => ({ compare: () => Promise.resolve(false) }));
    const { loginUsuario } = await import('../services/userService');
    const result = await loginUsuario('x@y.com', 'senha');
    expect(result).toBeNull();
  });
});
