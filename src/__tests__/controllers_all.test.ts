// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('../services/emailVerificationService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const faseController = require('../controllers/faseController');
const feedbackController = require('../controllers/feedbackController');
const licaoSalvaController = require('../controllers/licaoSalvaController');
const perguntaController = require('../controllers/perguntaController');
const userController = require('../controllers/userController');
const homeController = require('../controllers/homeController');
const progressoController = require('../controllers/progressoController');
const authController = require('../controllers/authController');
const { verificarToken, verificarProfessor, verificarAdministrador, verificarTokenOpcional } = require('../middlewares/authMiddleware');
const { errorHandler } = require('../middlewares/errorHandler');
const rankingController = require('../controllers/rankingController');
const secaoController = require('../controllers/secaoController');
const trilhaController = require('../controllers/trilhaController');

const Fase = require('../models/fase').default || require('../models/fase');
const Trilha = require('../models/trilha').default || require('../models/trilha');
const Secao = require('../models/secao').default || require('../models/secao');
const Feedback = require('../models/feedback').default || require('../models/feedback');
const bcrypt = require('bcryptjs');
const LicaoSalva = require('../models/licaoSalva').default || require('../models/licaoSalva');
const ResetToken = require('../models/resetToken').default || require('../models/resetToken');
const Progresso = require('../models/progresso').default || require('../models/progresso');
const User = require('../models/user').default || require('../models/user');

beforeEach(() => {
  jest.resetAllMocks();
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
    const faseMock: any = { trilhaId: 't1', perguntas: [{ enunciado: 'a', alternativas: ['x','y'], respostaCorreta: '0' }], save: jest.fn().mockResolvedValue(true) };
    Fase.findById = jest.fn().mockResolvedValue(faseMock);
    Trilha.findById = jest.fn().mockResolvedValue({ usuario: 'u1' });
    const req = { user: { _id: 'u1', tipoUsuario: 'ALUNO' }, params: { faseId: 'f1', perguntaIndex: '0' }, body: { enunciado: 'b', alternativas: ['x','y'], respostaCorreta: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await perguntaController.atualizarPergunta(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it('deletarPergunta success deletes pergunta and returns 200', async () => {
    const faseMock: any = { trilhaId: 't1', perguntas: [{ enunciado: 'a', alternativas: ['x','y'], respostaCorreta: '0' }], save: jest.fn().mockResolvedValue(true) };
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
  it('loginUser not verified returns 403', async () => {
    User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'id', email: 'x@x.com', senha: '$2a$10$abc', tipoUsuario: 'ALUNO', isVerified: false }) });
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    const req = { body: { email: 'x@x.com', senha: '12345678' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), cookie: jest.fn() };
    process.env.JWT_SECRET = 'secret';
    await userController.loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
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
    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('authController login succeeds with valid user', async () => {
    const fakeUser = { _id: 'u1', nome: 'N', email: 'x@x.com', tipoUsuario: 'ALUNO', senha: 'hash' };
    User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    const req = { body: { email: 'x@x.com', senha: '1234' }, headers: {}, cookies: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), cookie: jest.fn() };
    process.env.JWT_SECRET = 'secret';
    await authController.login(req, res);
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
    const sorted = { sort: jest.fn().mockResolvedValue([{}]), populate: jest.fn().mockReturnThis() };
    const selected = { select: jest.fn().mockReturnThis(), populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnValue(sorted) };
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
    User.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'u1', email: 'x@x.com', senha: 'hash', tipoUsuario: 'ALUNO', isVerified: true }) });
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
    errorHandler(err, {} as any, res as any, {} as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('errorHandler handles JsonWebTokenError', () => {
    const err = { name: 'JsonWebTokenError', message: 'bad' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err, {} as any, res as any, {} as any);
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

  it('progressoController salvarResposta fase missing returns 404', async () => {
    Fase.findById = jest.fn().mockResolvedValue(null);
    const req = { user: { _id: 'u1' }, body: { faseId: 'f1', perguntaIndex: 0, resposta: 0 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await progressoController.salvarResposta(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
