// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../server';

jest.mock('../models/user');
import User from '../models/user';
import bcrypt from 'bcryptjs';
import * as userController from '../controllers/userController';

describe('Contra-medidas de Segurança Backend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';
  });

  describe('Tópico 1: Segurança HTTP e Sanitização (Helmet & NoSQL Injection)', () => {
    it('deve incluir o cabeçalho Content-Security-Policy nas respostas', async () => {
      const res = await request(app).get('/');
      expect(res.headers['content-security-policy']).toBeDefined();
    });

    it('deve incluir o cabeçalho X-Content-Type-Options nas respostas', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Tópico 2: Lockout Progressivo no Login por Senha', () => {
    it('deve bloquear a conta temporariamente após 5 tentativas incorretas de senha', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockUser = {
        _id: 'u123',
        email: 'testelockout@exemplo.com',
        senha: 'hashedpassword',
        status: 'ATIVO',
        tentativasLogin: 4,
        save: mockSave,
      };

      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

      const req = {
        body: { email: 'testelockout@exemplo.com', senha: 'errada' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        cookie: jest.fn(),
      };

      await userController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('bloqueada por 15 minutos'),
        })
      );
      expect(mockUser.status).toBe('BLOQUEADO');
      expect(mockUser.bloqueadoAte).toBeDefined();
    });
  });
});
