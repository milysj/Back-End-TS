// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user';
import Materia from '../models/materia';
import Trilha from '../models/trilha';
import Fase from '../models/fase';
import Score from '../models/score';
import { loginUser as authLoginUser } from '../controllers/authController';
import { atualizarMateria } from '../controllers/materiaController';
import { atualizarPreferencias, loginUser as userLoginUser } from '../controllers/userController';
import { tryConsumeBackupCode } from '../services/twoFactorBackupCodes';
import { buscarContextoRagTrilha } from '../services/ragTrilhaContext';
import { verificarTokenOpcional } from '../middlewares/authMiddleware';
import { adicionarXPInterno } from '../controllers/scoreController';
import { errorHandler } from '../middlewares/errorHandler';
import { appLogger, logHandledError } from '../logging/appLogger';

jest.mock('../models/user');
jest.mock('../models/materia');
jest.mock('../models/trilha');
jest.mock('../models/fase');
jest.mock('../models/score');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Branch Coverage Boost Suite', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      query: {},
      headers: {},
      cookies: {},
      user: { _id: 'u123', email: 'user@test.com', tipoUsuario: 'ALUNO' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
    };
    process.env.JWT_SECRET = 'test_jwt_secret_12345';
  });

  describe('authController.loginUser - Branches', () => {
    it('retorna 400 se email ou senha estiverem ausentes', async () => {
      req.body = { email: '' };
      await authLoginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      req.body = { senha: '123' };
      await authLoginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 403 se usuário estiver com status BANIDO', async () => {
      req.body = { email: 'banido@test.com', senha: 'password' };
      const user = { status: 'BANIDO' };
      User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await authLoginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('banida') }));
    });

    it('desbloqueia usuário BLOQUEADO se data de bloqueio já expirou', async () => {
      req.body = { email: 'bloq@test.com', senha: 'password' };
      const user = {
        status: 'BLOQUEADO',
        bloqueadoAte: new Date(Date.now() - 60000), // expirado no passado
        tentativasLogin: 5,
        senha: 'hashed_password',
        save: jest.fn().mockResolvedValue(true),
      };
      User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      await authLoginUser(req, res);
      expect(user.status).toBe('ATIVO');
      expect(user.bloqueadoAte).toBeNull();
      expect(user.tentativasLogin).toBe(1); // incrementou após senha errada
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('retorna 403 se usuário BLOQUEADO ainda dentro do período de bloqueio', async () => {
      req.body = { email: 'bloq@test.com', senha: 'password' };
      const user = {
        status: 'BLOQUEADO',
        bloqueadoAte: new Date(Date.now() + 600000), // no futuro
        save: jest.fn(),
      };
      User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await authLoginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('bloqueada até') }));
    });

    it('retorna 403 se usuário BLOQUEADO sem data definida (bloqueio genérico)', async () => {
      req.body = { email: 'bloq@test.com', senha: 'password' };
      const user = {
        status: 'BLOQUEADO',
        bloqueadoAte: null,
      };
      User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await authLoginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Esta conta está temporariamente bloqueada.' });
    });

    it('bloqueia usuário por 15 minutos ao atingir 5 tentativas incorretas', async () => {
      req.body = { email: 'user@test.com', senha: 'wrong_password' };
      const user = {
        status: 'ATIVO',
        tentativasLogin: 4,
        senha: 'hashed_password',
        save: jest.fn().mockResolvedValue(true),
      };
      User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      await authLoginUser(req, res);
      expect(user.status).toBe('BLOQUEADO');
      expect(user.tentativasLogin).toBe(0);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('bloqueada por 15 minutos') }));
    });

    it('reseta tentativasLogin para 0 se acertar senha após falhas prévias', async () => {
      req.body = { email: 'user@test.com', senha: 'correct_password' };
      const user = {
        _id: 'u1',
        nome: 'Tester',
        email: 'user@test.com',
        status: 'ATIVO',
        tentativasLogin: 3,
        senha: 'hashed_password',
        save: jest.fn().mockResolvedValue(true),
      };
      User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      await authLoginUser(req, res);
      expect(user.tentativasLogin).toBe(0);
      expect(user.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it('retorna require2FA quando o usuário possui twoFactorEnabled ativado', async () => {
      req.body = { email: '2fa@test.com', senha: 'correct_password' };
      const user = {
        _id: 'u_2fa',
        status: 'ATIVO',
        twoFactorEnabled: true,
        senha: 'hashed_password',
      };
      User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      await authLoginUser(req, res);
      expect(res.json).toHaveBeenCalledWith({
        require2FA: true,
        userId: 'u_2fa',
      });
    });

    it('retorna 500 se ocorrer exceção no loginUser', async () => {
      req.body = { email: 'err@test.com', senha: 'pass' };
      User.findOne = jest.fn().mockImplementation(() => {
        throw new Error('Database connection crashed');
      });

      await authLoginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno no servidor' });
    });
  });

  describe('materiaController.atualizarMateria - Branches', () => {
    it('retorna 400 se nome ou novoNome forem inválidos ou vazios', async () => {
      req.params = { nome: '' };
      req.body = { novoNome: 'Matematica' };
      await atualizarMateria(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      req.params = { nome: 'Fisica' };
      req.body = { novoNome: '   ' };
      await atualizarMateria(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 404 se a matéria antiga não for encontrada', async () => {
      req.params = { nome: 'Inexistente' };
      req.body = { novoNome: 'Nova' };
      Materia.findOne = jest.fn().mockResolvedValue(null);

      await atualizarMateria(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Matéria não encontrada.' });
    });

    it('retorna 409 se já existir outra matéria com o novoNome', async () => {
      req.params = { nome: 'Historia' };
      req.body = { novoNome: 'Geografia' };
      const materiaAntiga = { _id: 'm1', nome: 'Historia' };
      const materiaExistente = { _id: 'm2', nome: 'Geografia' };

      Materia.findOne = jest.fn()
        .mockResolvedValueOnce(materiaAntiga)
        .mockResolvedValueOnce(materiaExistente);

      await atualizarMateria(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Já existe uma matéria com este nome.' });
    });

    it('atualiza matéria e trilhas associadas com sucesso', async () => {
      req.params = { nome: 'Ciencias' };
      req.body = { novoNome: 'Biologia Aplicada' };
      const materiaAntiga = { _id: 'm1', nome: 'Ciencias', save: jest.fn().mockResolvedValue(true) };

      Materia.findOne = jest.fn()
        .mockResolvedValueOnce(materiaAntiga)
        .mockResolvedValueOnce(null); // não existe outra
      Trilha.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 3 });

      await atualizarMateria(req, res);
      expect(materiaAntiga.nome).toBe('Biologia Aplicada');
      expect(materiaAntiga.save).toHaveBeenCalled();
      expect(Trilha.updateMany).toHaveBeenCalledWith({ materia: 'Ciencias' }, { materia: 'Biologia Aplicada' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Matéria atualizada com sucesso.' }));
    });

    it('permite atualizar quando o novoNome for idêntico (apenas mudando case)', async () => {
      req.params = { nome: 'quimica' };
      req.body = { novoNome: 'Quimica' };
      const materia = { _id: 'm1', nome: 'quimica', save: jest.fn().mockResolvedValue(true) };

      Materia.findOne = jest.fn().mockResolvedValueOnce(materia);
      Trilha.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });

      await atualizarMateria(req, res);
      expect(materia.nome).toBe('Quimica');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Matéria atualizada com sucesso.' }));
    });

    it('retorna 500 se ocorrer erro ao atualizar matéria', async () => {
      req.params = { nome: 'Erro' };
      req.body = { novoNome: 'Falha' };
      Materia.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await atualizarMateria(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao atualizar matéria.' });
    });
  });

  describe('userController.atualizarPreferencias - Branches', () => {
    it('retorna 400 se tema for inválido', async () => {
      req.body = { tema: 'neon_pink' };
      await atualizarPreferencias(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Tema inválido.' });
    });

    it('retorna 400 se idioma for inválido', async () => {
      req.body = { idioma: 'it-IT' };
      await atualizarPreferencias(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Idioma inválido.' });
    });

    it('retorna 404 se usuário não for encontrado', async () => {
      req.body = {
        emailNotifications: true,
        courseUpdates: false,
        marketingEmails: true,
        publicProfile: false,
        showEmail: true,
        showProgress: false,
        tema: 'dark',
        idioma: 'pt-BR',
      };
      User.findByIdAndUpdate = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      await atualizarPreferencias(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Usuário não encontrado' });
    });

    it('atualiza todas as preferências com sucesso', async () => {
      req.body = {
        emailNotifications: true,
        courseUpdates: true,
        marketingEmails: false,
        publicProfile: true,
        showEmail: false,
        showProgress: true,
        tema: 'light',
        idioma: 'en-US',
      };
      const updatedUser = { _id: 'u123', tema: 'light', idioma: 'en-US' };
      User.findByIdAndUpdate = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(updatedUser) });

      await atualizarPreferencias(req, res);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Preferências atualizadas com sucesso!',
        usuario: updatedUser,
      });
    });

    it('retorna 500 em erro interno no atualizarPreferencias', async () => {
      req.body = { tema: 'dark' };
      User.findByIdAndUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Falha no banco');
      });

      await atualizarPreferencias(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao atualizar preferências.' });
    });
  });

  describe('userController.loginUser - Status & Branches', () => {
    it('retorna 403 se status for BANIDO no userController', async () => {
      req.body = { email: 'ban@test.com', senha: '123' };
      const user = { status: 'BANIDO' };
      User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await userLoginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Esta conta foi banida do sistema.' });
    });

    it('retorna 403 com mensagem por tempo indeterminado se BLOQUEADO sem bloqueadoAte', async () => {
      req.body = { email: 'bloq@test.com', senha: '123' };
      const user = { status: 'BLOQUEADO', bloqueadoAte: null };
      User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await userLoginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Esta conta está bloqueada por tempo indeterminado.' });
    });

    it('retorna 403 com data formatada se BLOQUEADO com bloqueadoAte no futuro', async () => {
      req.body = { email: 'bloq@test.com', senha: '123' };
      const user = { status: 'BLOQUEADO', bloqueadoAte: new Date(Date.now() + 100000) };
      User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await userLoginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('bloqueada até') }));
    });

    it('desbloqueia se bloqueadoAte já passou no userController', async () => {
      req.body = { email: 'bloq@test.com', senha: 'wrong' };
      const user = {
        status: 'BLOQUEADO',
        bloqueadoAte: new Date(Date.now() - 5000),
        tentativasLogin: 5,
        senha: 'hash',
        save: jest.fn().mockResolvedValue(true),
      };
      User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      await userLoginUser(req, res);
      expect(user.status).toBe('ATIVO');
      expect(user.bloqueadoAte).toBeNull();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('bloqueia por 15 minutos ao errar senha pela 5ª vez no userController', async () => {
      req.body = { email: 'err@test.com', senha: 'wrong' };
      const user = {
        status: 'ATIVO',
        tentativasLogin: 4,
        senha: 'hash',
        save: jest.fn().mockResolvedValue(true),
      };
      User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      await userLoginUser(req, res);
      expect(user.status).toBe('BLOQUEADO');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('bloqueada por 15 minutos') }));
    });
  });

  describe('twoFactorBackupCodes - Branches', () => {
    it('retorna null se input for menor que 16 chars ou hashes ausentes', async () => {
      const res1 = await tryConsumeBackupCode(['hash1'], 'abc');
      expect(res1).toBeNull();

      const res2 = await tryConsumeBackupCode(undefined, '1234567890abcdef');
      expect(res2).toBeNull();

      const res3 = await tryConsumeBackupCode([], '1234567890abcdef');
      expect(res3).toBeNull();
    });

    it('retorna null se nenhum hash bater com o código fornecido', async () => {
      bcrypt.compare = jest.fn().mockResolvedValue(false);
      const resMatch = await tryConsumeBackupCode(['h1', 'h2'], '1234-5678-90ab-cdef');
      expect(resMatch).toBeNull();
    });

    it('remove e retorna lista atualizada se o código bater com um dos hashes', async () => {
      bcrypt.compare = jest.fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true); // bate com h2

      const resMatch = await tryConsumeBackupCode(['h1', 'h2', 'h3'], '1234-5678-90ab-cdef');
      expect(resMatch).toEqual(['h1', 'h3']);
    });
  });

  describe('ragTrilhaContext.buscarContextoRagTrilha - Branches', () => {
    it('retorna string vazia se matéria estiver em branco', async () => {
      const out = await buscarContextoRagTrilha('   ');
      expect(out).toBe('');
    });

    it('trata trilhas com descrições longas (>1000 chars) e fases detalhadas', async () => {
      const longDesc = 'A'.repeat(1200);
      const longContent = 'C'.repeat(700);
      const trilhaMock = {
        _id: 't1',
        titulo: 'Trilha Teste',
        materia: 'Matemática',
        dificuldade: 'Facil',
        descricao: longDesc,
      };
      const faseMock = {
        ordem: 1,
        titulo: 'Fase 1',
        descricao: 'Desc da fase',
        conteudo: longContent,
        perguntas: [
          { enunciado: 'Pergunta 1?', alternativas: ['A', 'B'], respostaCorreta: 'A' },
        ],
      };

      const selectTrilha = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([trilhaMock]),
      };
      Trilha.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue(selectTrilha),
      });

      const selectFase = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([faseMock]),
      };
      Fase.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue(selectFase),
      });

      const out = await buscarContextoRagTrilha('Matemática');
      expect(out).toContain('Trilha de referência: "Trilha Teste"');
      expect(out).toContain('Conteúdo (trecho):');
      expect(out).toContain('...');
    });
  });

  describe('authMiddleware.verificarTokenOpcional - Branches', () => {
    it('chama next() sem alterar req.user se authorization ausente', async () => {
      req.headers = {};
      const next = jest.fn();
      await verificarTokenOpcional(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({ _id: 'u123', email: 'user@test.com', tipoUsuario: 'ALUNO' });
    });

    it('decodifica token válido e define req.user', async () => {
      req.headers = { authorization: 'Bearer valid_jwt_token' };
      const next = jest.fn();
      jwt.verify = jest.fn().mockReturnValue({ id: 'u_decoded_id' });
      const foundUser = { _id: 'u_decoded_id', nome: 'Logado' };
      User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(foundUser) });

      await verificarTokenOpcional(req, res, next);
      expect(req.user).toBe(foundUser);
      expect(next).toHaveBeenCalled();
    });

    it('ignora erro silenciosamente se jwt.verify falhar', async () => {
      req.headers = { authorization: 'Bearer expired_token' };
      const next = jest.fn();
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Token expirado');
      });

      await verificarTokenOpcional(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('scoreController.adicionarXPInterno - Branches', () => {
    it('lança erro se xpGanho for indefinido ou negativo', async () => {
      await expect(adicionarXPInterno('u1', undefined)).rejects.toThrow('maior ou igual a 0');
      await expect(adicionarXPInterno('u1', -10)).rejects.toThrow('maior ou igual a 0');
    });

    it('executa caminho fallback se Score.findOneAndUpdate não for função', async () => {
      const origFindOneAndUpdate = Score.findOneAndUpdate;
      delete Score.findOneAndUpdate;

      const validId = '507f1f77bcf86cd799439011';
      Score.findOne = jest.fn().mockResolvedValue(null);
      Score.create = jest.fn().mockResolvedValue({
        userId: validId,
        xpTotal: 50,
        save: jest.fn().mockResolvedValue(true),
      });

      const resScore = await adicionarXPInterno(validId, 50);
      expect(resScore.xpTotal).toBe(50);

      Score.findOneAndUpdate = origFindOneAndUpdate;
    });
  });

  describe('errorHandler & appLogger - Branches', () => {
    it('trata erro padrão sem mensagem e ValidationError sem errors', () => {
      const next = jest.fn();
      const errVal = { name: 'ValidationError', errors: null };
      errorHandler(errVal, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);

      const errDefault = { name: 'CustomError', message: '' };
      errorHandler(errDefault, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Ocorreu um erro interno no servidor.' }));
    });

    it('envia stack trace se NODE_ENV for development', () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const err = new Error('Dev error');
      const next = jest.fn();

      errorHandler(err, req, res, next);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ stack: expect.any(String) }));
      process.env.NODE_ENV = prevEnv;
    });

    it('cobre appLogger.debug e logHandledError com tipo string', () => {
      expect(() => appLogger.debug('Debug message', { debug: true })).not.toThrow();
      expect(() => logHandledError('test_context', 'erro em formato string', { extra: 1 })).not.toThrow();
    });
  });
});
