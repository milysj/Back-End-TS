// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

jest.mock('../services/emailVerificationService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

import * as faseController from '../controllers/faseController';
import * as feedbackController from '../controllers/feedbackController';
import * as licaoSalvaController from '../controllers/licaoSalvaController';
import * as perguntaController from '../controllers/perguntaController';
import * as userController from '../controllers/userController';
import * as homeController from '../controllers/homeController';
import * as progressoController from '../controllers/progressoController';
import * as authController from '../controllers/authController';
import { verificarToken, verificarProfessor, verificarAdministrador } from '../middlewares/authMiddleware';
import { errorHandler } from '../middlewares/errorHandler';
import * as rankingController from '../controllers/rankingController';
import * as secaoController from '../controllers/secaoController';
import * as trilhaController from '../controllers/trilhaController';

import Fase from '../models/fase';
import Trilha from '../models/trilha';
import Secao from '../models/secao';
import Feedback from '../models/feedback';
import bcrypt from 'bcryptjs';
import LicaoSalva from '../models/licaoSalva';
import ResetToken from '../models/resetToken';
import Progresso from '../models/progresso';
import User from '../models/user';
import * as twoFactorPendingToken from '../utils/twoFactorPendingToken';

const oid = '507f1f77bcf86cd799439011';

beforeEach(() => {
  jest.resetAllMocks();
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
});

describe('faseController', () => {
  it('criarFase returns 400 if trilhaId missing', async () => {
    const req = { body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.criarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('listarFases returns list', async () => {
    const sortMock = jest.fn().mockResolvedValue(['f1']);
    const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
    Fase.find = jest.fn().mockImplementation(() => { return { populate: populateMock }; });
    const req = { query: {} };
    const res = { json: jest.fn() };
    await faseController.listarFases(req, res);
    expect(res.json).toHaveBeenCalledWith(['f1']);
  });

  it('buscarFasePorId returns 404 when not found', async () => {
    Fase.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const req = { params: { id: '507f1f77bcf86cd799439011' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.buscarFasePorId(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('feedbackController', () => {
  it('criarFeedback invalid type returns 400', async () => {
    const req = { body: { tipo: 'x', avaliacao: 3 } }; const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await feedbackController.criarFeedback(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('listarFeedbacks non-admin returns 403', async () => {
    const req = { user: { tipoUsuario: 'ALUNO' } }; const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await feedbackController.listarFeedbacks(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('licaoSalvaController', () => {
  it('salvarTrilha missing trilhaId returns 400', async () => {
    const req = { user: { _id: 'u1' }, body: {} }; const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await licaoSalvaController.salvarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('removerTrilhaSalva not found returns 404', async () => {
    LicaoSalva.findOneAndDelete = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: '507f1f77bcf86cd799439011' }, params: { trilhaId: '507f1f77bcf86cd799439011' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await licaoSalvaController.removerTrilhaSalva(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('perguntaController', () => {
  it('listarPerguntasPorFase missing faseId returns 400', async () => {
    const req = { params: {} }; const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.listarPerguntasPorFase(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('criarPergunta missing fields returns 400', async () => {
    const req = { user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' }, body: {} }; const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.criarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('progressoController', () => {
  it('calcularXP works', () => {
    expect(progressoController.calcularXP(50)).toBe(250);
  });
  it('verificarProgresso missing returns false', async () => {
    Progresso.findOne = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: '507f1f77bcf86cd799439011' }, params: { faseId: '507f1f77bcf86cd799439011' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await progressoController.verificarProgresso(req, res);
    expect(res.json).toHaveBeenCalledWith({ completado: false, progresso: null, respostasSalvas: [], perguntasRespondidas: [] });
  });
  it('obterProgressoTrilha missing trilhaId returns 400', async () => {
    const req = { user: { _id: 'u1' }, params: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.obterProgressoTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('rankingController', () => {
  it('obterRanking returns list', async () => {
    Progresso.aggregate = jest.fn().mockResolvedValue([{ _id: 'u1', username: 'x', totalFases: 1, totalAcertos: 1, totalPerguntas: 1, mediaAcertos: 100 }]);
    const req = {};
    const res = { json: jest.fn() };
    await rankingController.obterRanking(req, res);
    expect(res.json).toHaveBeenCalled();
  });
  it('obterRanking returns list with nome fallback and position', async () => {
    Progresso.aggregate = jest.fn().mockResolvedValue([{ _id: 'u1', nome: 'N', totalFases: 1, totalAcertos: 1, totalPerguntas: 1, mediaAcertos: 50 }]);
    const req = {};
    const res = { json: jest.fn() };
    await rankingController.obterRanking(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ position: 1, name: 'N' })]));
  });
  it('obterRankingNivel no users returns []', async () => {
    const selectMock = jest.fn().mockResolvedValue([]);
    User.find = jest.fn().mockReturnValue({ select: selectMock });
    const req = { headers: {} };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await rankingController.obterRankingNivel(req, res);
    expect(res.json).toHaveBeenCalledWith([]);
  });
  it('obterRankingNivel handles score service error and returns defaults', async () => {
    const selectMock = jest.fn().mockResolvedValue([{ _id: 'u1', username: 'user', nome: 'User', personagem: 'Mago', fotoPerfil: '/x' }]);
    User.find = jest.fn().mockReturnValue({ select: selectMock });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: jest.fn() });
    const req = { headers: {} };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await rankingController.obterRankingNivel(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ nivel: 1, xpTotal: 0 })]));
  });
  it('obterRankingNivel uses score service data and sorts by nivel', async () => {
    const selectMock = jest.fn().mockResolvedValue([
      { _id: 'u1', username: 'u1', personagem: 'P', fotoPerfil: '/x' },
      { _id: 'u2', nome: 'User2', personagem: 'P2', fotoPerfil: '/y' },
    ]);
    User.find = jest.fn().mockReturnValue({ select: selectMock });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue([
      { userId: 'u1', xpTotal: 100, nivel: 3 },
      { userId: 'u2', xpTotal: 50, nivel: 2 }
    ]) });
    const req = { headers: {} };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await rankingController.obterRankingNivel(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ _id: 'u1', nivel: 3 }), expect.objectContaining({ _id: 'u2', nivel: 2 })]));
  });
});

describe('perguntaController full coverage', () => {
  it('listarSecoes invalid id returns 400', async () => {
    const req = { query: { trilhaId: 'x' } }; const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.listarSecoes(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('buscarSecoesPorTrilha trilha not found returns 404', async () => {
    Trilha.findById = jest.fn().mockResolvedValue(null);
    const req = { params: { trilhaId: '507f1f77bcf86cd799439011' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.buscarSecoesPorTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('trilhaController', () => {
  it('trilhasPopulares returns set', async () => {
    const limitMock = jest.fn().mockResolvedValue([{}]);
    const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
    const selectMock = jest.fn().mockReturnValue({ sort: sortMock });
    Trilha.find = jest.fn().mockImplementation(() => { return { select: selectMock }; });
    const req = {};
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await trilhaController.trilhasPopulares(req, res);
    expect(res.json).toHaveBeenCalledWith([{}]);
  });
  it('visualizarTrilha invalid id returns 400', async () => {
    const req = { params: { id: 'x' } }; const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.visualizarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('criarTrilha returns 201 for valid body', async () => {
    Trilha.prototype.save = jest.fn().mockResolvedValue(undefined);
    Trilha.prototype.toObject = jest.fn().mockReturnValue({ _id: 'id', titulo: 'x', descricao: 'd', materia: 'm', usuariosIniciaram: [] });
    const req = { user: { _id: 'u1' }, body: { titulo: 'x', descricao: 'd', materia: 'm' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.criarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
  it('listarTrilhas returns list for admin and regular', async () => {
    const sortMock = jest.fn().mockResolvedValue(['t1']);
    const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
    const selectMock = jest.fn().mockReturnValue({ populate: populateMock, sort: sortMock });
    Trilha.find = jest.fn().mockReturnValue({ select: selectMock, sort: sortMock });
    const req = { user: { _id: 'u2', tipoUsuario: 'ALUNO' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await trilhaController.listarTrilhas(req, res);
    expect(res.json).toHaveBeenCalledWith(['t1']);
  });
  it('buscarTrilhaPorId invalid id returns 400', async () => {
    const req = { params: { id: 'x' }, user: { tipoUsuario: 'ALUNO' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.buscarTrilhaPorId(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('trilhasNovidades and trilhasContinue return list', async () => {
    const limitMock = jest.fn().mockResolvedValue(['t']);
    const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
    const selectMock = jest.fn().mockReturnValue({ sort: sortMock });
    Trilha.find = jest.fn().mockReturnValue({ select: selectMock, sort: sortMock, limit: limitMock });
    const req1 = { user: { _id: 'u1' } };
    const req2 = { user: { _id: 'u1' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await trilhaController.trilhasNovidades(req1, res);
    await trilhaController.trilhasContinue(req2, res);
    expect(res.json).toHaveBeenCalledTimes(2);
  });
});

describe('faseController extra coverage', () => {
  it('buscarFasesPorTrilha returns 404 if trilha missing', async () => {
    Trilha.findById = jest.fn().mockResolvedValue(null);
    const req = { params: { trilhaId: '507f1f77bcf86cd799439011' } }; const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.buscarFasesPorTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it('buscarFasesPorSecao invalid id returns 400', async () => {
    const req = { params: { secaoId: 'x' } }; const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.buscarFasesPorSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('perguntaController full coverage', () => {
  it('listarPerguntasPorFase found returns list', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ perguntas: ['p1'] });
    const req = { params: { faseId: '507f1f77bcf86cd799439011' } }; const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.listarPerguntasPorFase(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it('atualizarPergunta returns 404 if fase missing', async () => {
    Fase.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' }, params: { faseId: '507f1f77bcf86cd799439011', perguntaIndex: '0' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.atualizarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it('atualizarPergunta success updates pergunta and returns 200', async () => {
    const faseMock: object = { trilhaId: 't1', perguntas: [{ enunciado: 'a', alternativas: ['x','y'], respostaCorreta: '0' }], save: jest.fn().mockResolvedValue(true) };
    Fase.findById = jest.fn().mockResolvedValue(faseMock);
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { faseId: 'f1', perguntaIndex: '0' }, body: { enunciado: 'b', alternativas: ['x','y'], respostaCorreta: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.atualizarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it('deletarPergunta success deletes pergunta and returns 200', async () => {
    const faseMock: object = { trilhaId: 't1', perguntas: [{ enunciado: 'a', alternativas: ['x','y'], respostaCorreta: '0' }], save: jest.fn().mockResolvedValue(true) };
    Fase.findById = jest.fn().mockResolvedValue(faseMock);
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { faseId: 'f1', perguntaIndex: '0' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.deletarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('feedbackController extra', () => {
  it('criarFeedback valid returns 201', async () => {
    Feedback.create = jest.fn().mockResolvedValue({ _id: '1', tipo: 'bug', avaliacao: 5, sugestao: '', data: new Date() });
    const req = { body: { tipo: 'bug', avaliacao: 5 }, user: { _id: 'u1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await feedbackController.criarFeedback(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
  it('listarFeedbacks returns list for admin', async () => {
    const chain = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue(['f']) };
    Feedback.find = jest.fn().mockReturnValue(chain);
    const req = { user: { tipoUsuario: 'ADMINISTRADOR' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await feedbackController.listarFeedbacks(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('secaoController coverage', () => {
  it('buscarSecaoPorId invalid id returns 400', async () => {
    const req = { params: { id: 'x' } }; const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.buscarSecaoPorId(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('criarSecao returns 400 missing fields', async () => {
    const req = { user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' }, body: {} }; const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.criarSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('userController coverage', () => {
  it('loginUser returns 400 if missing', async () => {
    const req = { body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), cookie: jest.fn() };
    await userController.loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('loginUser invalid credentials returns 401', async () => {
    User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { body: { email: 'x@x.com', senha: '12345678' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), cookie: jest.fn() };
    await userController.loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
  it('loginUser allows unverified user while email verification is off', async () => {
    User.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'id',
        email: 'x@x.com',
        senha: '$2a$10$abc',
        tipoUsuario: 'ALUNO',
        isVerified: false,
        twoFactorEnabled: false,
      }),
    });
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    const req = { body: { email: 'x@x.com', senha: '12345678' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), cookie: jest.fn() };
    process.env.JWT_SECRET = 'secret';
    await userController.loginUser(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
  it('registerUser rejects invalid terms', async () => {
    const req = { body: { email: 'x@x.com', dataNascimento: '2000-01-01', senha: '12345678', aceiteTermos: false } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('registerUser returns 409 on existing email', async () => {
    User.findOne = jest.fn().mockResolvedValue({});
    const req = { body: { email: 'x@x.com', dataNascimento: '2000-01-01', senha: '12345678', aceiteTermos: true } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
  it('registerUser creates user successfully', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    bcrypt.hash = jest.fn().mockResolvedValue('hashed');
    const usuarioSave = jest.fn().mockResolvedValue(null);
    User.prototype.save = usuarioSave;
    const req = { body: { nome: 'x', email: 'x@x.com', senha: '12345678', dataNascimento: '2000-01-01', aceiteTermos: true } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
  it('criarPerfil invalid returns 400', async () => {
    const req = { user: { _id: 'u1' }, body: { username: '', personagem: '', fotoPerfil: '' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.criarPerfil(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('buscarMeusDados not found returns 404', async () => {
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { user: { _id: 'u1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.buscarMeusDados(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it('atualizarTema invalid returns 400', async () => {
    const req = { user: { _id: 'u1' }, body: { tema: 'invalid' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.atualizarTema(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('obterTermos returns terms', () => {
    const req = {};
    const res = { json: jest.fn() };
    userController.obterTermos(req, res);
    expect(res.json).toHaveBeenCalled();
  });
  it('verificarTokenReset returns valid false', async () => {
    ResetToken.findOne = jest.fn().mockResolvedValue(null);
    const req = { params: { token: 'x' } };
    const res = { json: jest.fn() };
    await userController.verificarTokenReset(req, res);
    expect(res.json).toHaveBeenCalledWith({ valid: false });
  });
  it('confirmarEmail missing token returns 400', async () => {
    const req = { query: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), redirect: jest.fn() };
    await userController.confirmarEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('controllers extended coverage', () => {
  it('homeController getHomeData error returns 500', async () => {
    User.find = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }) });
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await homeController.getHomeData(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
  it('faseController concluirFase invalid faseId returns 400', async () => {
    const req = { user: { _id: 'u1' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.concluirFase(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('faseController atualizarFase not found returns 404', async () => {
    Fase.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' }, params: { id: '507f1f77bcf86cd799439011' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.atualizarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it('faseController deletarFase not found returns 404', async () => {
    Fase.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' }, params: { id: '507f1f77bcf86cd799439011' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.deletarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it('progressoController salvarResultado invalid returns 400', async () => {
    const req = { user: { _id: 'u1' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.salvarResultado(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('progressoController salvarResposta invalid returns 400', async () => {
    const req = { user: { _id: 'u1' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.salvarResposta(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('trilhaController atualizarTrilha invalid id returns 400', async () => {
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: 'x' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.atualizarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('trilhaController deletarTrilha invalid id returns 400', async () => {
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: 'x' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.deletarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('trilhaController iniciarTrilha invalid id returns 400', async () => {
    const req = { user: { _id: 'u1' }, params: { trilhaId: 'x' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.iniciarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('trilhaController buscarTrilhas returns list', async () => {
    const sortMock = jest.fn().mockResolvedValue(['t1']);
    const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
    const findMock = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ populate: populateMock }) });
    Trilha.find = findMock;
    const req = { query: { q: 'x' }, user: { tipoUsuario: 'ALUNO' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await trilhaController.buscarTrilhas(req, res);
    expect(res.json).toHaveBeenCalledWith(['t1']);
  });
  it('secaoController buscarSecaoPorId returns 404 when not found', async () => {
    Secao.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const req = { params: { id: '507f1f77bcf86cd799439011' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.buscarSecaoPorId(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it('perguntaController deletarPergunta returns 404 if fase missing', async () => {
    Fase.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' }, params: { faseId: '507f1f77bcf86cd799439011', perguntaIndex: '0' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.deletarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it('licaoSalvaController listarTrilhasSalvas returns list', async () => {
    LicaoSalva.find = jest.fn().mockReturnValue({ populate: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue([{ trilha: { titulo: 'x' } }]) });
    const req = { user: { _id: 'u1' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await licaoSalvaController.listarTrilhasSalvas(req, res);
    expect(res.json).toHaveBeenCalled();
  });
  it('licaoSalvaController verificarSeSalva returns false', async () => {
    LicaoSalva.findOne = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1' }, params: { trilhaId: '507f1f77bcf86cd799439011' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await licaoSalvaController.verificarSeSalva(req, res);
    expect(res.json).toHaveBeenCalledWith({ salva: false });
  });
});

describe('additional controller coverage', () => {
  it('faseController criarFase returns 404 when trilha not found', async () => {
    Trilha.findById = jest.fn().mockResolvedValue(null);
    const req = { body: { trilhaId: '507f1f77bcf86cd799439011', ordem: 1 } , user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.criarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('faseController buscarFasesPorSecao returns 404 when section not found', async () => {
    Secao.findById = jest.fn().mockResolvedValue(null);
    const req = { params: { secaoId: '507f1f77bcf86cd799439011' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.buscarFasesPorSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('faseController atualizarFase returns 403 when user lacks permission', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: '507f1f77bcf86cd799439011' });
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'other' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: '507f1f77bcf86cd799439011' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.atualizarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('trilhaController atualizarTrilha returns 404 when not found', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({ imagem: '/img/fases/vila.jpg' });
    Trilha.findOneAndUpdate = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: '507f1f77bcf86cd799439011' }, body: { titulo: 'x' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.atualizarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('trilhaController deletarTrilha returns 404 when not found', async () => {
    Trilha.findOneAndDelete = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: '507f1f77bcf86cd799439011' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.deletarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('trilhaController iniciarTrilha returns 404 when trilha not found', async () => {
    Trilha.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1' }, params: { trilhaId: '507f1f77bcf86cd799439011' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.iniciarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('trilhaController visualizarTrilha returns 200 when found', async () => {
    Trilha.findByIdAndUpdate = jest.fn().mockResolvedValue({ visualizacoes: 1 });
    const req = { params: { id: '507f1f77bcf86cd799439011' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await trilhaController.visualizarTrilha(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Visualização registrada', visualizacoes: 1 });
  });

  it('userController atualizarPersonagem invalid returns 400', async () => {
    const req = { user: { _id: 'u1' }, body: { personagem: 'x' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.atualizarPersonagem(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('userController atualizarPersonagem success returns 200', async () => {
    User.findByIdAndUpdate = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'u1', personagem: 'Mago' }) });
    const req = { user: { _id: 'u1' }, body: { personagem: 'Mago', fotoPerfil: '/img.png' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await userController.atualizarPersonagem(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Personagem atualizado.', usuario: { _id: 'u1', personagem: 'Mago' } });
  });

  it('userController atualizarIdioma invalid returns 400', async () => {
    const req = { user: { _id: 'u1' }, body: { idioma: 'pt' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.atualizarIdioma(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('userController excluirConta missing senha returns 400', async () => {
    const req = { user: { _id: 'u1' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.excluirConta(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('userController excluirConta not found returns 404', async () => {
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { user: { _id: 'u1' }, body: { senha: '12345678' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.excluirConta(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('userController listarUsuarios returns list', async () => {
    User.find = jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue([{ _id: 'u1' }]) });
    const req = {};
    const res = { json: jest.fn() };
    await userController.listarUsuarios(req, res);
    expect(res.json).toHaveBeenCalledWith([{ _id: 'u1' }]);
  });

  it('userController verificarAutenticacao returns authenticated', () => {
    const req = { user: { _id: 'u1' } };
    const res = { json: jest.fn() };
    userController.verificarAutenticacao(req, res);
    expect(res.json).toHaveBeenCalledWith({ authenticated: true, userId: 'u1' });
  });

  it('userController redefinirSenha missing returns 400', async () => {
    const req = { body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.redefinirSenha(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('userController mudarSenha missing fields returns 400', async () => {
    const req = { user: { _id: 'u1' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.mudarSenha(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('userController mudarSenha user not found returns 404', async () => {
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { user: { _id: 'u1' }, body: { senhaAtual: 'old', novaSenha: 'newpassword' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.mudarSenha(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('userController mudarSenha invalid current password returns 401', async () => {
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ senha: 'hash' }) });
    bcrypt.compare = jest.fn().mockResolvedValue(false);
    const req = { user: { _id: 'u1' }, body: { senhaAtual: 'old', novaSenha: 'newpassword' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.mudarSenha(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('secaoController atualizarSecao invalid id returns 400', async () => {
    const req = { user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' }, params: { id: 'x' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.atualizarSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('secaoController deletarSecao invalid id returns 400', async () => {
    const req = { user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' }, params: { id: 'x' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.deletarSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('secaoController deletarSecao without permission returns 403', async () => {
    Secao.findById = jest.fn().mockResolvedValue({ trilhaId: 't1' });
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'other' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: '507f1f77bcf86cd799439011' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.deletarSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('secaoController atualizarSecao success returns 200', async () => {
    Secao.findById = jest.fn().mockResolvedValue({ trilhaId: 't1', ordem: 1, titulo: 'x', descricao: 'd' });
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1' });
    Secao.findOne = jest.fn().mockResolvedValue(null);
    Secao.findByIdAndUpdate = jest.fn().mockResolvedValue({ _id: 's1', titulo: 'x2' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: '507f1f77bcf86cd799439011' }, body: { titulo: 'x2', ordem: 2 } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await secaoController.atualizarSecao(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Seção atualizada com sucesso!' }));
  });

  it('secaoController deletarSecao success returns message', async () => {
    Secao.findById = jest.fn().mockResolvedValue({ trilhaId: 't1' });
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1' });
    Secao.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: 's1' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: '507f1f77bcf86cd799439011' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await secaoController.deletarSecao(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Seção deletada com sucesso' });
  });

  it('perguntaController atualizarPergunta invalid index returns 404', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ perguntas: [] });
    const req = { user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' }, params: { faseId: '507f1f77bcf86cd799439011', perguntaIndex: '100' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.atualizarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('perguntaController deletarPergunta invalid index returns 404', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ perguntas: [] });
    const req = { user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' }, params: { faseId: '507f1f77bcf86cd799439011', perguntaIndex: '100' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.deletarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('progressoController obterDadosUsuario not found returns 404', async () => {
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { user: { _id: 'u1' }, headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.obterDadosUsuario(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('progressoController salvarResultado fase not found returns 404', async () => {
    Fase.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1' }, body: { faseId: '507f1f77bcf86cd799439011', pontuacao: 1, totalPerguntas: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.salvarResultado(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('homeController getHomeData returns data', async () => {
    const chain = { select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    Trilha.find = jest.fn().mockReturnValue(chain);
    const req = { user: { _id: 'u1', nome: 'N', materiaFavorita: 'M', personagem: 'P', fotoPerfil: '/x' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await homeController.getHomeData(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});

describe('deeper controller coverage', () => {
  it('authController login returns 401 when user not found', async () => {
    User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { body: { email: 'x@x.com', senha: '1234' }, headers: {}, cookies: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), cookie: jest.fn() };
    await authController.loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('authController login succeeds with valid user', async () => {
    const fakeUser = { _id: 'u1', nome: 'N', email: 'x@x.com', tipoUsuario: 'ALUNO', senha: 'hash' };
    User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    const req = { body: { email: 'x@x.com', senha: '1234' }, headers: {}, cookies: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), cookie: jest.fn() };
    process.env.JWT_SECRET = 'secret';
    await authController.loginUser(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it('licaoSalvaController salvarTrilha handles duplicate save', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({});
    LicaoSalva.findOne = jest.fn().mockResolvedValue({});
    const req = { user: { _id: 'u1' }, body: { trilhaId: 't1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await licaoSalvaController.salvarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('licaoSalvaController salvarTrilha returns 201 on success', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({});
    LicaoSalva.findOne = jest.fn().mockResolvedValue(null);
    LicaoSalva.create = jest.fn().mockResolvedValue({ _id: 'ls1' });
    const req = { user: { _id: 'u1' }, body: { trilhaId: 't1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await licaoSalvaController.salvarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('feedbackController criarFeedback valid branch returns 201', async () => {
    Feedback.create = jest.fn().mockResolvedValue({ _id: 'f1', tipo: 'bug', avaliacao: 5, sugestao: '' });
    const req = { body: { tipo: 'bug', avaliacao: 4 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await feedbackController.criarFeedback(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rankingController obterRanking returns position in list', async () => {
    Progresso.aggregate = jest.fn().mockResolvedValue([{ _id: 'u1', username: 'u1', nome: 'u1', totalFases: 1, totalAcertos: 1, totalPerguntas: 1, mediaAcertos: 100 }]);
    const req = {};
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await rankingController.obterRanking(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it('rankingController obterRankingNivel returns [] for no users', async () => {
    User.find = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    const req = { headers: {} };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await rankingController.obterRankingNivel(req, res);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('progressoController salvarResposta creates progress when none exists', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ perguntas: [{ respostaCorreta: '0' }], trilhaId: 't1' });
    Progresso.findOne = jest.fn().mockResolvedValue(null);
    Progresso.create = jest.fn().mockResolvedValue({ perguntasRespondidas: [], respostasUsuario: [], pontuacao: 0, totalPerguntas: 1, porcentagemAcertos: 0, save: jest.fn() });
    const req = { user: { _id: 'u1' }, body: { faseId: 'f1', perguntaIndex: 0, resposta: 0 } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await progressoController.salvarResposta(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Resposta salva com sucesso', progresso: expect.any(Object) }));
  });

  it('progressoController obterProgressoTrilha returns progresso map', async () => {
    Progresso.find = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([{ faseId: 'f1', concluido: true }]) });
    const req = { user: { _id: 'u1' }, params: { trilhaId: 't1' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await progressoController.obterProgressoTrilha(req, res);
    expect(res.json).toHaveBeenCalledWith({ progresso: { 'f1': true } });
  });

  it('trilhaController buscarTrilhas filters by materia and q', async () => {
    Trilha.find = jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), populate: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue([{}]) });
    const req = { query: { q: 'x', materia: 'Math' }, user: { tipoUsuario: 'ALUNO' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await trilhaController.buscarTrilhas(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it('secaoController criarSecao returns 403 when user differs', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'other' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, body: { trilhaId: '507f1f77bcf86cd799439011', titulo: 't', ordem: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.criarSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('faseController concluirFase successes when existing progress', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ perguntas: [{}, {}], trilhaId: 't1' });
    Progresso.findOne = jest.fn().mockResolvedValue({ pontuacao: 0, totalPerguntas: 0, porcentagemAcertos: 0, xpGanho: 0, concluido: false, save: jest.fn() });
    const req = { user: { _id: 'u1' }, body: { faseId: 'f1', pontuacao: 1, acertos: 1 } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await faseController.concluirFase(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});

describe('cover remaining controller and middleware paths', () => {
  it('faseController criarFase success returns 201', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1' });
    Secao.findById = jest.fn().mockResolvedValue({ trilhaId: 't1' });
    Fase.create = jest.fn().mockResolvedValue({ _id: 'f1' });
    Fase.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue({ _id: 'f1' }) });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, body: { trilhaId: 't1', secaoId: '507f1f77bcf86cd799439011', titulo: 't', descricao: 'd', ordem: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.criarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('faseController buscarFasePorId success returns data', async () => {
    Fase.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue({ _id: 'f1' }) });
    const req = { params: { id: 'f1' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await faseController.buscarFasePorId(req, res);
    expect(res.json).toHaveBeenCalledWith({ _id: 'f1' });
  });

  it('faseController deletarFase success returns message', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't1' });
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1' });
    Fase.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: 'f1' });
    Progresso.deleteMany = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: 'f1' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await faseController.deletarFase(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Fase deletada com sucesso' });
  });

  it('userController loginUser success returns token', async () => {
    User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'u1', email: 'x@x.com', senha: 'hash', tipoUsuario: 'ALUNO', isVerified: true, twoFactorEnabled: false }) });
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    process.env.JWT_SECRET = 'secret';
    const req = { body: { email: 'x@x.com', senha: '12345678' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), cookie: jest.fn() };
    await userController.loginUser(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('userController registerUser admin returns 403', async () => {
    const req = { body: { email: 'x@x.com', dataNascimento: '2000-01-01', senha: '12345678', aceiteTermos: true, tipoUsuario: 'ADMINISTRADOR' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('userController criarPerfil success returns 200', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    User.findByIdAndUpdate = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'u1', username: 'user', personagem: 'Mago' }) });
    const req = { user: { _id: 'u1' }, body: { username: 'user', personagem: 'Mago', fotoPerfil: '/img.png' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await userController.criarPerfil(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Perfil criado com sucesso!' }));
  });

  it('userController buscarMeusDados success returns user', async () => {
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'u1' }) });
    const req = { user: { _id: 'u1' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await userController.buscarMeusDados(req, res);
    expect(res.json).toHaveBeenCalledWith({ _id: 'u1' });
  });

  it('userController atualizarDadosPessoais success returns message', async () => {
    User.findByIdAndUpdate = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'u1' }) });
    const req = { user: { _id: 'u1' }, body: { nome: 'N' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await userController.atualizarDadosPessoais(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Dados atualizados com sucesso!' }));
  });

  it('userController mudarSenha success returns message', async () => {
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ senha: 'hash', save: jest.fn() }) });
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    bcrypt.hash = jest.fn().mockResolvedValue('newhash');
    const req = { user: { _id: 'u1' }, body: { senhaAtual: 'old', novaSenha: 'newpassword' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await userController.mudarSenha(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Senha alterada com sucesso!' });
  });

  it('userController confirmarEmail success redirects', async () => {
    User.findOne = jest.fn().mockResolvedValue({ isVerified: false, verificationToken: 't', tokenExpires: new Date(), save: jest.fn() });
    const req = { query: { token: 't' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), redirect: jest.fn() };
    await userController.confirmarEmail(req, res);
    expect(res.redirect).toHaveBeenCalled();
  });

  it('authMiddleware verificarToken returns 401 if missing token', async () => {
    const req = { headers: {}, cookies: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await verificarToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('authMiddleware verificarProfessor returns 403 for non-professor', () => {
    const req = { user: { tipoUsuario: 'ALUNO' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    verificarProfessor(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('authMiddleware verificarAdministrador returns 403 for non-admin', () => {
    const req = { user: { tipoUsuario: 'ALUNO' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    verificarAdministrador(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('errorHandler handles ValidationError', () => {
    const err = { name: 'ValidationError', errors: { field: { message: 'bad' } } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err as any, {} as any, res as any, {} as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('errorHandler handles JsonWebTokenError', () => {
    const err = { name: 'JsonWebTokenError', message: 'bad' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err as any, {} as any, res as any, {} as any);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('perguntaController criarPergunta missing fields returns 400', async () => {
    const req = { user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' }, body: { faseId: 'f1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.criarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('perguntaController criarPergunta fase not found returns 404', async () => {
    Fase.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' }, body: { faseId: 'f1', enunciado: 'x', alternativas: ['a','b'], respostaCorreta: 0 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.criarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('perguntaController criarPergunta unauthorized returns 403', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't1', perguntas: [] });
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'other' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, body: { faseId: 'f1', enunciado: 'x', alternativas: ['a','b'], respostaCorreta: 0 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.criarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('secaoController buscarSecoesPorTrilha returns list', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({ _id: 't1' });
    Secao.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: 's1' }]) });
    const req = { params: { trilhaId: '507f1f77bcf86cd799439011' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await secaoController.buscarSecoesPorTrilha(req, res);
    expect(res.json).toHaveBeenCalledWith([{ _id: 's1' }]);
  });

  it('secaoController criarSecao success returns 201', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1' });
    Secao.findOne = jest.fn().mockResolvedValue(null);
    Secao.create = jest.fn().mockResolvedValue({ _id: 's1' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, body: { trilhaId: '507f1f77bcf86cd799439011', titulo: 'titulo', ordem: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.criarSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('progressoController salvarResultado concluded progress returns 400', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't1' });
    Progresso.findOne = jest.fn().mockResolvedValue({ concluido: true });
    const req = { user: { _id: 'u1' }, body: { faseId: 'f1', pontuacao: 1, totalPerguntas: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.salvarResultado(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('progressoController salvarResultado success updates and returns xp', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't1' });
    Progresso.findOne = jest.fn().mockResolvedValue({ concluido: false, save: jest.fn(), respostasUsuario: [], perguntasRespondidas: [] });
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ xpTotal: 10 }) });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ score: { xpTotal: 20, nivel: 2 } }) });
    const req = { user: { _id: 'u1' }, body: { faseId: 'f1', pontuacao: 1, totalPerguntas: 1 }, headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.salvarResultado(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('progressoController salvarResultado quando score service rejeita com erro genérico ainda retorna 201', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't1' });
    Progresso.findOne = jest.fn().mockResolvedValue({ concluido: false, save: jest.fn(), respostasUsuario: [], perguntasRespondidas: [] });
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ xpTotal: 10 }) });
    global.fetch = jest.fn().mockRejectedValue(new Error('erro de rede genérico'));
    const req = { user: { _id: 'u1' }, body: { faseId: 'f1', pontuacao: 1, totalPerguntas: 1 }, headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.salvarResultado(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('progressoController salvarResultado cria progresso quando findOne retorna null', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't1' });
    Progresso.findOne = jest.fn().mockResolvedValue(null);
    Progresso.create = jest.fn().mockResolvedValue({ _id: 'p1' });
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ xpTotal: 10 }) });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ score: { xpTotal: 20, nivel: 2 } }) });
    const req = { user: { _id: 'u1' }, body: { faseId: 'f1', pontuacao: 1, totalPerguntas: 1 }, headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.salvarResultado(req, res);
    expect(Progresso.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('progressoController obterDadosUsuario quando fetch pendente e timeout aborta (AbortError)', async () => {
    jest.useFakeTimers();
    try {
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ xpTotal: 5, toObject: () => ({ xpTotal: 5 }) }),
      });
      global.fetch = jest.fn().mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });
      const req = { user: { _id: 'u1' }, headers: {} };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
      const p = progressoController.obterDadosUsuario(req, res);
      await jest.advanceTimersByTimeAsync(5001);
      await p;
      expect(res.json).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('rankingController obterRankingNivel quando fetch rejeita erro genérico ainda responde', async () => {
    const selectMock = jest.fn().mockResolvedValue([{ _id: 'u1', username: 'u', nome: 'N', personagem: 'Mago', fotoPerfil: '/x' }]);
    User.find = jest.fn().mockReturnValue({ select: selectMock });
    global.fetch = jest.fn().mockRejectedValue(new Error('falha genérica'));
    const req = { headers: {} };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await rankingController.obterRankingNivel(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it('rankingController obterRankingNivel quando fetch pendente e timeout aborta (AbortError)', async () => {
    jest.useFakeTimers();
    try {
      const selectMock = jest.fn().mockResolvedValue([{ _id: 'u1', username: 'u', nome: 'N', personagem: 'Mago', fotoPerfil: '/x' }]);
      User.find = jest.fn().mockReturnValue({ select: selectMock });
      global.fetch = jest.fn().mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });
      const req = { headers: {} };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
      const p = rankingController.obterRankingNivel(req, res);
      await jest.advanceTimersByTimeAsync(5001);
      await p;
      expect(res.json).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('progressoController salvarResposta fase missing returns 404', async () => {
    Fase.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1' }, body: { faseId: 'f1', perguntaIndex: 0, resposta: 0 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.salvarResposta(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('faseController listarFases com trilhaId na query', async () => {
    Fase.find = jest.fn().mockReturnValue({ populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }) });
    const tid = '507f1f77bcf86cd799439011';
    const req = { query: { trilhaId: tid } };
    const res = { json: jest.fn() };
    await faseController.listarFases(req, res);
    expect(Fase.find).toHaveBeenCalledWith({ trilhaId: tid });
  });

  it('faseController buscarFasesPorTrilha 404 sem trilha', async () => {
    Trilha.findById = jest.fn().mockResolvedValue(null);
    const req = { params: { trilhaId: '507f1f77bcf86cd799439011' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.buscarFasesPorTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('faseController criarFase 403 quando não é dono nem admin', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'other', _id: 't1' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, body: { trilhaId: 't1', ordem: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.criarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('faseController criarFase 400 secaoId inválido', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1', _id: 't1' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, body: { trilhaId: 't1', secaoId: 'não-é-objectid', ordem: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.criarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('faseController criarFase 404 seção inexistente', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1', _id: 't1' });
    Secao.findById = jest.fn().mockResolvedValue(null);
    const sid = '507f1f77bcf86cd799439011';
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, body: { trilhaId: 't1', secaoId: sid, ordem: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.criarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('faseController criarFase 400 seção de outra trilha', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1', _id: 't1' });
    Secao.findById = jest.fn().mockResolvedValue({ trilhaId: 'outra' });
    const sid = '507f1f77bcf86cd799439011';
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, body: { trilhaId: 't1', secaoId: sid, ordem: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.criarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('faseController criarFase 404 trilha inexistente', async () => {
    Trilha.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, body: { trilhaId: 't1', ordem: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.criarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('faseController atualizarFase 404 fase inexistente', async () => {
    Fase.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: '507f1f77bcf86cd799439011' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.atualizarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('faseController atualizarFase 403 aluno não dono', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't0' });
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'other' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: 'f1' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.atualizarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('faseController atualizarFase 403 ao mover para trilha de outro usuário', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't0' });
    Trilha.findById = jest
      .fn()
      .mockResolvedValueOnce({ usuario: 'u1' })
      .mockResolvedValueOnce({ usuario: 'other' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: 'f1' }, body: { trilhaId: 't2' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.atualizarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('faseController deletarFase 404', async () => {
    Fase.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: '507f1f77bcf86cd799439011' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.deletarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('faseController deletarFase 403 aluno não dono', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't1' });
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'other' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: '507f1f77bcf86cd799439011' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.deletarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('faseController buscarFasesPorSecao 400 id inválido', async () => {
    const req = { params: { secaoId: 'bad' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.buscarFasesPorSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('faseController buscarFasesPorSecao 404 seção', async () => {
    Secao.findById = jest.fn().mockResolvedValue(null);
    const req = { params: { secaoId: '507f1f77bcf86cd799439011' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.buscarFasesPorSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('faseController concluirFase 400 id fase inválido', async () => {
    const req = { user: { _id: 'u1' }, body: { faseId: 'bad' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.concluirFase(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('faseController concluirFase 404 fase', async () => {
    Fase.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1' }, body: { faseId: '507f1f77bcf86cd799439011' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.concluirFase(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('faseController concluirFase cria progresso quando não existe', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't1', perguntas: [{}, {}] });
    Progresso.findOne = jest.fn().mockResolvedValue(null);
    Progresso.create = jest.fn().mockResolvedValue({ _id: 'p1' });
    const req = { user: { _id: 'u1' }, body: { faseId: '507f1f77bcf86cd799439011', acertos: 1 } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await faseController.concluirFase(req, res);
    expect(Progresso.create).toHaveBeenCalled();
  });

  it('faseController concluirFase atualiza progresso existente', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't1', perguntas: [] });
    const save = jest.fn();
    Progresso.findOne = jest.fn().mockResolvedValue({ pontuacao: 0, save });
    const req = { user: { _id: 'u1' }, body: { faseId: '507f1f77bcf86cd799439011', acertos: 0 } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await faseController.concluirFase(req, res);
    expect(save).toHaveBeenCalled();
  });
});

describe('controllers ~90% — userController', () => {
  afterEach(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  });

  it('loginUser retorna 401 com senha incorreta', async () => {
    User.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'u1', email: 'a@a.com', senha: 'h', tipoUsuario: 'ALUNO', twoFactorEnabled: false }),
    });
    bcrypt.compare = jest.fn().mockResolvedValue(false);
    const req = { body: { email: 'a@a.com', senha: 'wrong' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), cookie: jest.fn() };
    await userController.loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('loginUser retorna 500 quando JWT_SECRET ausente', async () => {
    const prev = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'u1',
          email: 'a@a.com',
          senha: 'h',
          tipoUsuario: 'ALUNO',
          twoFactorEnabled: false,
          personagem: 'Mago',
        }),
      });
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      const req = { body: { email: 'a@a.com', senha: '12345678' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), cookie: jest.fn() };
      await userController.loginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    } finally {
      process.env.JWT_SECRET = prev || 'test-jwt-secret';
    }
  });

  it('loginUser com 2FA retorna tempToken', async () => {
    User.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'u1',
        email: 'a@a.com',
        senha: 'h',
        tipoUsuario: 'ALUNO',
        twoFactorEnabled: true,
      }),
    });
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    const req = { body: { email: 'a@a.com', senha: '12345678' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), cookie: jest.fn() };
    await userController.loginUser(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ require2FA: true, tempToken: expect.any(String) }));
  });

  it('loginUser com 2FA retorna 500 se signTwoFactorPendingToken falhar', async () => {
    const spy = jest.spyOn(twoFactorPendingToken, 'signTwoFactorPendingToken').mockImplementation(() => {
      throw new Error('token-fail');
    });
    User.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'u1',
        email: 'a@a.com',
        senha: 'h',
        tipoUsuario: 'ALUNO',
        twoFactorEnabled: true,
      }),
    });
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    const req = { body: { email: 'a@a.com', senha: '12345678' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), cookie: jest.fn() };
    await userController.loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    spy.mockRestore();
  });

  it('registerUser retorna 400 sem email', async () => {
    const req = { body: { aceiteTermos: true, dataNascimento: '2000-01-01', senha: '12345678' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('registerUser retorna 400 sem data de nascimento', async () => {
    const req = { body: { email: 'n@n.com', aceiteTermos: true, senha: '12345678' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('registerUser retorna 400 com idade menor que 14', async () => {
    const y = new Date().getFullYear() - 10;
    const req = { body: { email: 'menor@n.com', aceiteTermos: true, senha: '12345678', dataNascimento: `${y}-01-01` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('registerUser retorna 400 com senha curta', async () => {
    const req = { body: { email: 's@n.com', aceiteTermos: true, senha: 'short', dataNascimento: '2000-01-01' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('registerUser retorna 500 quando save falha', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    bcrypt.hash = jest.fn().mockResolvedValue('h');
    User.prototype.save = jest.fn().mockRejectedValue(new Error('db'));
    const req = { body: { nome: 'x', email: 'e2@n.com', senha: '12345678', dataNascimento: '2000-01-01', aceiteTermos: true } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('criarPerfil retorna 409 quando username já existe', async () => {
    User.findOne = jest.fn().mockResolvedValue({ _id: 'other' });
    const req = { user: { _id: 'u1' }, body: { username: 'taken', personagem: 'Mago', fotoPerfil: '/x' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.criarPerfil(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('criarPerfil retorna 400 com personagem inválido', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1' }, body: { username: 'okuser', personagem: 'Pirata', fotoPerfil: '/x' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.criarPerfil(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('criarPerfil usa upload quando req.file existe', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    User.findByIdAndUpdate = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'u1', username: 'u', personagem: 'Mago', fotoPerfil: '/uploads/f.png' }),
    });
    const req = { user: { _id: 'u1' }, body: { username: 'u', personagem: 'Mago' }, file: { filename: 'f.png' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await userController.criarPerfil(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Perfil criado com sucesso!' }));
  });

  it('criarPerfil retorna 404 quando findByIdAndUpdate não encontra', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    User.findByIdAndUpdate = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { user: { _id: 'u1' }, body: { username: 'u', personagem: 'Mago', fotoPerfil: '/x' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.criarPerfil(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('criarPerfil retorna 409 quando select() rejeita com code 11000 (índice duplicado)', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    const dup: Error & { code: number } = new Error('E11000 duplicate') as Error & { code: number };
    dup.code = 11000;
    User.findByIdAndUpdate = jest.fn().mockReturnValue({ select: jest.fn().mockRejectedValue(dup) });
    const req = { user: { _id: 'u1' }, body: { username: 'u', personagem: 'Mago', fotoPerfil: '/x' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.criarPerfil(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('atualizarDadosPessoais retorna 404 quando usuário não existe', async () => {
    User.findByIdAndUpdate = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { user: { _id: 'u1' }, body: { nome: 'N' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.atualizarDadosPessoais(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('mudarSenha retorna 400 quando nova senha é curta', async () => {
    const req = { user: { _id: 'u1' }, body: { senhaAtual: '12345678', novaSenha: 'short' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.mudarSenha(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('mudarSenha retorna 500 em erro inesperado', async () => {
    User.findById = jest.fn().mockImplementation(() => {
      throw new Error('db');
    });
    const req = { user: { _id: 'u1' }, body: { senhaAtual: '12345678', novaSenha: '87654321' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.mudarSenha(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('solicitarRecuperacaoSenha retorna 200 mesmo sem usuário', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    const req = { body: { email: 'ghost@n.com' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.solicitarRecuperacaoSenha(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('solicitarRecuperacaoSenha cria token quando usuário existe', async () => {
    User.findOne = jest.fn().mockResolvedValue({ email: 'a@a.com' });
    ResetToken.deleteMany = jest.fn().mockResolvedValue({});
    ResetToken.create = jest.fn().mockResolvedValue({});
    const req = { body: { email: 'A@A.COM' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.solicitarRecuperacaoSenha(req, res);
    expect(ResetToken.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('solicitarRecuperacaoSenha retorna 500 em falha geral', async () => {
    User.findOne = jest.fn().mockRejectedValue(new Error('db'));
    const req = { body: { email: 'a@a.com' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.solicitarRecuperacaoSenha(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('redefinirSenha retorna 400 com nova senha curta', async () => {
    const req = { body: { token: 't', novaSenha: '123' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.redefinirSenha(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('redefinirSenha retorna 400 com token inválido', async () => {
    ResetToken.findOne = jest.fn().mockResolvedValue(null);
    const req = { body: { token: 'bad', novaSenha: '12345678' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.redefinirSenha(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('redefinirSenha retorna 404 quando usuário do token não existe', async () => {
    ResetToken.findOne = jest.fn().mockResolvedValue({ email: 'x@x.com', used: false, save: jest.fn() });
    User.findOne = jest.fn().mockResolvedValue(null);
    const req = { body: { token: 'tok', novaSenha: '12345678' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.redefinirSenha(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('redefinirSenha com sucesso', async () => {
    const saveU = jest.fn();
    const saveT = jest.fn();
    ResetToken.findOne = jest.fn().mockResolvedValue({ email: 'x@x.com', used: false, save: saveT });
    User.findOne = jest.fn().mockResolvedValue({ senha: 'old', save: saveU });
    bcrypt.hash = jest.fn().mockResolvedValue('newhash');
    const req = { body: { token: 'tok', novaSenha: '12345678' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await userController.redefinirSenha(req, res);
    expect(saveU).toHaveBeenCalled();
    expect(saveT).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Senha alterada com sucesso!' });
  });

  it('verificarTokenReset retorna valid true', async () => {
    ResetToken.findOne = jest.fn().mockResolvedValue({ token: 't' });
    const req = { params: { token: 't' } };
    const res = { json: jest.fn() };
    await userController.verificarTokenReset(req, res);
    expect(res.json).toHaveBeenCalledWith({ valid: true });
  });

  it('verificarTokenReset retorna 500 em erro', async () => {
    ResetToken.findOne = jest.fn().mockRejectedValue(new Error('db'));
    const req = { params: { token: 't' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.verificarTokenReset(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('atualizarTema com sucesso (dark)', async () => {
    User.updateOne = jest.fn().mockResolvedValue({});
    const req = { user: { _id: 'u1' }, body: { tema: 'dark' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await userController.atualizarTema(req, res);
    expect(User.updateOne).toHaveBeenCalledWith({ _id: 'u1' }, { tema: 'dark' });
    expect(res.json).toHaveBeenCalledWith({ message: 'Tema atualizado.' });
  });

  it('atualizarIdioma com sucesso', async () => {
    User.updateOne = jest.fn().mockResolvedValue({});
    const req = { user: { _id: 'u1' }, body: { idioma: 'en-US' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await userController.atualizarIdioma(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Idioma atualizado.' });
  });

  it('excluirConta retorna 401 com senha incorreta', async () => {
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ senha: 'h' }) });
    bcrypt.compare = jest.fn().mockResolvedValue(false);
    const req = { user: { _id: 'u1' }, body: { senha: 'wrong' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.excluirConta(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('excluirConta com sucesso', async () => {
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ senha: 'h' }) });
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    User.findByIdAndDelete = jest.fn().mockResolvedValue({});
    const req = { user: { _id: 'u1' }, body: { senha: '12345678' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await userController.excluirConta(req, res);
    expect(User.findByIdAndDelete).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Conta excluída com sucesso.' });
  });

  it('confirmarEmail retorna 400 para link inválido', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    const req = { query: { token: 'bad' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), redirect: jest.fn() };
    await userController.confirmarEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('confirmarEmail retorna 500 em erro interno', async () => {
    User.findOne = jest.fn().mockRejectedValue(new Error('db'));
    const req = { query: { token: 't' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), redirect: jest.fn() };
    await userController.confirmarEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('buscarMeusDados retorna 500 em erro', async () => {
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockRejectedValue(new Error('db')) });
    const req = { user: { _id: 'u1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await userController.buscarMeusDados(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('controllers ~90% — trilhaController', () => {
  it('criarTrilha retorna 500 quando save falha', async () => {
    jest.spyOn(Trilha.prototype, 'save').mockRejectedValueOnce(new Error('fail-save'));
    const req = { user: { _id: 'u1' }, body: { titulo: 'T' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.criarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('listarTrilhas como ADMINISTRADOR usa populate', async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
    const selectMock = jest.fn().mockReturnValue({ populate: populateMock });
    Trilha.find = jest.fn().mockReturnValue({ select: selectMock });
    const req = { user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await trilhaController.listarTrilhas(req, res);
    expect(populateMock).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('listarTrilhas retorna 500 em erro', async () => {
    Trilha.find = jest.fn().mockImplementation(() => {
      throw new Error('db');
    });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.listarTrilhas(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('atualizarTrilha retorna 500 em erro', async () => {
    Trilha.findById = jest.fn().mockRejectedValue(new Error('db'));
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: oid }, body: { titulo: 'x' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.atualizarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('buscarTrilhas sem user filtra disponibilidade Aberto', async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
    const selectMock = jest.fn().mockReturnValue({ populate: populateMock });
    const findMock = jest.fn().mockReturnValue({ select: selectMock });
    Trilha.find = findMock;
    const req = { query: {} };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await trilhaController.buscarTrilhas(req, res);
    expect(findMock).toHaveBeenCalledWith(expect.objectContaining({ disponibilidade: 'Aberto' }));
  });

  it('buscarTrilhas ignora materia Todas', async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
    const selectMock = jest.fn().mockReturnValue({ populate: populateMock });
    Trilha.find = jest.fn().mockReturnValue({ select: selectMock });
    const req = { query: { materia: 'Todas' }, user: { tipoUsuario: 'ALUNO' } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await trilhaController.buscarTrilhas(req, res);
    const arg = Trilha.find.mock.calls[0][0];
    expect(arg.materia).toBeUndefined();
  });

  it('buscarTrilhaPorId retorna 404 quando não existe', async () => {
    Trilha.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue(null),
    });
    const req = { params: { id: oid }, user: { tipoUsuario: 'ALUNO' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.buscarTrilhaPorId(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('buscarTrilhaPorId retorna 500 em erro', async () => {
    Trilha.findById = jest.fn().mockImplementation(() => {
      throw new Error('db');
    });
    const req = { params: { id: oid }, user: { tipoUsuario: 'ALUNO' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.buscarTrilhaPorId(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('iniciarTrilha não duplica usuário em usuariosIniciaram', async () => {
    const save = jest.fn();
    const uid = '507f1f77bcf86cd799439012';
    Trilha.findById = jest.fn().mockResolvedValue({
      usuariosIniciaram: [uid],
      save,
      toObject: () => ({ titulo: 'T' }),
    });
    const req = { user: { _id: uid }, params: { trilhaId: oid } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await trilhaController.iniciarTrilha(req, res);
    expect(save).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });

  it('visualizarTrilha retorna 404 quando trilha não existe', async () => {
    Trilha.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
    const req = { params: { id: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.visualizarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('trilhasNovidades retorna 500 em erro', async () => {
    Trilha.find = jest.fn().mockImplementation(() => {
      throw new Error('db');
    });
    const req = { user: { _id: 'u1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.trilhasNovidades(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('trilhasPopulares retorna 500 em erro', async () => {
    Trilha.find = jest.fn().mockImplementation(() => {
      throw new Error('db');
    });
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.trilhasPopulares(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('trilhasContinue retorna 500 em erro', async () => {
    Trilha.find = jest.fn().mockImplementation(() => {
      throw new Error('db');
    });
    const req = { user: { _id: 'u1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.trilhasContinue(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('buscarTrilhas retorna 500 em erro', async () => {
    Trilha.find = jest.fn().mockImplementation(() => {
      throw new Error('db');
    });
    const req = { query: {}, user: { tipoUsuario: 'ALUNO' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.buscarTrilhas(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('deletarTrilha retorna 500 em erro', async () => {
    Trilha.findOneAndDelete = jest.fn().mockRejectedValue(new Error('db'));
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.deletarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('iniciarTrilha retorna 500 em erro', async () => {
    Trilha.findById = jest.fn().mockRejectedValue(new Error('db'));
    const req = { user: { _id: 'u1' }, params: { trilhaId: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaController.iniciarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('controllers ~90% — fase, feedback, lição, pergunta, seção', () => {
  it('faseController listarFases retorna 500 em erro', async () => {
    Fase.find = jest.fn().mockImplementation(() => {
      throw new Error('db');
    });
    const req = { query: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.listarFases(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('faseController buscarFasePorId retorna 500 em erro', async () => {
    Fase.findById = jest.fn().mockImplementation(() => {
      throw new Error('db');
    });
    const req = { params: { id: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.buscarFasePorId(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('faseController buscarFasesPorTrilha retorna 500 em erro', async () => {
    Trilha.findById = jest.fn().mockRejectedValue(new Error('db'));
    const req = { params: { trilhaId: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.buscarFasesPorTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('faseController criarFase retorna 500 em erro', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1', _id: 't1' });
    Fase.create = jest.fn().mockRejectedValue(new Error('db'));
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, body: { trilhaId: 't1', ordem: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.criarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('faseController atualizarFase retorna 500 em erro', async () => {
    Fase.findById = jest.fn().mockRejectedValue(new Error('db'));
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: oid }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await faseController.atualizarFase(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('feedbackController criarFeedback retorna 500 em erro', async () => {
    Feedback.create = jest.fn().mockRejectedValue(new Error('db'));
    const req = { body: { tipo: 'bug', avaliacao: 3 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await feedbackController.criarFeedback(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('feedbackController listarFeedbacks retorna 500 em erro', async () => {
    Feedback.find = jest.fn().mockImplementation(() => {
      throw new Error('db');
    });
    const req = { user: { tipoUsuario: 'ADMINISTRADOR' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await feedbackController.listarFeedbacks(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('licaoSalvaController salvarTrilha retorna 404 sem trilha', async () => {
    Trilha.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1' }, body: { trilhaId: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await licaoSalvaController.salvarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('licaoSalvaController salvarTrilha retorna 400 em duplicata Mongo 11000', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({});
    LicaoSalva.findOne = jest.fn().mockResolvedValue(null);
    const err = Object.assign(new Error('dup'), { code: 11000 });
    LicaoSalva.create = jest.fn().mockRejectedValue(err);
    const req = { user: { _id: 'u1' }, body: { trilhaId: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await licaoSalvaController.salvarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('licaoSalvaController salvarTrilha retorna 500 em erro genérico', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({});
    LicaoSalva.findOne = jest.fn().mockResolvedValue(null);
    LicaoSalva.create = jest.fn().mockRejectedValue(new Error('db'));
    const req = { user: { _id: 'u1' }, body: { trilhaId: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await licaoSalvaController.salvarTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('licaoSalvaController remover retorna 500 em erro', async () => {
    LicaoSalva.findOneAndDelete = jest.fn().mockRejectedValue(new Error('db'));
    const req = { user: { _id: 'u1' }, params: { trilhaId: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await licaoSalvaController.removerTrilhaSalva(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('licaoSalvaController listar retorna 500 em erro', async () => {
    LicaoSalva.find = jest.fn().mockImplementation(() => {
      throw new Error('db');
    });
    const req = { user: { _id: 'u1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await licaoSalvaController.listarTrilhasSalvas(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('licaoSalvaController verificar retorna 500 em erro', async () => {
    LicaoSalva.findOne = jest.fn().mockRejectedValue(new Error('db'));
    const req = { user: { _id: 'u1' }, params: { trilhaId: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await licaoSalvaController.verificarSeSalva(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('perguntaController listarPerguntas retorna 500 em erro', async () => {
    Fase.findById = jest.fn().mockRejectedValue(new Error('db'));
    const req = { params: { faseId: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.listarPerguntasPorFase(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('perguntaController criarPergunta retorna 400 com poucas alternativas', async () => {
    const req = {
      user: { _id: 'u1', tipoUsuario: 'ALUNO' },
      body: { faseId: oid, enunciado: 'Q', alternativas: ['a'], respostaCorreta: 0 },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.criarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('perguntaController criarPergunta retorna 400 com índice de resposta inválido', async () => {
    const req = {
      user: { _id: 'u1', tipoUsuario: 'ALUNO' },
      body: { faseId: oid, enunciado: 'Q', alternativas: ['a', 'b'], respostaCorreta: 5 },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.criarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('perguntaController criarPergunta retorna 403 para aluno não dono', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't1' });
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'other' });
    const req = {
      user: { _id: 'u1', tipoUsuario: 'ALUNO' },
      body: { faseId: oid, enunciado: 'Q', alternativas: ['a', 'b'], respostaCorreta: 0 },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.criarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('perguntaController criarPergunta retorna 404 sem trilha associada', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't1' });
    Trilha.findById = jest.fn().mockResolvedValue(null);
    const req = {
      user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' },
      body: { faseId: oid, enunciado: 'Q', alternativas: ['a', 'b'], respostaCorreta: 0 },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.criarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('perguntaController atualizarPergunta retorna 400 com alternativas curtas', async () => {
    Fase.findById = jest.fn().mockResolvedValue({
      trilhaId: 't1',
      perguntas: [{ enunciado: 'Q', alternativas: ['a', 'b'], respostaCorreta: '0' }],
    });
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1' });
    const req = {
      user: { _id: 'u1', tipoUsuario: 'ALUNO' },
      params: { faseId: oid, perguntaIndex: '0' },
      body: { alternativas: ['x'] },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.atualizarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('perguntaController atualizarPergunta retorna 400 com respostaCorreta fora do intervalo', async () => {
    Fase.findById = jest.fn().mockResolvedValue({
      trilhaId: 't1',
      perguntas: [{ enunciado: 'Q', alternativas: ['a', 'b'], respostaCorreta: '0' }],
    });
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1' });
    const req = {
      user: { _id: 'u1', tipoUsuario: 'ALUNO' },
      params: { faseId: oid, perguntaIndex: '0' },
      body: { respostaCorreta: 9 },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.atualizarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('perguntaController atualizarPergunta retorna 500 em erro', async () => {
    Fase.findById = jest.fn().mockRejectedValue(new Error('db'));
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { faseId: oid, perguntaIndex: '0' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.atualizarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('perguntaController deletarPergunta retorna 500 em erro', async () => {
    Fase.findById = jest.fn().mockRejectedValue(new Error('db'));
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { faseId: oid, perguntaIndex: '0' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.deletarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('secaoController listarSecoes sem trilhaId lista todas', async () => {
    Secao.find = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([]) }) });
    const req = { query: {} };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await secaoController.listarSecoes(req, res);
    expect(Secao.find).toHaveBeenCalledWith({});
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('secaoController listarSecoes retorna 500 em erro', async () => {
    Secao.find = jest.fn().mockImplementation(() => {
      throw new Error('db');
    });
    const req = { query: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.listarSecoes(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('secaoController criarSecao retorna 409 quando ordem já existe', async () => {
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1' });
    Secao.findOne = jest.fn().mockResolvedValue({ _id: 's1' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, body: { trilhaId: oid, titulo: 'T', ordem: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.criarSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('secaoController atualizarSecao retorna 400 com trilhaId inválido no body', async () => {
    Secao.findById = jest.fn().mockResolvedValue({ trilhaId: oid, ordem: 1 });
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: oid }, body: { trilhaId: 'nope' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.atualizarSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('secaoController atualizarSecao retorna 409 em conflito de ordem', async () => {
    Secao.findById = jest.fn().mockResolvedValue({ trilhaId: oid, ordem: 1 });
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1' });
    Secao.findOne = jest.fn().mockResolvedValue({ _id: 'other' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: oid }, body: { ordem: 2 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.atualizarSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('secaoController atualizarSecao retorna 404 sem seção', async () => {
    Secao.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: oid }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.atualizarSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('secaoController atualizarSecao retorna 404 sem trilha associada', async () => {
    Secao.findById = jest.fn().mockResolvedValue({ trilhaId: oid, ordem: 1 });
    Trilha.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: oid }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.atualizarSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('secaoController deletarSecao admin segue sem trilha associada e remove seção', async () => {
    Secao.findById = jest.fn().mockResolvedValue({ trilhaId: oid });
    Trilha.findById = jest.fn().mockResolvedValue(null);
    Secao.findByIdAndDelete = jest.fn().mockResolvedValue({});
    const req = { user: { _id: 'u1', tipoUsuario: 'ADMINISTRADOR' }, params: { id: oid } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await secaoController.deletarSecao(req, res);
    expect(Secao.findByIdAndDelete).toHaveBeenCalledWith(oid);
    expect(res.json).toHaveBeenCalledWith({ message: 'Seção deletada com sucesso' });
  });

  it('secaoController deletarSecao aluno quando trilha não existe retorna 404', async () => {
    Secao.findById = jest.fn().mockResolvedValue({ trilhaId: oid });
    Trilha.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { id: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.deletarSecao(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('secaoController buscarSecoesPorTrilha retorna 500 em erro', async () => {
    Trilha.findById = jest.fn().mockRejectedValue(new Error('db'));
    const req = { params: { trilhaId: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await secaoController.buscarSecoesPorTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('controllers ~90% — progresso e ranking', () => {
  it('salvarResultado retorna 400 quando fase já concluída', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't1' });
    Progresso.findOne = jest.fn().mockResolvedValue({ concluido: true });
    const req = { user: { _id: 'u1' }, body: { faseId: oid, pontuacao: 1, totalPerguntas: 1 }, headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.salvarResultado(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('salvarResultado atualiza progresso existente não concluído', async () => {
    Fase.findById = jest.fn().mockResolvedValue({ trilhaId: 't1' });
    const save = jest.fn();
    Progresso.findOne = jest.fn().mockResolvedValue({ concluido: false, save, respostasUsuario: [], perguntasRespondidas: [] });
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ xpTotal: 0 }) });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: jest.fn() });
    const req = { user: { _id: 'u1' }, body: { faseId: oid, pontuacao: 2, totalPerguntas: 2 }, headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.salvarResultado(req, res);
    expect(save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('salvarResultado retorna 500 em erro', async () => {
    Fase.findById = jest.fn().mockRejectedValue(new Error('db'));
    const req = { user: { _id: 'u1' }, body: { faseId: oid, pontuacao: 1, totalPerguntas: 1 }, headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.salvarResultado(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('salvarResposta não duplica quando pergunta já respondida', async () => {
    Fase.findById = jest.fn().mockResolvedValue({
      trilhaId: 't1',
      perguntas: [{ respostaCorreta: '0' }, { respostaCorreta: '1' }],
    });
    const save = jest.fn();
    Progresso.findOne = jest.fn().mockResolvedValue({
      perguntasRespondidas: [0],
      respostasUsuario: [0],
      save,
    });
    const req = { user: { _id: 'u1' }, body: { faseId: oid, perguntaIndex: 0, resposta: 0 } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await progressoController.salvarResposta(req, res);
    expect(save).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });

  it('salvarResposta retorna 500 em erro', async () => {
    Fase.findById = jest.fn().mockRejectedValue(new Error('db'));
    const req = { user: { _id: 'u1' }, body: { faseId: oid, perguntaIndex: 0, resposta: 0 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.salvarResposta(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('verificarProgresso retorna completado true', async () => {
    Progresso.findOne = jest.fn().mockResolvedValue({
      concluido: true,
      respostasUsuario: [1],
      perguntasRespondidas: [0],
    });
    const req = { user: { _id: 'u1' }, params: { faseId: oid } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await progressoController.verificarProgresso(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ completado: true, respostasSalvas: [1], perguntasRespondidas: [0] })
    );
  });

  it('verificarProgresso retorna 500 em erro', async () => {
    Progresso.findOne = jest.fn().mockRejectedValue(new Error('db'));
    const req = { user: { _id: 'u1' }, params: { faseId: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.verificarProgresso(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('obterProgressoTrilha retorna 500 em erro', async () => {
    Progresso.find = jest.fn().mockReturnValue({ select: jest.fn().mockRejectedValue(new Error('db')) });
    const req = { user: { _id: 'u1' }, params: { trilhaId: oid } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.obterProgressoTrilha(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('obterDadosUsuario retorna 500 em erro', async () => {
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockRejectedValue(new Error('db')) });
    const req = { user: { _id: 'u1' }, headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.obterDadosUsuario(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('obterRanking retorna 500 em erro', async () => {
    Progresso.aggregate = jest.fn().mockRejectedValue(new Error('db'));
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await rankingController.obterRanking(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('obterRankingNivel retorna 500 em erro', async () => {
    User.find = jest.fn().mockReturnValue({ select: jest.fn().mockRejectedValue(new Error('db')) });
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await rankingController.obterRankingNivel(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});


