// @ts-nocheck
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

jest.mock('../services/ragTrilhaContext', () => ({
  buscarContextoRagTrilha: jest.fn().mockResolvedValue('Trecho RAG de teste'),
}));

import { gerarSugestaoTrilhaViaServicoIa, gerarSugestaoTrilhaComGemini } from '../services/geminiTrilhaSugestaoService';

const origFetch = global.fetch;

afterEach(() => {
  global.fetch = origFetch;
  delete process.env.TRILHA_IA_API_URL;
  delete process.env.TRILHA_IA_API_KEY;
  delete process.env.TRILHA_IA_TIMEOUT_MS;
});

function mockFetch(impl: typeof global.fetch) {
  global.fetch = impl as typeof global.fetch;
}

describe('gerarSugestaoTrilhaViaServicoIa', () => {
  beforeEach(() => {
    process.env.TRILHA_IA_API_URL = 'http://localhost:9999';
    delete process.env.TRILHA_IA_API_KEY;
  });

  it('rejeita matéria vazia', async () => {
    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: '   ' })).rejects.toThrow('matéria é obrigatória');
  });

  it('monta URL completa quando base termina em /api/trilha/gerar', async () => {
    process.env.TRILHA_IA_API_URL = 'http://ms/api/trilha/gerar';
    let calledUrl = '';
    mockFetch(
      jest.fn().mockImplementation((url: string, init: RequestInit) => {
        calledUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () =>
            JSON.stringify({
              modulos: [
                {
                  titulo: 'M1',
                  descricao: 'D1',
                  perguntas: [
                    {
                      enunciado: 'P1',
                      alternativas: ['a'],
                      indiceRespostaCorreta: NaN,
                    },
                  ],
                },
              ],
            }),
        });
      })
    );

    const out = await gerarSugestaoTrilhaViaServicoIa({
      materia: 'Matemática',
      titulo: '  Título curso  ',
      dificuldade: 'Medio',
      temaOuObjetivo: ' frações ',
      numeroSecoes: 1,
      fasesPorSecao: 1,
      perguntasPorFase: 2,
    });

    expect(calledUrl).toBe('http://ms/api/trilha/gerar');
    expect(out.trilha.materia).toBe('Matemática');
    expect(out.trilha.dificuldade).toBe('Medio');
    expect(out.secoes.length).toBeGreaterThan(0);
    expect(out.secoes[0].fases[0].perguntas[0].enunciado).toBe('P1');
  });

  it('agrupa duas fases na mesma seção quando fasesPorSecao é 2', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () =>
          JSON.stringify({
            modulos: [
              { titulo: 'F1', descricao: 'a', perguntas: [] },
              { titulo: 'F2', descricao: 'b', perguntas: [] },
            ],
          }),
      })
    );

    const out = await gerarSugestaoTrilhaViaServicoIa({
      materia: 'Ciências',
      numeroSecoes: 1,
      fasesPorSecao: 2,
    });
    expect(out.secoes[0].fases.length).toBe(2);
    expect(out.secoes[0].titulo).toBe('Seção 1');
  });

  it('usa sufixo /trilha/gerar quando a base termina em /api', async () => {
    process.env.TRILHA_IA_API_URL = 'http://ms/api';
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () =>
          JSON.stringify({
            modulos: [
              { titulo: 'A', descricao: '', perguntas: [{ enunciado: 'Q', alternativas: ['1', '2', '3', '4'], indiceRespostaCorreta: 2 }] },
              { titulo: 'B', descricao: 'bd', perguntas: [] },
            ],
          }),
      })
    );

    const out = await gerarSugestaoTrilhaViaServicoIa({
      materia: 'História',
      dificuldade: 'Dificil',
      numeroSecoes: 2,
      fasesPorSecao: 1,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://ms/api/trilha/gerar',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
    expect(out.secoes.length).toBeGreaterThanOrEqual(1);
  });

  it('envia Authorization quando TRILHA_IA_API_KEY está definida', async () => {
    process.env.TRILHA_IA_API_KEY = 'secret-key';
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ modulos: [{ titulo: 'X', descricao: 'Y', perguntas: [] }] }),
      })
    );

    await gerarSugestaoTrilhaViaServicoIa({ materia: 'Física' });
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer secret-key');
  });

  it('aceita resposta no formato { trilha, secoes } e normaliza', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () =>
          JSON.stringify({
            trilha: {
              titulo: 'T',
              descricao: 'D',
              materia: 'Bio',
              dificuldade: 'Facil',
              faseSelecionada: 0,
            },
            secoes: [
              {
                ordem: 1,
                titulo: 'S1',
                descricao: 'sd',
                fases: [
                  {
                    ordem: 1,
                    titulo: 'F1',
                    descricao: 'fd',
                    conteudo: 'c',
                    perguntas: [{ enunciado: 'e', alternativas: ['w', 'x'], respostaCorreta: 'z' }],
                  },
                ],
              },
            ],
          }),
      })
    );

    const out = await gerarSugestaoTrilhaViaServicoIa({ materia: 'Biologia' });
    expect(out.trilha.titulo).toBe('T');
    expect(out.secoes[0].fases[0].perguntas[0].respostaCorreta).toBe('w');
  });

  it('aceita resposta aninhada em data e sugestao', async () => {
    const body = {
      trilha: { titulo: 'T2', descricao: '', materia: 'm', dificuldade: 'Facil', faseSelecionada: 1 },
      secoes: [],
    };
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ data: { sugestao: body } }),
      })
    );

    const out = await gerarSugestaoTrilhaViaServicoIa({ materia: 'Química' });
    expect(out.trilha.titulo).toBe('T2');
  });

  it('lança quando o corpo não é JSON', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => 'not-json{',
      })
    );
    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: 'Arte' })).rejects.toThrow('não-JSON');
  });

  it('lança em HTTP de erro com campo message', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable',
        text: async () => JSON.stringify({ message: 'falhou' }),
      })
    );
    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: 'Música' })).rejects.toThrow(/HTTP 422|falhou/);
  });

  it('lança em HTTP de erro com campo erro', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad',
        text: async () => JSON.stringify({ erro: 'bad req' }),
      })
    );
    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: 'Geo' })).rejects.toThrow('bad req');
  });

  it('lança em HTTP de erro sem JSON útil', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'SrvErr',
        text: async () => 'plain',
      })
    );
    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: 'Filosofia' })).rejects.toThrow('HTTP 500');
  });

  it('lança em falha de rede', async () => {
    mockFetch(jest.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: 'Português' })).rejects.toThrow('Falha de rede');
  });

  it('lança em timeout (AbortError)', async () => {
    process.env.TRILHA_IA_TIMEOUT_MS = '10000';
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    mockFetch(jest.fn().mockRejectedValue(abortErr));
    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: 'Inglês' })).rejects.toThrow('Timeout ao chamar');
  });

  it('dispara o timer interno (setTimeout) e aborta o fetch pendente', async () => {
    jest.useFakeTimers();
    try {
      process.env.TRILHA_IA_API_URL = 'http://localhost:9999';
      process.env.TRILHA_IA_TIMEOUT_MS = '10000';
      mockFetch(
        jest.fn().mockImplementation((_url, init) => {
          return new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const err = new Error('Aborted');
              err.name = 'AbortError';
              reject(err);
            });
          });
        })
      );
      const p = gerarSugestaoTrilhaViaServicoIa({ materia: 'Química' });
      const assertion = expect(p).rejects.toThrow(/Timeout ao chamar serviço de IA/);
      await jest.advanceTimersByTimeAsync(10001);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it('lança quando trilha/secoes estão incompletos após extração', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ trilha: null, secoes: [] }),
      })
    );
    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: 'X' })).rejects.toThrow('incompleta');
  });

  it('lança quando formato da resposta não é reconhecido', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ foo: 1 }),
      })
    );
    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: 'Educação Física' })).rejects.toThrow('não reconhecido');
  });

  it('gerarSugestaoTrilhaComGemini aponta para a mesma implementação', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () =>
          JSON.stringify({
            modulos: [{ titulo: 'Dep', descricao: '', perguntas: [{ enunciado: 'q', alternativas: ['a', 'b', 'c', 'd'] }] }],
          }),
      })
    );
    const a = await gerarSugestaoTrilhaViaServicoIa({ materia: 'X' });
    const b = await gerarSugestaoTrilhaComGemini({ materia: 'X' });
    expect(typeof a.trilha.titulo).toBe('string');
    expect(typeof b.trilha.titulo).toBe('string');
  });
});
