// @ts-nocheck
import { describe, it, expect, jest } from '@jest/globals';
import User from '../models/user';
import bcrypt from 'bcryptjs';

// Mock do Modelo User
jest.mock('../models/user');
jest.mock('bcryptjs');

import * as userService from '../services/userService';

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listarUsuarios deve retornar lista de usuários sem senha', async () => {
    const mockUsers = [{ email: 'test@test.com' }];
    User.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUsers)
    });

    const result = await userService.listarUsuarios();
    expect(result).toEqual(mockUsers);
    expect(User.find).toHaveBeenCalled();
  });

  it('criarUsuario deve lançar erro se não houver senha', async () => {
    await expect(userService.criarUsuario({ email: 'test@test.com' })).rejects.toThrow('Senha é obrigatória');
  });

  it('criarUsuario deve criptografar senha e salvar usuário', async () => {
    const dados = { email: 'test@test.com', senha: '123' };
    bcrypt.hash.mockResolvedValue('hashed_123');
    User.prototype.save = jest.fn().mockResolvedValue({ ...dados, senha: 'hashed_123' });

    await userService.criarUsuario(dados);
    expect(bcrypt.hash).toHaveBeenCalledWith('123', 10);
  });

  it('loginUsuario deve retornar null se usuário não for encontrado', async () => {
    User.findOne.mockResolvedValue(null);
    const result = await userService.loginUsuario('email@test.com', '123');
    expect(result).toBeNull();
  });

  it('loginUsuario deve retornar null se senha estiver incorreta', async () => {
    User.findOne.mockResolvedValue({ email: 'email@test.com', senha: 'hashed' });
    bcrypt.compare.mockResolvedValue(false);
    const result = await userService.loginUsuario('email@test.com', '123');
    expect(result).toBeNull();
  });

  it('loginUsuario deve retornar usuário se sucesso', async () => {
    const user = { email: 'email@test.com', senha: 'hashed' };
    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    const result = await userService.loginUsuario('email@test.com', '123');
    expect(result).toEqual(user);
  });
});
