// @ts-nocheck
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

jest.mock('../services/geminiTrilhaSugestaoService', () => ({
  gerarSugestaoTrilhaViaServicoIa: jest.fn(),
}));

import { gerarSugestaoTrilhaViaServicoIa } from '../services/geminiTrilhaSugestaoService';
import * as trilhaIaController from '../controllers/trilhaIaController';
import geminiController from '../controllers/geminiController';

const mockGerar = gerarSugestaoTrilhaViaServicoIa;

describe('trilhaIaController', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.TRILHA_IA_API_URL = 'http://localhost:3780';
  });

  afterEach(() => {
    delete process.env.TRILHA_IA_API_URL;
  });

  it('retorna 503 quando TRILHA_IA_API_URL não está definida', async () => {
    delete process.env.TRILHA_IA_API_URL;
    const req = { body: { materia: 'Mat' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaIaController.gerarTrilhaComIa(req, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('retorna 503 quando TRILHA_IA_API_URL é só espaços', async () => {
    process.env.TRILHA_IA_API_URL = '   ';
    const req = { body: { materia: 'Mat' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaIaController.gerarTrilhaComIa(req, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('retorna 400 quando materia está ausente', async () => {
    const req = { body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaIaController.gerarTrilhaComIa(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 quando materia não é string', async () => {
    const req = { body: { materia: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaIaController.gerarTrilhaComIa(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 para dificuldade inválida', async () => {
    const req = { body: { materia: 'Física', dificuldade: 'Extremo' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaIaController.gerarTrilhaComIa(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 quando dificuldade informada não é string', async () => {
    const req = { body: { materia: 'X', dificuldade: 2 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaIaController.gerarTrilhaComIa(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 200 e repassa campos opcionais ao serviço', async () => {
    mockGerar.mockResolvedValue({ trilha: { titulo: 'T' }, secoes: [] });
    const req = {
      body: {
        materia: ' Química ',
        dificuldade: 'Medio',
        titulo: 'Curso',
        temaOuObjetivo: 'Átomos',
        numeroSecoes: 2,
        fasesPorSecao: 2,
        perguntasPorFase: 3,
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaIaController.gerarTrilhaComIa(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockGerar).toHaveBeenCalledWith({
      materia: ' Química ',
      titulo: 'Curso',
      dificuldade: 'Medio',
      temaOuObjetivo: 'Átomos',
      numeroSecoes: 2,
      fasesPorSecao: 2,
      perguntasPorFase: 3,
    });
  });

  it('omite dificuldade quando null, string vazia ou não enviada', async () => {
    mockGerar.mockResolvedValue({ trilha: {}, secoes: [] });
    for (const body of [{ materia: 'A', dificuldade: null }, { materia: 'B', dificuldade: '' }, { materia: 'C' }]) {
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await trilhaIaController.gerarTrilhaComIa({ body }, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockGerar).toHaveBeenCalledWith(expect.objectContaining({ dificuldade: undefined }));
    }
  });

  it('não repassa titulo/tema quando não são string', async () => {
    mockGerar.mockResolvedValue({ trilha: {}, secoes: [] });
    const req = { body: { materia: 'M', titulo: 9, temaOuObjetivo: {} } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaIaController.gerarTrilhaComIa(req, res);
    expect(mockGerar).toHaveBeenCalledWith({
      materia: 'M',
      titulo: undefined,
      dificuldade: undefined,
      temaOuObjetivo: undefined,
      numeroSecoes: undefined,
      fasesPorSecao: undefined,
      perguntasPorFase: undefined,
    });
  });

  it('retorna 500 quando o serviço lança', async () => {
    mockGerar.mockRejectedValue(new Error('falha-ia'));
    const req = { body: { materia: 'Bio' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await trilhaIaController.gerarTrilhaComIa(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Erro ao gerar sugestões com IA.', error: 'falha-ia' })
    );
  });
});

describe('geminiController', () => {
  const origFetch = global.fetch;

  afterEach(() => {
    global.fetch = origFetch;
    delete process.env.LLM_DEMO_URL;
    delete process.env.LLM_DEMO_API_KEY;
  });

  it('retorna 503 sem LLM_DEMO_URL', async () => {
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await geminiController.gerarTexto(req, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('retorna 503 quando LLM_DEMO_URL é só espaços', async () => {
    process.env.LLM_DEMO_URL = '  ';
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await geminiController.gerarTexto(req, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('retorna JSON em sucesso', async () => {
    process.env.LLM_DEMO_URL = 'http://demo/llm';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ resultado: 1 }),
    });
    const req = {};
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await geminiController.gerarTexto(req, res);
    expect(res.json).toHaveBeenCalledWith({ resultado: 1 });
  });

  it('aceita corpo vazio da demo como null', async () => {
    process.env.LLM_DEMO_URL = 'http://demo/llm';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
    const req = {};
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await geminiController.gerarTexto(req, res);
    expect(res.json).toHaveBeenCalledWith(null);
  });

  it('retorna 502 quando o corpo não é JSON', async () => {
    process.env.LLM_DEMO_URL = 'http://demo/llm';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'not-json' });
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await geminiController.gerarTexto(req, res);
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('retorna 502 em HTTP de erro da demo', async () => {
    process.env.LLM_DEMO_URL = 'http://demo/llm';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ e: 1 }),
    });
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await geminiController.gerarTexto(req, res);
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('retorna 500 em falha de rede', async () => {
    process.env.LLM_DEMO_URL = 'http://demo/llm';
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNRESET'));
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await geminiController.gerarTexto(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('envia Authorization quando LLM_DEMO_API_KEY está definida', async () => {
    process.env.LLM_DEMO_URL = 'http://demo/llm';
    process.env.LLM_DEMO_API_KEY = 'secret';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '{}' });
    const req = {};
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await geminiController.gerarTexto(req, res);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://demo/llm',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      })
    );
  });
});
