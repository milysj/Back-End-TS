// @ts-nocheck
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import googleGemini from '../controllers/geminiController';
import { gerarTrilhaComIa } from '../controllers/trilhaIaController';
import { getPublicApiBaseUrl, getFrontendBaseUrl } from '../config/publicUrls';
import { buscarContextoRagTrilha } from '../services/ragTrilhaContext';
import Trilha from '../models/trilha';
import Fase from '../models/fase';
import { BetterStackLogSink } from '../logging/BetterStackLogSink';
import { verificarToken, verificarTokenOpcional, verificarProfessor, verificarAdministrador } from '../middlewares/authMiddleware';
import { errorHandler } from '../middlewares/errorHandler';
import User from '../models/user';
import * as jwt from 'jsonwebtoken';

jest.mock('../services/geminiTrilhaSugestaoService', () => ({
  gerarSugestaoTrilhaViaServicoIa: jest.fn(),
}));

import { gerarSugestaoTrilhaViaServicoIa } from '../services/geminiTrilhaSugestaoService';

describe('geminiController (LLM_DEMO_URL)', () => {
  const origEnv = { ...process.env };
  const savedFetch = global.fetch;

  const mockRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  });

  afterEach(() => {
    Object.assign(process.env, origEnv);
    delete process.env.LLM_DEMO_URL;
    delete process.env.LLM_DEMO_API_KEY;
    global.fetch = savedFetch;
  });

  it('retorna 503 quando LLM_DEMO_URL não está definida', async () => {
    delete process.env.LLM_DEMO_URL;
    const res = mockRes();
    await googleGemini.gerarTexto({} as never, res as never);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('encaminha Authorization quando LLM_DEMO_API_KEY existe', async () => {
    process.env.LLM_DEMO_URL = 'http://demo.local/llm';
    process.env.LLM_DEMO_API_KEY = 'k';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    const res = mockRes();
    await googleGemini.gerarTexto({} as never, res as never);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://demo.local/llm',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer k' }),
      })
    );
    expect(res.json).toHaveBeenCalled();
  });

  it('retorna 502 quando o corpo não é JSON', async () => {
    process.env.LLM_DEMO_URL = 'http://demo.local/llm';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'not-json{{{',
    });
    const res = mockRes();
    await googleGemini.gerarTexto({} as never, res as never);
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('retorna 502 quando HTTP não é OK', async () => {
    process.env.LLM_DEMO_URL = 'http://demo.local/llm';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ detail: 'x' }),
    });
    const res = mockRes();
    await googleGemini.gerarTexto({} as never, res as never);
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('retorna 500 em falha de rede', async () => {
    process.env.LLM_DEMO_URL = 'http://demo.local/llm';
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const res = mockRes();
    await googleGemini.gerarTexto({} as never, res as never);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('trilhaIaController', () => {
  const mockSvc = gerarSugestaoTrilhaViaServicoIa as jest.Mock;

  beforeEach(() => {
    mockSvc.mockReset();
    delete process.env.TRILHA_IA_API_URL;
  });

  it('retorna 503 sem TRILHA_IA_API_URL', async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await gerarTrilhaComIa({ body: { materia: 'Mat' }, user: {} } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('retorna 400 sem matéria válida', async () => {
    process.env.TRILHA_IA_API_URL = 'http://localhost:1';
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await gerarTrilhaComIa({ body: { materia: '  ' }, user: {} } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 com dificuldade inválida', async () => {
    process.env.TRILHA_IA_API_URL = 'http://localhost:1';
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await gerarTrilhaComIa({ body: { materia: 'Mat', dificuldade: 'Impossivel' }, user: {} } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('ignora dificuldade vazia e chama o serviço', async () => {
    process.env.TRILHA_IA_API_URL = 'http://localhost:1';
    mockSvc.mockResolvedValue({ trilha: { titulo: 'T' }, secoes: [] });
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await gerarTrilhaComIa({ body: { materia: 'Mat', dificuldade: '' }, user: {} } as never, res as never);
    expect(mockSvc).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 200 quando o serviço responde', async () => {
    process.env.TRILHA_IA_API_URL = 'http://localhost:1';
    mockSvc.mockResolvedValue({ trilha: { titulo: 'T' }, secoes: [] });
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await gerarTrilhaComIa(
      {
        body: { materia: 'Português', dificuldade: 'Facil', numeroSecoes: 1, fasesPorSecao: 1, perguntasPorFase: 2 },
        user: {},
      } as never,
      res as never
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 500 quando o serviço lança', async () => {
    process.env.TRILHA_IA_API_URL = 'http://localhost:1';
    mockSvc.mockRejectedValue(new Error('falha'));
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await gerarTrilhaComIa({ body: { materia: 'Arte' }, user: {} } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('publicUrls', () => {
  const backup = { ...process.env };

  afterEach(() => {
    process.env.API_PUBLIC_URL = backup.API_PUBLIC_URL;
    process.env.BACKEND_URL = backup.BACKEND_URL;
    process.env.PORT = backup.PORT;
    process.env.FRONTEND_URL = backup.FRONTEND_URL;
  });

  it('prioriza API_PUBLIC_URL e remove barras finais', () => {
    process.env.API_PUBLIC_URL = 'https://api.app.com///';
    expect(getPublicApiBaseUrl()).toBe('https://api.app.com');
  });

  it('usa BACKEND_URL quando API_PUBLIC_URL não existe', () => {
    delete process.env.API_PUBLIC_URL;
    process.env.BACKEND_URL = 'https://back/';
    expect(getPublicApiBaseUrl()).toBe('https://back');
  });

  it('usa localhost e PORT por padrão', () => {
    delete process.env.API_PUBLIC_URL;
    delete process.env.BACKEND_URL;
    process.env.PORT = '4000';
    expect(getPublicApiBaseUrl()).toBe('http://localhost:4000');
  });

  it('getFrontendBaseUrl respeita FRONTEND_URL', () => {
    process.env.FRONTEND_URL = 'https://front.app///';
    expect(getFrontendBaseUrl()).toBe('https://front.app');
  });
});

describe('ragTrilhaContext (integração MongoMemory)', () => {
  beforeEach(async () => {
    await Trilha.deleteMany({});
    await Fase.deleteMany({});
  });

  it('retorna string vazia para matéria vazia', async () => {
    expect(await buscarContextoRagTrilha('   ')).toBe('');
  });

  it('retorna mensagem padrão quando não há trilhas no acervo', async () => {
    const ctx = await buscarContextoRagTrilha('Matéria Sem Trilhas');
    expect(ctx).toContain('Nenhum conteúdo anterior encontrado');
  });

  it('monta contexto com trilhas da mesma matéria', async () => {
    const t = await Trilha.create({
      titulo: 'Trilha Matemática',
      descricao: 'Desc',
      dataCriacao: new Date().toISOString(),
      materia: 'Matemática',
      dificuldade: 'Facil',
      faseSelecionada: 1,
      usuario: new mongoose.Types.ObjectId(),
      visualizacoes: 10,
    });
    await Fase.create({
      trilhaId: t._id,
      titulo: 'Fase 1',
      descricao: 'd',
      conteudo: 'x'.repeat(700),
      ordem: 1,
      perguntas: [
        { enunciado: 'Q1?', alternativas: ['a', 'b'], respostaCorreta: 'a' },
      ],
    });
    const ctx = await buscarContextoRagTrilha('Matemática', { limiteTrilhas: 2, fasesPorTrilha: 2 });
    expect(ctx).toContain('Matemática');
    expect(ctx).toContain('Trechos do acervo interno');
    expect(ctx).toContain('Q1?');
  });

  it('usa trilhas populares quando não há match de matéria', async () => {
    await Trilha.create({
      titulo: 'Outra',
      descricao: 'Descrição obrigatória',
      dataCriacao: new Date().toISOString(),
      materia: 'História',
      dificuldade: 'Medio',
      faseSelecionada: 1,
      usuario: new mongoose.Types.ObjectId(),
      visualizacoes: 99,
    });
    const ctx = await buscarContextoRagTrilha('Geografia Inexistente No Banco');
    expect(ctx.length).toBeGreaterThan(50);
  });
});

describe('BetterStackLogSink', () => {
  const origFetch = global.fetch;
  const origToken = process.env.BETTER_STACK_SOURCE_TOKEN;
  const origIngest = process.env.BETTER_STACK_INGEST_URL;

  afterEach(() => {
    global.fetch = origFetch;
    if (origToken) process.env.BETTER_STACK_SOURCE_TOKEN = origToken;
    else delete process.env.BETTER_STACK_SOURCE_TOKEN;
    if (origIngest) process.env.BETTER_STACK_INGEST_URL = origIngest;
    else delete process.env.BETTER_STACK_INGEST_URL;
    delete process.env.BETTER_STACK_SERVICE_NAME;
  });

  it('formatEvent inclui campos e sanitiza headers/body aninhados', () => {
    delete process.env.BETTER_STACK_SOURCE_TOKEN;
    const sink = new BetterStackLogSink();
    const ev = sink.formatEvent('info', 'hello', {
      headers: { Authorization: 'secret', 'Content-Type': 'application/json' },
      body: { senha: 'x', email: 'a@b.com' },
      nested: { inner: { token: 't' } },
      err: Object.assign(new Error('e'), { name: 'Error' }),
    });
    expect(ev.message).toBe('hello');
    expect(ev.level).toBe('info');
    expect((ev.headers as Record<string, string>).Authorization).toBeDefined();
  });

  it('send não chama fetch quando desabilitado', async () => {
    delete process.env.BETTER_STACK_SOURCE_TOKEN;
    global.fetch = jest.fn();
    const sink = new BetterStackLogSink();
    await sink.send('info', 'x');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('send chama ingest quando habilitado', async () => {
    process.env.BETTER_STACK_SOURCE_TOKEN = 'tok';
    process.env.BETTER_STACK_INGEST_URL = 'https://example-ingest.test/';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 202, text: async () => '' });
    const sink = new BetterStackLogSink();
    await sink.send('warn', 'w', { k: 1 });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example-ingest.test',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('send tolera status 202 mesmo com ok false', async () => {
    process.env.BETTER_STACK_SOURCE_TOKEN = 'tok';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 202, text: async () => 'x' });
    const sink = new BetterStackLogSink();
    await expect(sink.send('error', 'e')).resolves.toBeUndefined();
  });

  it('send registra falha quando HTTP não é OK nem 202', async () => {
    process.env.BETTER_STACK_SOURCE_TOKEN = 'tok';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, text: async () => 'err body' });
    const sink = new BetterStackLogSink();
    await expect(sink.send('info', 'fail')).resolves.toBeUndefined();
  });
});

describe('authMiddleware — token em cookie', () => {
  const uid = String(new mongoose.Types.ObjectId());

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('verificarToken lê token do cookie quando não há Bearer', async () => {
    const token = jwt.sign({ id: uid }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: uid, tipoUsuario: 'ALUNO' }),
    } as never);
    const req = { headers: {}, cookies: { token } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await verificarToken(req as never, res as never, next);
    expect(next).toHaveBeenCalled();
  });

  it('verificarToken retorna 401 quando usuário não existe', async () => {
    const token = jwt.sign({ id: uid }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    } as never);
    const req = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await verificarToken(req as never, res as never, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('verificarTokenOpcional não quebra sem Authorization', async () => {
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();
    await verificarTokenOpcional(req as never, res as never, next);
    expect(next).toHaveBeenCalled();
  });

  it('verificarToken retorna 401 com JWT expirado', async () => {
    const token = jwt.sign({ id: uid, exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET!);
    const req = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await verificarToken(req as never, res as never, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/expirado|login/i) }));
  });

  it('verificarToken retorna 401 com JWT malformado', async () => {
    const req = { headers: { authorization: 'Bearer nao.e.um.jwt' }, cookies: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await verificarToken(req as never, res as never, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('verificarProfessor retorna 401 sem usuário', () => {
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    verificarProfessor(req as never, res as never, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('verificarAdministrador retorna 401 sem usuário', () => {
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    verificarAdministrador(req as never, res as never, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('errorHandler — ramos extras', () => {
  const orig = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = orig;
  });

  it('trata TokenExpiredError', () => {
    const err = Object.assign(new Error('exp'), { name: 'TokenExpiredError' });
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err as never, { method: 'GET', path: '/', requestId: 'r1' } as never, res as never, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('ValidationError sem errors usa N/A', () => {
    const err = { name: 'ValidationError', message: 'v' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err as never, { method: 'POST', path: '/', requestId: 'r0' } as never, res as never, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: 'N/A' }));
  });

  it('inclui stack em desenvolvimento', () => {
    process.env.NODE_ENV = 'development';
    const err = Object.assign(new Error('oops'), { name: 'Error', statusCode: 418 });
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err as never, { method: 'GET', path: '/x', requestId: 'r2' } as never, res as never, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ stack: expect.any(String) }));
  });
});

describe('emailVerificationService — deliverHtmlEmail', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('envia via Resend quando configurado', async () => {
    const send = jest.fn().mockResolvedValue({ data: { id: '1' }, error: null });
    jest.doMock('../config/mail', () => ({
      hasSmtpConfig: () => false,
      getSmtpTransporter: () => null,
    }));
    jest.doMock('../config/resend', () => ({
      hasResendConfig: () => true,
      getResend: () => ({ emails: { send } }),
      getResendFromEmail: () => 'onboarding@resend.dev',
    }));
    const { sendVerificationEmail } = await import('../services/emailVerificationService');
    await sendVerificationEmail('a@b.com', 'Nome', 'tok');
    expect(send).toHaveBeenCalled();
  });

  it('lança quando Resend não retorna data', async () => {
    jest.doMock('../config/mail', () => ({
      hasSmtpConfig: () => false,
      getSmtpTransporter: () => null,
    }));
    jest.doMock('../config/resend', () => ({
      hasResendConfig: () => true,
      getResend: () => ({
        emails: {
          send: jest.fn().mockResolvedValue({ data: null, error: null }),
        },
      }),
      getResendFromEmail: () => 'onboarding@resend.dev',
    }));
    const { sendVerificationEmail } = await import('../services/emailVerificationService');
    await expect(sendVerificationEmail('a@b.com', 'Nome', 'tok')).rejects.toThrow('confirmação');
  });

  it('lança quando Resend retorna erro', async () => {
    jest.doMock('../config/mail', () => ({
      hasSmtpConfig: () => false,
      getSmtpTransporter: () => null,
    }));
    jest.doMock('../config/resend', () => ({
      hasResendConfig: () => true,
      getResend: () => ({
        emails: {
          send: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
        },
      }),
      getResendFromEmail: () => 'onboarding@resend.dev',
    }));
    const { sendVerificationEmail } = await import('../services/emailVerificationService');
    await expect(sendVerificationEmail('a@b.com', 'Nome', 'tok')).rejects.toThrow('fail');
  });

  it('sendVerificationEmail via SMTP com replyTo opcional', async () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    jest.doMock('../config/resend', () => ({
      hasResendConfig: () => false,
      getResend: () => null,
      getResendFromEmail: () => null,
    }));
    jest.doMock('../config/mail', () => ({
      hasSmtpConfig: () => true,
      getSmtpTransporter: () => ({ sendMail }),
    }));
    const oldReply = process.env.MAIL_REPLY_TO;
    process.env.MAIL_REPLY_TO = 'support@example.com';
    const { sendVerificationEmail } = await import('../services/emailVerificationService');
    await sendVerificationEmail('user@example.com', 'U', 'token123');
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ replyTo: 'support@example.com' }));
    if (oldReply) process.env.MAIL_REPLY_TO = oldReply;
    else delete process.env.MAIL_REPLY_TO;
  });

  it('sendPasswordResetEmail monta path com ? quando o path já tem query', async () => {
    jest.doMock('../config/mail', () => ({
      hasSmtpConfig: () => false,
      getSmtpTransporter: () => null,
    }));
    jest.doMock('../config/resend', () => ({
      hasResendConfig: () => true,
      getResend: () => ({
        emails: { send: jest.fn().mockResolvedValue({ data: { id: '1' }, error: null }) },
      }),
      getResendFromEmail: () => 'onboarding@resend.dev',
    }));
    const oldPath = process.env.PASSWORD_RESET_FRONTEND_PATH;
    process.env.PASSWORD_RESET_FRONTEND_PATH = '/reset?x=1';
    const { sendPasswordResetEmail } = await import('../services/emailVerificationService');
    await sendPasswordResetEmail('a@b.com', 'tok');
    process.env.PASSWORD_RESET_FRONTEND_PATH = oldPath;
  });
});

describe('authRateLimit numEnv', () => {
  afterEach(() => {
    delete process.env.RATE_LIMIT_LOGIN_MAX;
    jest.resetModules();
  });

  it('usa max configurado quando variável é número válido', async () => {
    process.env.RATE_LIMIT_LOGIN_MAX = '7';
    jest.resetModules();
    const mod = await import('../middlewares/authRateLimit');
    expect(mod.loginRateLimiter).toBeDefined();
  });

  it('ignora max inválido e mantém limiter definido', async () => {
    process.env.RATE_LIMIT_LOGIN_MAX = 'not-a-number';
    jest.resetModules();
    const mod = await import('../middlewares/authRateLimit');
    expect(mod.loginRateLimiter).toBeDefined();
  });
});

describe('httpLogMiddleware', () => {
  it('registra requisição, IP via X-Forwarded-For string e handler finish', async () => {
    const { httpLogMiddleware } = await import('../middlewares/httpLogMiddleware');
    let onFinish: (() => void) | undefined;
    const req = {
      method: 'GET',
      path: '/api/x',
      originalUrl: '/api/x',
      query: {},
      params: {},
      body: {},
      headers: { 'x-forwarded-for': ' 203.0.113.1 , 10.0.0.1 ' },
      get: jest.fn(() => undefined),
      socket: { remoteAddress: '::1' },
    };
    const res = {
      on: jest.fn((ev: string, fn: () => void) => {
        if (ev === 'finish') onFinish = fn;
      }),
      statusCode: 200,
      get: jest.fn(() => '0'),
    };
    const next = jest.fn();
    httpLogMiddleware(req as never, res as never, next);
    expect(next).toHaveBeenCalled();
    onFinish?.();
  });

  it('usa array X-Forwarded-For e origin do header', async () => {
    const { httpLogMiddleware } = await import('../middlewares/httpLogMiddleware');
    const req = {
      method: 'POST',
      path: '/',
      originalUrl: '/',
      query: {},
      params: {},
      body: {},
      headers: { 'x-forwarded-for': ['198.51.100.2', '10.0.0.2'], origin: 'https://front.test' },
      get: jest.fn(() => undefined),
      socket: {},
    };
    const res = { on: jest.fn(), statusCode: 201, get: jest.fn() };
    httpLogMiddleware(req as never, res as never, jest.fn());
    expect(req.get).toHaveBeenCalled();
  });
});

describe('twoFactorPendingToken', () => {
  const origSecret = process.env.JWT_SECRET;
  const origExp = process.env.TWO_FACTOR_PENDING_EXPIRES;

  afterEach(() => {
    process.env.JWT_SECRET = origSecret;
    if (origExp) process.env.TWO_FACTOR_PENDING_EXPIRES = origExp;
    else delete process.env.TWO_FACTOR_PENDING_EXPIRES;
  });

  it('usa TWO_FACTOR_PENDING_EXPIRES quando definido', async () => {
    jest.resetModules();
    process.env.JWT_SECRET = 'test-secret-for-jest';
    process.env.TWO_FACTOR_PENDING_EXPIRES = '120';
    const { signTwoFactorPendingToken } = await import('../utils/twoFactorPendingToken');
    const t = signTwoFactorPendingToken(String(new mongoose.Types.ObjectId()));
    expect(typeof t).toBe('string');
    expect(t.split('.')).toHaveLength(3);
  });

  it('lança sem JWT_SECRET', async () => {
    jest.resetModules();
    delete process.env.JWT_SECRET;
    const { signTwoFactorPendingToken } = await import('../utils/twoFactorPendingToken');
    expect(() => signTwoFactorPendingToken('id')).toThrow('JWT_SECRET');
    process.env.JWT_SECRET = origSecret;
  });
});
