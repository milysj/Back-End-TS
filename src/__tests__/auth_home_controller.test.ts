// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { login } from '../controllers/authController';
import { getHomeData } from '../controllers/homeController';

jest.mock('../models/user', () => ({
  findOne: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'fake-token'),
}));

jest.mock('../models/trilha', () => ({
  find: jest.fn(),
}));

import User from '../models/user';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Trilha from '../models/trilha';

describe('authController', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return 400 when missing email or senha', async () => {
    const req: any = { body: { email: '', senha: '' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email e senha são obrigatórios.' });
  });

  it('should return 401 when user not found', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req: any = { body: { email: 'teste@example.com', senha: 'senha' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), cookie: jest.fn() };

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Credenciais inválidas' });
  });

  it('should return 401 when senha invalid', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'id1', nome: 'Nome', email: 'teste@example.com', tipoUsuario: 'ALUNO', senha: 'hash' }) });
    bcrypt.compare.mockResolvedValue(false);
    const req: any = { body: { email: 'teste@example.com', senha: 'senha' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), cookie: jest.fn() };

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Credenciais inválidas' });
  });

  it('should return token and user on success', async () => {
    const mockUser = { _id: 'id1', nome: 'Nome', email: 'teste@example.com', tipoUsuario: 'ALUNO', senha: 'hash', materiaFavorita: 'Matematica', personagem: 'Guerreiro', fotoPerfil: '/img.png' };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    bcrypt.compare.mockResolvedValue(true);
    const req: any = { body: { email: 'teste@example.com', senha: 'senha' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), cookie: jest.fn() };

    await login(req, res);

    expect(jwt.sign).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ user: expect.objectContaining({ email: 'teste@example.com' }) }));
  });
});

describe('homeController', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return home data successfully', async () => {
    const select = jest.fn().mockReturnThis();
    const sort = jest.fn().mockReturnThis();
    const limit: any = jest.fn(async () => []);
    const chain = { select, sort, limit };
    (Trilha.find as jest.Mock).mockReturnValue(chain);

    const req: any = { user: { _id: 'user1', nome: 'Usuário', materiaFavorita: 'História', personagem: 'Mago', fotoPerfil: '/img.png' } };
    const res: any = { json: jest.fn().mockReturnThis(), status: jest.fn().mockReturnThis() };

    await getHomeData(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ usuario: expect.objectContaining({ nome: 'Usuário' }) }));
  });

  it('should return 500 on error', async () => {
    (Trilha.find as jest.Mock).mockImplementation(() => { throw new Error('DB falhou'); });
    const req: any = { user: { _id: 'user1', nome: 'Usuário', materiaFavorita: 'História', personagem: 'Mago', fotoPerfil: '/img.png' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    await getHomeData(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Erro ao carregar dados da home' }));
  });
});