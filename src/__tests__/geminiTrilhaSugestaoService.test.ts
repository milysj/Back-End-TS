// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Materia from '../models/materia';
import * as ragTrilhaContext from '../services/ragTrilhaContext';

// Mock do Gemini SDK
jest.mock('@google/generative-ai');

// Mock do RAG
jest.mock('../services/ragTrilhaContext', () => ({
  buscarContextoRagTrilha: jest.fn().mockResolvedValue('Contexto RAG Mock'),
}));

// Mock do Modelo Materia
jest.mock('../models/materia');

import { gerarSugestaoTrilhaViaServicoIa, gerarSugestaoTrilhaComGemini } from '../services/geminiTrilhaSugestaoService';

describe('gerarSugestaoTrilhaViaServicoIa', () => {
  let mockGenerateContent: jest.Mock;
  let mockGetGenerativeModel: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'valid-key';
    process.env.GEMINI_MODEL = 'gemini-pro';

    mockGenerateContent = jest.fn();
    mockGetGenerativeModel = jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });

    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    // Mock padrão de matéria encontrada
    Materia.findOne.mockResolvedValue({ nome: 'Matemática', ativo: true });
  });

  it('deve lançar erro se a matéria estiver vazia', async () => {
    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: '' })).rejects.toThrow('matéria é obrigatória');
  });

  it('deve lançar erro se a matéria não estiver habilitada no banco', async () => {
    Materia.findOne.mockResolvedValue(null);
    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: 'Inexistente' })).rejects.toThrow('Matéria não habilitada');
  });

  it('deve lançar erro se GEMINI_API_KEY não estiver configurada', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: 'Matemática' })).rejects.toThrow('GEMINI_API_KEY não está configurada');
  });

  it('deve gerar sugestão com sucesso (formato IntegraTrilha)', async () => {
    const mockResponse = {
      descricaoTrilha: 'Uma trilha de teste',
      modulos: [
        {
          titulo: 'Módulo 1',
          descricao: 'Desc 1',
          perguntas: [
            {
              enunciado: 'Quanto é 1+1?',
              alternativas: ['1', '2', '3', '4'],
              indiceRespostaCorreta: 1
            }
          ]
        }
      ]
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(mockResponse)
      }
    });

    const resultado = await gerarSugestaoTrilhaViaServicoIa({ materia: 'Matemática' });

    expect(resultado.trilha.titulo).toContain('Módulo 1');
    expect(resultado.trilha.materia).toBe('Matemática');
    expect(resultado.secoes.length).toBe(1);
    expect(resultado.secoes[0].fases[0].perguntas[0].respostaCorreta).toBe('1');
  });

  it('deve lidar com JSON envolto em blocos de código markdown', async () => {
    const mockResponse = {
      descricaoTrilha: 'Teste Markdown',
      modulos: []
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => `\`\`\`json\n${JSON.stringify(mockResponse)}\n\`\`\``
      }
    });

    const resultado = await gerarSugestaoTrilhaViaServicoIa({ materia: 'Matemática' });
    expect(resultado.trilha.descricao).toBe('Teste Markdown');
  });

  it('deve extrair JSON de texto sujo (quando há texto antes/depois do JSON)', async () => {
     mockGenerateContent.mockResolvedValue({
      response: {
        text: () => `Aqui está o seu JSON: {"descricaoTrilha": "Sujo", "modulos": []} Espero que goste!`
      }
    });

    const resultado = await gerarSugestaoTrilhaViaServicoIa({ materia: 'Matemática' });
    expect(resultado.trilha.descricao).toBe('Sujo');
  });

  it('deve lançar erro se a LLM não retornar um JSON válido', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Texto puro sem JSON'
      }
    });

    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: 'Matemática' })).rejects.toThrow('A LLM nao retornou um JSON valido');
  });

  it('deve aceitar resposta no formato legado { trilha, secoes }', async () => {
    const mockResponse = {
      trilha: {
        titulo: 'Legado',
        descricao: 'D',
        materia: 'M',
        dificuldade: 'Facil',
        faseSelecionada: 1
      },
      secoes: [
        {
          ordem: 1,
          titulo: 'S1',
          descricao: 'D1',
          fases: []
        }
      ]
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(mockResponse)
      }
    });

    const resultado = await gerarSugestaoTrilhaViaServicoIa({ materia: 'Matemática' });
    expect(resultado.trilha.titulo).toBe('Legado');
    expect(resultado.secoes[0].titulo).toBe('S1');
  });

  it('deve aceitar resposta aninhada em data ou sugestao', async () => {
    const mockResponse = {
      data: {
        sugestao: {
          trilha: { titulo: 'Aninhado', descricao: '', materia: 'M', dificuldade: 'Facil', faseSelecionada: 1 },
          secoes: []
        }
      }
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(mockResponse)
      }
    });

    const resultado = await gerarSugestaoTrilhaViaServicoIa({ materia: 'Matemática' });
    expect(resultado.trilha.titulo).toBe('Aninhado');
  });

  it('deve lançar erro se o formato for irreconhecível', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({ algo: 'errado' })
      }
    });

    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: 'Matemática' })).rejects.toThrow('Formato de resposta do serviço de IA não reconhecido');
  });

  it('deve lançar erro se a chamada ao Gemini falhar', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API Down'));
    await expect(gerarSugestaoTrilhaViaServicoIa({ materia: 'Matemática' })).rejects.toThrow('Falha ao chamar a IA: API Down');
  });

  it('gerarSugestaoTrilhaComGemini deve ser um alias para gerarSugestaoTrilhaViaServicoIa', () => {
    expect(gerarSugestaoTrilhaComGemini).toBe(gerarSugestaoTrilhaViaServicoIa);
  });

  it('deve normalizar alternativas e resposta correta (correção de índice/texto)', async () => {
    const mockResponse = {
      descricaoTrilha: 'Normalização',
      modulos: [
        {
          titulo: 'M1',
          descricao: 'D1',
          perguntas: [
            {
              enunciado: 'P1',
              alternativas: [' A ', ' B ', ' C '], // menos de 4
              indiceRespostaCorreta: 2
            }
          ]
        }
      ]
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(mockResponse)
      }
    });

    const resultado = await gerarSugestaoTrilhaViaServicoIa({ materia: 'Matemática' });
    const p = resultado.secoes[0].fases[0].perguntas[0];
    expect(p.alternativas.length).toBe(4);
    expect(p.alternativas[0]).toBe('A');
    expect(p.respostaCorreta).toBe('2');
  });

  it('deve lidar com dificuldades Medio e Dificil e normalizar respostas em formato A, B, C, D', async () => {
    Materia.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'm1', nome: 'Mat' })
    });

    const mockResponse = {
      modulos: [
        {
          titulo: 'M1',
          descricao: 'D1',
          perguntas: [
            { enunciado: 'Q1', alternativas: ['A1', 'B1'], indiceRespostaCorreta: 'B' },
            { enunciado: 'Q2', alternativas: ['A2', 'B2'], indiceRespostaCorreta: '2' }
          ]
        }
      ]
    };

    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(mockResponse) }
    });

    const resultMedio = await gerarSugestaoTrilhaViaServicoIa({
      materia: 'Mat',
      dificuldade: 'Medio'
    });
    expect(resultMedio.trilha.dificuldade).toBe('Medio');
    expect(resultMedio.secoes[0].fases[0].perguntas[0].respostaCorreta).toBe('1'); // B -> 1
    expect(resultMedio.secoes[0].fases[0].perguntas[1].respostaCorreta).toBe('2'); // 2 -> 2

    const resultDificil = await gerarSugestaoTrilhaViaServicoIa({
      materia: 'Mat',
      dificuldade: 'Dificil'
    });
    expect(resultDificil.trilha.dificuldade).toBe('Dificil');
  });

  it('deve tratar erro na normalização de sugestão individualmente', async () => {
      Materia.findOne.mockReturnValue({
          select: jest.fn().mockResolvedValue({ _id: 'm1', nome: 'Mat' })
      });
      // Um módulo sem título para causar erro na normalização se houver validação ou apenas para testar o catch
      const mockResponse = {
          modulos: [
              null, // Isso deve causar erro ao tentar acessar modulos[0].titulo
              { titulo: 'M2', descricao: 'D2', perguntas: [] }
          ]
      };
      mockGenerateContent.mockResolvedValue({
          response: { text: () => JSON.stringify(mockResponse) }
      });

      const result = await gerarSugestaoTrilhaViaServicoIa({ materia: 'Mat' });
      expect(result.secoes.length).toBe(1); // M2 deve ter passado, null deve ter falhado
  });
});
