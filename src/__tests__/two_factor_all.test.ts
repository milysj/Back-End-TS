// @ts-nocheck
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import User from '../models/user';
import { PURPOSE_2FA_PENDING } from '../utils/twoFactorPendingToken';
import {
  generatePlainBackupCodes,
  hashBackupCodes,
  tryConsumeBackupCode,
  formatBackupCodeForUser,
  normalizeBackupCodeInput,
} from '../services/twoFactorBackupCodes';

// Mock Speakeasy
const mockGenerateSecret = jest.fn((opts: Record<string, unknown>) => ({
  base32: 'JBSWY3DPEHPK3PXP',
  otpauth_url: 'otpauth://issuer:test?secret=JBSWY3DPEHPK3PXP',
  ...opts,
}));
const mockTotpVerify = jest.fn(() => true);

jest.mock('speakeasy', () => ({
  __esModule: true,
  default: {
    generateSecret: (o: Record<string, unknown>) => mockGenerateSecret(o),
    totp: { verify: (p: Record<string, unknown>) => mockTotpVerify(p) },
  },
}));

// Mock QRCode
jest.mock('qrcode', () => ({
  __esModule: true,
  default: { toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,xx') },
}));

import * as twoFactorController from '../controllers/twoFactorController';
import { generateSecret, verifyToken } from '../services/twoFactorservice';

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
  };
}

async function createUser(overrides: Record<string, unknown> = {}) {
  const email = `u2fa_${Date.now()}_${Math.random().toString(16).slice(2)}@t.com`;
  const senha = await bcrypt.hash('senha123', 8);
  return User.create({
    nome: 'Teste 2FA',
    email,
    senha,
    dataNascimento: new Date('2000-01-01'),
    tipoUsuario: 'ALUNO',
    aceiteTermos: true,
    ...overrides,
  });
}

describe('2FA Domain - Consolidated Tests', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('twoFactorservice (Unit)', () => {
    beforeEach(() => {
        mockGenerateSecret.mockClear();
        mockTotpVerify.mockClear();
    });

    it('generateSecret usa issuer padrão ou env', () => {
        generateSecret('a@b.com');
        expect(mockGenerateSecret).toHaveBeenCalledWith(expect.objectContaining({ issuer: 'EstudeMy' }));
    });

    it('verifyToken delega ao speakeasy', () => {
        verifyToken('S', '123456');
        expect(mockTotpVerify).toHaveBeenCalled();
    });
  });

  describe('twoFactorBackupCodes (Unit)', () => {
    it('gera e consome códigos de backup', async () => {
        const codes = generatePlainBackupCodes(2);
        expect(codes).toHaveLength(2);
        
        const hashed = await hashBackupCodes(codes);
        const remaining = await tryConsumeBackupCode(hashed, codes[0]);
        expect(remaining).toHaveLength(1);
    });

    it('normaliza input', () => {
        expect(normalizeBackupCodeInput('AB-CD 12')).toBe('abcd12');
    });
  });

  describe('twoFactorController (Integration-ish)', () => {
    beforeEach(() => {
        mockTotpVerify.mockReturnValue(true);
    });

    it('verify2FALogin valida token temporário e TOTP', async () => {
        const u = await createUser({ twoFactorEnabled: true, twoFactorSecret: 'S' });
        const tempToken = jwt.sign({ id: String(u._id), purpose: PURPOSE_2FA_PENDING }, process.env.JWT_SECRET!, { expiresIn: '5m' });
        const res = mockRes();
        
        await twoFactorController.verify2FALogin({ body: { tempToken, token: '123456' } }, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('verify2FALogin retorna 400 se faltar tokens', async () => {
        const res = mockRes();
        await twoFactorController.verify2FALogin({ body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('verify2FALogin bloqueia após muitas falhas', async () => {
        const u = await createUser({ twoFactorEnabled: true, twoFactorSecret: 'S' });
        const tempToken = jwt.sign({ id: String(u._id), purpose: PURPOSE_2FA_PENDING }, process.env.JWT_SECRET!, { expiresIn: '5m' });
        mockTotpVerify.mockReturnValue(false);
        const res = mockRes();

        // 8 tentativas falhas (default)
        for (let i = 0; i < 8; i++) {
            await twoFactorController.verify2FALogin({ body: { tempToken, token: 'wrong' } }, res);
        }

        const userBloqueado = await User.findById(u._id);
        expect(userBloqueado?.twoFactorLockUntil).toBeDefined();

        await twoFactorController.verify2FALogin({ body: { tempToken, token: '123456' } }, res);
        expect(res.status).toHaveBeenCalledWith(429);
    });

    it('verify2FALogin permite login com código de backup', async () => {
        const codes = generatePlainBackupCodes(1);
        const hashed = await hashBackupCodes(codes);
        const u = await createUser({ twoFactorEnabled: true, twoFactorSecret: 'S', twoFactorBackupCodes: hashed });
        const tempToken = jwt.sign({ id: String(u._id), purpose: PURPOSE_2FA_PENDING }, process.env.JWT_SECRET!, { expiresIn: '5m' });
        const res = mockRes();

        await twoFactorController.verify2FALogin({ body: { tempToken, token: codes[0] } }, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        
        const userUpdated = await User.findById(u._id).select('+twoFactorBackupCodes');
        expect(userUpdated?.twoFactorBackupCodes).toHaveLength(hashed.length - 1);
    });

    it('iniciarSetup2FA gera QR code e segredo', async () => {
        const u = await createUser({ twoFactorEnabled: false });
        const res = mockRes();
        await twoFactorController.iniciarSetup2FA({ user: { _id: u._id } }, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, manualKey: expect.any(String) }));
    });

    it('iniciarSetup2FA retorna 404 se usuário sumir', async () => {
        const res = mockRes();
        await twoFactorController.iniciarSetup2FA({ user: { _id: new mongoose.Types.ObjectId() } }, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('confirmarSetup2FA ativa 2FA e retorna backups', async () => {
        const u = await createUser({ twoFactorEnabled: false, twoFactorSecret: 'S' });
        const res = mockRes();
        mockTotpVerify.mockReturnValue(true);
        await twoFactorController.confirmarSetup2FA({ user: { _id: u._id }, body: { token: '123456' } }, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, backupCodes: expect.any(Array) }));
    });

    it('verify2FALogin falha com purpose inválido', async () => {
        const u = await createUser({ twoFactorEnabled: true, twoFactorSecret: 'S' });
        const tempToken = jwt.sign({ id: String(u._id), purpose: 'WRONG' }, process.env.JWT_SECRET!, { expiresIn: '5m' });
        const res = mockRes();
        await twoFactorController.verify2FALogin({ body: { tempToken, token: '123456' } }, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('verify2FALogin trata TokenExpiredError', async () => {
        const res = mockRes();
        const expiredToken = jwt.sign({ id: '1', purpose: PURPOSE_2FA_PENDING }, process.env.JWT_SECRET!, { expiresIn: '-1s' });
        await twoFactorController.verify2FALogin({ body: { tempToken: expiredToken, token: '123456' } }, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('expirada') }));
    });

    it('verify2FALogin retorna 500 se JWT_SECRET sumir', async () => {
        const oldSecret = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;
        const res = mockRes();
        await twoFactorController.verify2FALogin({ body: { tempToken: 'a', token: 'b' } }, res);
        expect(res.status).toHaveBeenCalledWith(500);
        process.env.JWT_SECRET = oldSecret;
    });

    it('confirmarSetup2FA retorna 401 para código inválido', async () => {
        const u = await createUser({ twoFactorEnabled: false, twoFactorSecret: 'S' });
        const res = mockRes();
        mockTotpVerify.mockReturnValue(false);
        await twoFactorController.confirmarSetup2FA({ user: { _id: u._id }, body: { token: '000000' } }, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('iniciarSetup2FA impede se já ativo', async () => {
        const u = await createUser({ twoFactorEnabled: true });
        const res = mockRes();
        await twoFactorController.iniciarSetup2FA({ user: { _id: u._id } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('confirmarSetup2FA valida presença de token', async () => {
        const res = mockRes();
        await twoFactorController.confirmarSetup2FA({ body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('confirmarSetup2FA falha se setup não foi feito', async () => {
        const u = await createUser({ twoFactorEnabled: false });
        const res = mockRes();
        await twoFactorController.confirmarSetup2FA({ user: { _id: u._id }, body: { token: '123456' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('desativar2FA falha se dados ausentes', async () => {
        const res = mockRes();
        await twoFactorController.desativar2FA({ body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('desativar2FA falha se 2FA não ativo', async () => {
        const u = await createUser({ twoFactorEnabled: false });
        const res = mockRes();
        await twoFactorController.desativar2FA({ user: { _id: u._id }, body: { senha: '123', token: '123' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('desativar2FA falha com senha incorreta', async () => {
        const u = await createUser({ twoFactorEnabled: true, twoFactorSecret: 'S' });
        const res = mockRes();
        jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));
        await twoFactorController.desativar2FA({ user: { _id: u._id }, body: { senha: 'wrong', token: '123' } }, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('desativar2FA falha com token inválido', async () => {
        const u = await createUser({ twoFactorEnabled: true, twoFactorSecret: 'S' });
        const res = mockRes();
        jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
        mockTotpVerify.mockReturnValue(false);
        await twoFactorController.desativar2FA({ user: { _id: u._id }, body: { senha: '123', token: '000' } }, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('regenerarBackupCodes2FA falha se dados ausentes', async () => {
        const res = mockRes();
        await twoFactorController.regenerarBackupCodes2FA({ body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('desativar2FA desliga 2FA com sucesso', async () => {
        const u = await createUser({ twoFactorEnabled: true, twoFactorSecret: 'S' });
        const res = mockRes();
        mockTotpVerify.mockReturnValue(true);
        jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

        await twoFactorController.desativar2FA({ user: { _id: u._id }, body: { senha: '123', token: '123456' } }, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

        const userOff = await User.findById(u._id);
        expect(userOff?.twoFactorEnabled).toBe(false);
    });

    it('regenerarBackupCodes2FA gera novos códigos', async () => {
        const u = await createUser({ twoFactorEnabled: true, twoFactorSecret: 'S' });
        const res = mockRes();
        mockTotpVerify.mockReturnValue(true);
        jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

        await twoFactorController.regenerarBackupCodes2FA({ user: { _id: u._id }, body: { senha: '123', token: '123456' } }, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, backupCodes: expect.any(Array) }));
    });
  });

  describe('TwoFactor Utilities (Unit)', () => {
    it('signTwoFactorPendingToken usa env var para expiração', () => {
        const { signTwoFactorPendingToken } = require('../utils/twoFactorPendingToken');
        process.env.TWO_FACTOR_PENDING_TOKEN_EXPIRES_IN = '10m';
        const token = signTwoFactorPendingToken('u1');
        expect(token).toBeDefined();
    });

    it('signTwoFactorPendingToken falha se JWT_SECRET ausente', () => {
        const { signTwoFactorPendingToken } = require('../utils/twoFactorPendingToken');
        const old = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;
        expect(() => signTwoFactorPendingToken('u1')).toThrow();
        process.env.JWT_SECRET = old;
    });
  });
});
