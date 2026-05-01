// @ts-nocheck
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import User from '../models/user';
import { PURPOSE_2FA_PENDING } from '../utils/twoFactorPendingToken';

const mockToDataURL = jest.fn().mockResolvedValue('data:image/png;base64,xx');

jest.mock('qrcode', () => ({
  __esModule: true,
  default: { toDataURL: (...args: unknown[]) => mockToDataURL(...args) },
}));

const mockVerifyTokenSvc = jest.fn();
const mockGenerateSecretSvc = jest.fn(() => ({
  base32: 'JBSWY3DPEHPK3PXP',
  otpauth_url: 'otpauth://issuer:test?secret=JBSWY3DPEHPK3PXP',
}));

jest.mock('../services/twoFactorservice', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyTokenSvc(...args),
  generateSecret: (...args: unknown[]) => mockGenerateSecretSvc(...args),
}));

import * as twoFactorController from '../controllers/twoFactorController';

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
  };
}

async function createUser(overrides: Record<string, unknown> = {}) {
  const email = `u_${Date.now()}_${Math.random().toString(16).slice(2)}@t.com`;
  const senha = await bcrypt.hash('senha123', 8);
  return User.create({
    nome: 'Teste',
    email,
    senha,
    dataNascimento: new Date('2000-01-01'),
    tipoUsuario: 'ALUNO',
    aceiteTermos: true,
    ...overrides,
  });
}

describe('twoFactorController', () => {
  beforeEach(() => {
    mockVerifyTokenSvc.mockReset();
    mockGenerateSecretSvc.mockClear();
    mockToDataURL.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('verify2FALogin retorna 400 sem tempToken ou token', async () => {
    const res = mockRes();
    await twoFactorController.verify2FALogin({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('verify2FALogin retorna 500 sem JWT_SECRET', async () => {
    const prev = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    const res = mockRes();
    await twoFactorController.verify2FALogin({ body: { tempToken: 'x', token: '123456' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    process.env.JWT_SECRET = prev;
  });

  it('verify2FALogin retorna 401 com purpose inválido', async () => {
    const token = jwt.sign({ id: String(new mongoose.Types.ObjectId()), purpose: 'other' }, process.env.JWT_SECRET!, {
      expiresIn: '5m',
    });
    const res = mockRes();
    await twoFactorController.verify2FALogin({ body: { tempToken: token, token: '123456' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('verify2FALogin retorna 400 quando 2FA não está ativo', async () => {
    const u = await createUser({ twoFactorEnabled: false });
    const tempToken = jwt.sign({ id: String(u._id), purpose: PURPOSE_2FA_PENDING }, process.env.JWT_SECRET!, {
      expiresIn: '5m',
    });
    const res = mockRes();
    await twoFactorController.verify2FALogin({ body: { tempToken, token: '123456' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('verify2FALogin retorna 429 quando conta está bloqueada', async () => {
    const u = await createUser({
      twoFactorEnabled: true,
      twoFactorSecret: 'SECRET',
      twoFactorLockUntil: new Date(Date.now() + 60 * 60 * 1000),
    });
    const tempToken = jwt.sign({ id: String(u._id), purpose: PURPOSE_2FA_PENDING }, process.env.JWT_SECRET!, {
      expiresIn: '5m',
    });
    const res = mockRes();
    await twoFactorController.verify2FALogin({ body: { tempToken, token: '123456' } }, res);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('verify2FALogin limpa bloqueio expirado e zera tentativas', async () => {
    const u = await createUser({
      twoFactorEnabled: true,
      twoFactorSecret: 'SECRET',
      twoFactorFailedAttempts: 3,
      twoFactorLockUntil: new Date(Date.now() - 1000),
    });
    mockVerifyTokenSvc.mockReturnValue(true);
    const tempToken = jwt.sign({ id: String(u._id), purpose: PURPOSE_2FA_PENDING }, process.env.JWT_SECRET!, {
      expiresIn: '5m',
    });
    const res = mockRes();
    await twoFactorController.verify2FALogin({ body: { tempToken, token: '123456' } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const reloaded = await User.findById(u._id);
    expect(reloaded.twoFactorLockUntil == null).toBe(true);
  });

  it('verify2FALogin retorna 401 para código inválido', async () => {
    const u = await createUser({
      twoFactorEnabled: true,
      twoFactorSecret: 'SECRET',
      twoFactorFailedAttempts: 0,
    });
    mockVerifyTokenSvc.mockReturnValue(false);
    const tempToken = jwt.sign({ id: String(u._id), purpose: PURPOSE_2FA_PENDING }, process.env.JWT_SECRET!, {
      expiresIn: '5m',
    });
    const res = mockRes();
    await twoFactorController.verify2FALogin({ body: { tempToken, token: '999999' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('verify2FALogin aplica bloqueio após várias falhas', async () => {
    const prevMax = process.env.TWO_FACTOR_MAX_FAILED_ATTEMPTS;
    process.env.TWO_FACTOR_MAX_FAILED_ATTEMPTS = '2';
    const u = await createUser({
      twoFactorEnabled: true,
      twoFactorSecret: 'SECRET',
      twoFactorFailedAttempts: 0,
    });
    mockVerifyTokenSvc.mockReturnValue(false);
    const tempToken = jwt.sign({ id: String(u._id), purpose: PURPOSE_2FA_PENDING }, process.env.JWT_SECRET!, {
      expiresIn: '5m',
    });
    const res1 = mockRes();
    await twoFactorController.verify2FALogin({ body: { tempToken, token: '111111' } }, res1);
    const res2 = mockRes();
    await twoFactorController.verify2FALogin({ body: { tempToken, token: '222222' } }, res2);
    const reloaded = await User.findById(u._id).select('+twoFactorLockUntil +twoFactorFailedAttempts');
    expect(reloaded.twoFactorLockUntil).toBeDefined();
    if (prevMax) process.env.TWO_FACTOR_MAX_FAILED_ATTEMPTS = prevMax;
    else delete process.env.TWO_FACTOR_MAX_FAILED_ATTEMPTS;
  });

  it('iniciarSetup2FA retorna 404 se usuário não existe', async () => {
    jest.spyOn(User, 'findById').mockImplementationOnce(() => Promise.resolve(null) as never);
    const res = mockRes();
    await twoFactorController.iniciarSetup2FA({ user: { _id: new mongoose.Types.ObjectId() } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('iniciarSetup2FA retorna 400 se 2FA já está ativo', async () => {
    const u = await createUser({ twoFactorEnabled: true, twoFactorSecret: 'S' });
    const res = mockRes();
    await twoFactorController.iniciarSetup2FA({ user: { _id: u._id } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('iniciarSetup2FA inicia setup com sucesso', async () => {
    const u = await createUser({ twoFactorEnabled: false, twoFactorSecret: undefined });
    const res = mockRes();
    await twoFactorController.iniciarSetup2FA({ user: { _id: u._id } }, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, manualKey: 'JBSWY3DPEHPK3PXP', qrDataUrl: expect.any(String) })
    );
  });

  it('confirmarSetup2FA retorna 400 sem token', async () => {
    const res = mockRes();
    await twoFactorController.confirmarSetup2FA({ user: { _id: new mongoose.Types.ObjectId() }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('confirmarSetup2FA retorna 400 sem segredo pendente', async () => {
    const u = await createUser({ twoFactorEnabled: false });
    const res = mockRes();
    await twoFactorController.confirmarSetup2FA({ user: { _id: u._id }, body: { token: '123456' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('confirmarSetup2FA retorna 401 com código incorreto', async () => {
    const u = await createUser({ twoFactorEnabled: false, twoFactorSecret: 'PENDING' });
    mockVerifyTokenSvc.mockReturnValue(false);
    const res = mockRes();
    await twoFactorController.confirmarSetup2FA({ user: { _id: u._id }, body: { token: '123456' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('confirmarSetup2FA ativa 2FA e retorna códigos de backup', async () => {
    const u = await createUser({ twoFactorEnabled: false, twoFactorSecret: 'PENDING' });
    mockVerifyTokenSvc.mockReturnValue(true);
    const res = mockRes();
    await twoFactorController.confirmarSetup2FA({ user: { _id: u._id }, body: { token: '123456' } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, backupCodes: expect.any(Array) }));
  });

  it('desativar2FA retorna 400 sem senha ou token', async () => {
    const res = mockRes();
    await twoFactorController.desativar2FA({ user: { _id: new mongoose.Types.ObjectId() }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('desativar2FA retorna 401 com senha incorreta', async () => {
    const u = await createUser({
      twoFactorEnabled: true,
      twoFactorSecret: 'S',
    });
    const res = mockRes();
    await twoFactorController.desativar2FA({ user: { _id: u._id }, body: { senha: 'errada', token: '123456' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('desativar2FA desativa com credenciais corretas', async () => {
    const u = await createUser({
      twoFactorEnabled: true,
      twoFactorSecret: 'S',
    });
    mockVerifyTokenSvc.mockReturnValue(true);
    const res = mockRes();
    await twoFactorController.desativar2FA({ user: { _id: u._id }, body: { senha: 'senha123', token: '123456' } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('regenerarBackupCodes2FA retorna 400 sem campos', async () => {
    const res = mockRes();
    await twoFactorController.regenerarBackupCodes2FA({ user: { _id: new mongoose.Types.ObjectId() }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('regenerarBackupCodes2FA gera novos códigos', async () => {
    const u = await createUser({
      twoFactorEnabled: true,
      twoFactorSecret: 'S',
      twoFactorBackupCodes: [],
    });
    mockVerifyTokenSvc.mockReturnValue(true);
    const res = mockRes();
    await twoFactorController.regenerarBackupCodes2FA({
      user: { _id: u._id },
      body: { senha: 'senha123', token: '123456' },
    }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, backupCodes: expect.any(Array) }));
  });
});
