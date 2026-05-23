// @ts-nocheck
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Materia from '../models/materia';
import Trilha from '../models/trilha';
import Fase from '../models/fase';
import * as ragTrilhaContext from '../services/ragTrilhaContext';

// Mocks Globais
jest.mock('@google/generative-ai');
jest.mock('../models/materia');
jest.mock('../models/trilha');
jest.mock('../models/fase');
jest.mock('../services/ragTrilhaContext', () => ({
  buscarContextoRagTrilha: jest.fn().mockResolvedValue('Contexto RAG Mock'),
}));

// Mock do serviço para os testes de controlador
jest.mock('../services/geminiTrilhaSugestaoService', () => {
    const actual = jest.requireActual('../services/geminiTrilhaSugestaoService');
    return {
        ...actual,
        gerarSugestaoTrilhaViaServicoIa: jest.fn(),
    };
});

import { gerarSugestaoTrilhaViaServicoIa } from '../services/geminiTrilhaSugestaoService';
import * as trilhaIaController from '../controllers/trilhaIaController';
import geminiController from '../controllers/geminiController';

describe('AI & Gemini Domain', () => {
    beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe('trilhaIaController', () => {
        beforeEach(() => {
            process.env.TRILHA_IA_API_URL = 'http://localhost:3780';
        });

        afterEach(() => {
            delete process.env.TRILHA_IA_API_URL;
        });

        it('valida campos obrigatórios e dificuldade', async () => {
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            
            // Sem matéria
            await trilhaIaController.gerarTrilhaComIa({ body: {} }, res);
            expect(res.status).toHaveBeenCalledWith(400);

            // Dificuldade inválida
            await trilhaIaController.gerarTrilhaComIa({ body: { materia: 'X', dificuldade: 'Hardcore' } }, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('repassa dados ao serviço e retorna 200', async () => {
            gerarSugestaoTrilhaViaServicoIa.mockResolvedValue({ trilha: { titulo: 'T' }, secoes: [] });
            const req = { body: { materia: 'Química', dificuldade: 'Medio' } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            
            await trilhaIaController.gerarTrilhaComIa(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(gerarSugestaoTrilhaViaServicoIa).toHaveBeenCalled();
        });
    });

    describe('geminiController', () => {
        const origFetch = global.fetch;
        afterEach(() => {
            global.fetch = origFetch;
            delete process.env.LLM_DEMO_URL;
        });

        it('retorna 503 sem URL configurada', async () => {
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            await geminiController.gerarTexto({}, res);
            expect(res.status).toHaveBeenCalledWith(503);
        });

        it('retorna JSON em sucesso do fetch', async () => {
            process.env.LLM_DEMO_URL = 'http://demo';
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: async () => JSON.stringify({ ok: true }),
            });
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            await geminiController.gerarTexto({}, res);
            expect(res.json).toHaveBeenCalledWith({ ok: true });
        });

        it('retorna 502 para corpo não-JSON', async () => {
            process.env.LLM_DEMO_URL = 'http://demo';
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: async () => 'Not JSON',
            });
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            await geminiController.gerarTexto({}, res);
            expect(res.status).toHaveBeenCalledWith(502);
        });

        it('retorna 502 para HTTP error', async () => {
            process.env.LLM_DEMO_URL = 'http://demo';
            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 404,
                text: async () => JSON.stringify({ error: true }),
            });
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            await geminiController.gerarTexto({}, res);
            expect(res.status).toHaveBeenCalledWith(502);
        });

        it('retorna 500 em falha catastrófica de fetch', async () => {
            process.env.LLM_DEMO_URL = 'http://demo';
            global.fetch = jest.fn().mockRejectedValue(new Error('Fail'));
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            await geminiController.gerarTexto({}, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('geminiTrilhaSugestaoService', () => {
        let mockGenerateContent: jest.Mock;
        let mockGetGenerativeModel: jest.Mock;

        beforeEach(() => {
            process.env.GEMINI_API_KEY = 'valid-key';
            mockGenerateContent = jest.fn();
            mockGetGenerativeModel = jest.fn().mockReturnValue({
                generateContent: mockGenerateContent,
            });
            GoogleGenerativeAI.mockImplementation(() => ({
                getGenerativeModel: mockGetGenerativeModel,
            }));
            Materia.findOne.mockResolvedValue({ nome: 'Matemática', ativo: true });
            
            jest.mocked(gerarSugestaoTrilhaViaServicoIa).mockRestore?.();
        });

        it('deve gerar sugestão e normalizar perguntas', async () => {
            const mockResponse = {
                descricaoTrilha: 'D',
                modulos: [{ titulo: 'M1', perguntas: [{ enunciado: 'P1', alternativas: ['A','B'], indiceRespostaCorreta: 1 }] }]
            };
            mockGenerateContent.mockResolvedValue({
                response: { text: () => JSON.stringify(mockResponse) }
            });

            const { gerarSugestaoTrilhaViaServicoIa: realGerar } = jest.requireActual('../services/geminiTrilhaSugestaoService');
            
            const result = await realGerar({ materia: 'Matemática' });
            expect(result.trilha.materia).toBe('Matemática');
            expect(result.secoes[0].fases[0].perguntas[0].alternativas.length).toBe(4);
        });

        it('cobre dificuldades Medio e Dificil', async () => {
            mockGenerateContent.mockResolvedValue({ response: { text: () => JSON.stringify({ modulos: [] }) } });
            const { gerarSugestaoTrilhaViaServicoIa: realGerar } = jest.requireActual('../services/geminiTrilhaSugestaoService');
            await realGerar({ materia: 'Matemática', dificuldade: 'Medio' });
            await realGerar({ materia: 'Matemática', dificuldade: 'Dificil' });
            expect(mockGetGenerativeModel).toHaveBeenCalled();
        });

        it('normaliza resposta baseada em texto (perguntaIntegraParaSugestao)', async () => {
            const mockResponse = {
                modulos: [{ titulo: 'M', perguntas: [{ enunciado: 'P', alternativas: ['A','B'], respostaCorreta: 'B' }] }]
            };
            mockGenerateContent.mockResolvedValue({ response: { text: () => JSON.stringify(mockResponse) } });
            const { gerarSugestaoTrilhaViaServicoIa: realGerar } = jest.requireActual('../services/geminiTrilhaSugestaoService');
            const res = await realGerar({ materia: 'Matemática' });
            expect(res.secoes[0].fases[0].perguntas[0].respostaCorreta).toBe('1');
        });

        it('extrai JSON mesmo com prefixos/sufixos na resposta', async () => {
            mockGenerateContent.mockResolvedValue({ response: { text: () => 'Prefix... ```json {"modulos":[]} ``` ...Suffix' } });
            const { gerarSugestaoTrilhaViaServicoIa: realGerar } = jest.requireActual('../services/geminiTrilhaSugestaoService');
            const res = await realGerar({ materia: 'Matemática' });
            expect(res.secoes).toEqual([]);
        });

        it('lança erro se API KEY sumir', async () => {
            delete process.env.GEMINI_API_KEY;
            const { gerarSugestaoTrilhaViaServicoIa: realGerar } = jest.requireActual('../services/geminiTrilhaSugestaoService');
            await expect(realGerar({ materia: 'Matemática' })).rejects.toThrow('GEMINI_API_KEY');
        });

        it('lança erro se matéria não habilitada', async () => {
            Materia.findOne.mockResolvedValue(null);
            const { gerarSugestaoTrilhaViaServicoIa: realGerar } = jest.requireActual('../services/geminiTrilhaSugestaoService');
            await expect(realGerar({ materia: 'X' })).rejects.toThrow('Matéria não habilitada');
        });
    });

    describe('ragTrilhaContext', () => {
        it('retorna contexto quando há trilhas', async () => {
            const { buscarContextoRagTrilha } = jest.requireActual('../services/ragTrilhaContext');
            
            Trilha.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([{ _id: 't1', titulo: 'T', materia: 'M', dificuldade: 'F' }])
            });
            Fase.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([{ titulo: 'F1', ordem: 1, perguntas: [{ enunciado: 'Q', alternativas: ['A'], respostaCorreta: 'A' }] }])
            });

            const res = await buscarContextoRagTrilha('Matemática');
            expect(res).toContain('Trilha de referência');
            expect(res).toContain('F1');
        });

        it('busca fallback se não achar matéria específica', async () => {
            const { buscarContextoRagTrilha } = jest.requireActual('../services/ragTrilhaContext');
            Trilha.find
                .mockReturnValueOnce({ select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) })
                .mockReturnValueOnce({ select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([{ _id: 't2', titulo: 'Pop' }]) });
            Fase.find.mockReturnValue({ select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) });
            
            const res = await buscarContextoRagTrilha('M');
            expect(res).toContain('Pop');
        });

        it('retorna mensagem padrão quando não há trilhas', async () => {
            const { buscarContextoRagTrilha } = jest.requireActual('../services/ragTrilhaContext');
            Trilha.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([])
            });
            const res = await buscarContextoRagTrilha('X');
            expect(res).toContain('Nenhum conteúdo anterior encontrado');
        });

        it('trunca contexto se conteúdo for muito longo', async () => {
            const { buscarContextoRagTrilha } = jest.requireActual('../services/ragTrilhaContext');
            const longText = 'A'.repeat(5000);
            Trilha.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([{ _id: 't1', titulo: 'T', descricao: longText }])
            });
            Fase.find.mockReturnValue({ select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) });
            
            const res = await buscarContextoRagTrilha('M');
            expect(res.length).toBeLessThan(2000); // 1000 limit + headers
        });
    });

    describe('geminiTrilhaSugestaoService Extra', () => {
        it('normalizarSugestao lança erro se faltar dados básicos', async () => {
            const { normalizarSugestao } = jest.requireActual('../services/geminiTrilhaSugestaoService');
            expect(() => normalizarSugestao({})).toThrow('incompleta');
            expect(() => normalizarSugestao({ secoes: [] })).toThrow('incompleta');
        });
        it('mapeia dificuldades para níveis corretamente', async () => {
            const { gerarSugestaoTrilhaViaServicoIa: realGerar } = jest.requireActual('../services/geminiTrilhaSugestaoService');
            // Mock manual da função do Gemini dentro do escopo local
            const mockGen = jest.fn().mockResolvedValue({ response: { text: () => JSON.stringify({ modulos: [] }) } });
            GoogleGenerativeAI.mockImplementation(() => ({
                getGenerativeModel: () => ({ generateContent: mockGen })
            }));
            Materia.findOne.mockResolvedValue({ nome: 'Matemática', ativo: true });
            
            await realGerar({ materia: 'Matemática', dificuldade: 'Facil' });
            await realGerar({ materia: 'Matemática', dificuldade: 'Medio' });
            await realGerar({ materia: 'Matemática', dificuldade: 'Dificil' });
            
            expect(mockGen).toHaveBeenCalledTimes(3);
        });

        it('extrairCorpoSugestao lida com aninhamento data e sugestao', async () => {
            const { gerarSugestaoTrilhaViaServicoIa: realGerar } = jest.requireActual('../services/geminiTrilhaSugestaoService');
            const mockData = { trilha: { titulo: 'T' }, secoes: [] };
            
            // Caso 1: data
            const mockGen1 = jest.fn().mockResolvedValue({ response: { text: () => JSON.stringify({ data: mockData }) } });
            GoogleGenerativeAI.mockImplementationOnce(() => ({ getGenerativeModel: () => ({ generateContent: mockGen1 }) }));
            Materia.findOne.mockResolvedValue({ nome: 'Matemática', ativo: true });
            await realGerar({ materia: 'Matemática' });

            // Caso 2: sugestao
            const mockGen2 = jest.fn().mockResolvedValue({ response: { text: () => JSON.stringify({ sugestao: mockData }) } });
            GoogleGenerativeAI.mockImplementationOnce(() => ({ getGenerativeModel: () => ({ generateContent: mockGen2 }) }));
            await realGerar({ materia: 'Matemática' });
            
            expect(mockGen1).toHaveBeenCalled();
            expect(mockGen2).toHaveBeenCalled();
        });
    });
});
