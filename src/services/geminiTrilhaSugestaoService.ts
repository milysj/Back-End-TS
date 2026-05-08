import { buscarContextoRagTrilha } from "./ragTrilhaContext";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type DificuldadeTrilha = "Facil" | "Medio" | "Dificil";

export interface GerarSugestaoTrilhaInput {
  materia: string;
  titulo?: string;
  dificuldade?: DificuldadeTrilha;
  /** Foco pedagógico opcional (ex.: "frações para 6º ano") */
  temaOuObjetivo?: string;
  numeroSecoes?: number;
  fasesPorSecao?: number;
  perguntasPorFase?: number;
}
 
export interface PerguntaSugestao {
  enunciado: string;
  alternativas: string[];
  respostaCorreta: string;
}

export interface FaseSugestao {
  ordem: number;
  titulo: string;
  descricao: string;
  conteudo: string;
  perguntas: PerguntaSugestao[];
}

export interface SecaoSugestao {
  ordem: number;
  titulo: string;
  descricao: string;
  fases: FaseSugestao[];
}

export interface TrilhaSugestaoResposta {
  trilha: {
    titulo: string;
    descricao: string;
    materia: string;
    dificuldade: DificuldadeTrilha;
    /** Número total de fases sugeridas (útil para o campo faseSelecionada no front) */
    faseSelecionada: number;
  };
  secoes: SecaoSugestao[];
}

/** Corpo enviado ao Integra-o-LLM — espelha `GerarTrilhaRequest` (ver `Integra-o-LLM/src/types/trilha.ts`). */
export interface IntegraTrilhaGerarBody {
  titulo?: string;
  tema: string;
  nivel?: "iniciante" | "intermediario" | "avancado";
  /** RAG do Estudemy (Mongo) + notas; o microsserviço injeta no prompt. */
  contextoAdicional?: string;
  numeroModulos?: number;
  perguntasPorModulo?: number;
}

/** Resposta do microsserviço Integra-o-LLM (`POST /api/trilha/gerar`). */
interface IntegraTrilhaApiResponse {
  descricaoTrilha?: string;
  modulos: {
    titulo: string;
    descricao: string;
    perguntas: {
      enunciado: string;
      alternativas: string[];
      indiceRespostaCorreta?: number;
    }[];
  }[];
}

function dificuldadeParaNivel(
  d: DificuldadeTrilha
): "iniciante" | "intermediario" | "avancado" {
  if (d === "Facil") return "iniciante";
  if (d === "Medio") return "intermediario";
  return "avancado";
}

function perguntaIntegraParaSugestao(p: any): PerguntaSugestao {
  const alts = [...(p.alternativas || p.opcoes || [])].map((a) => String(a).trim()).filter(Boolean);
  while (alts.length < 4) alts.push(`Alternativa ${alts.length + 1}`);
  const slice = alts.slice(0, 4);

  let idx = 0;
  
  if (p.indiceRespostaCorreta !== undefined && p.indiceRespostaCorreta !== null) {
      const val = String(p.indiceRespostaCorreta).trim().toUpperCase();
      if (val === 'A') idx = 0;
      else if (val === 'B') idx = 1;
      else if (val === 'C') idx = 2;
      else if (val === 'D') idx = 3;
      else {
          const num = Number(val);
          if (Number.isFinite(num)) {
             idx = Math.min(3, Math.max(0, Math.floor(num)));
          }
      }
  } else if (p.respostaCorreta || p.resposta_correta) {
      const txtCorreta = String(p.respostaCorreta || p.resposta_correta).trim();
      const findIdx = slice.findIndex(alt => alt === txtCorreta);
      if (findIdx >= 0) idx = findIdx;
  }

  return { 
    enunciado: String(p.enunciado || p.pergunta || "Pergunta sem enunciado").trim(), 
    alternativas: slice, 
    respostaCorreta: String(idx) 
  };
}

/**
 * Cada "módulo" retornado pelo microsserviço vira uma fase; fases consecutivas agrupam-se em seções
 * conforme `numeroSecoes` × `fasesPorSecao` pedido pelo Estudemy.
 */
function mapIntegraResponseToSugestao(
  integra: IntegraTrilhaApiResponse,
  input: GerarSugestaoTrilhaInput & {
    numeroSecoes: number;
    fasesPorSecao: number;
    dificuldade: DificuldadeTrilha;
  }
): TrilhaSugestaoResposta {
  const mods = (integra.modulos || []).filter(Boolean);
  const secoes: SecaoSugestao[] = [];
  let idx = 0;
  for (let s = 0; s < input.numeroSecoes; s++) {
    const fases: FaseSugestao[] = [];
    for (let f = 0; f < input.fasesPorSecao && idx < mods.length; f++, idx++) {
      const m = mods[idx];
      if (!m) continue;
      fases.push({
        ordem: f + 1,
        titulo: (m.titulo || `Fase ${f + 1}`).trim(),
        descricao: (m.descricao || "").trim(),
        conteudo: (m.descricao || "").trim(),
        perguntas: (m.perguntas || []).map(perguntaIntegraParaSugestao),
      });
    }
    if (fases.length === 0) break;

    const tituloSecao =
      fases.length > 1 ? `Seção ${s + 1}` : fases[0].titulo || `Seção ${s + 1}`;
    const descricaoSecao = fases
      .map((ff) => ff.descricao)
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 1200);

    secoes.push({
      ordem: s + 1,
      titulo: tituloSecao,
      descricao: descricaoSecao || `Conteúdo da seção ${s + 1}.`,
      fases,
    });
  }

  const tituloTrilha =
    input.titulo?.trim() ||
    (mods[0]?.titulo ? String(mods[0].titulo).trim() : "") ||
    `Trilha — ${input.materia.trim()}`;

  const totalFases = secoes.reduce((n, sec) => n + sec.fases.length, 0);

  return {
    trilha: {
      titulo: tituloTrilha,
      descricao: (integra.descricaoTrilha || "").trim(),
      materia: input.materia.trim(),
      dificuldade: input.dificuldade,
      faseSelecionada:
        totalFases > 0 ? totalFases : Math.max(1, input.numeroSecoes * input.fasesPorSecao),
    },
    secoes,
  };
}

function isIntegraTrilhaShape(json: unknown): json is IntegraTrilhaApiResponse {
  if (!json || typeof json !== "object") return false;
  const o = json as Record<string, unknown>;
  return Array.isArray(o.modulos);
}

function normalizarSugestao(raw: TrilhaSugestaoResposta): TrilhaSugestaoResposta {
  if (!raw?.trilha || !Array.isArray(raw.secoes)) {
    throw new Error("Resposta do serviço de IA incompleta (trilha ou seções ausentes).");
  }

  const secoes = (raw.secoes || []).map((s) => ({
    ...s,
    fases: (s.fases || []).map((f) => ({
      ...f,
      perguntas: (f.perguntas || []).map((p) => {
        const alts = [...(p.alternativas || [])].map((a) => String(a).trim()).filter(Boolean);
        let correta = (p.respostaCorreta || "").trim();
        
        // Se for um índice (0-3), aceita. Se for texto, verifica se está nas alternativas.
        const isIndex = /^[0-3]$/.test(correta);
        if (!isIndex && !alts.includes(correta) && alts[0]) {
          correta = alts[0];
        }
        return { 
          enunciado: String(p.enunciado || "Pergunta sem enunciado").trim(), 
          alternativas: alts, 
          respostaCorreta: correta 
        };
      }),
    })),
  }));

  const totalFases = secoes.reduce((n, s) => n + (s.fases?.length || 0), 0);

  return {
    trilha: {
      ...raw.trilha,
      faseSelecionada: totalFases > 0 ? totalFases : raw.trilha.faseSelecionada,
    },
    secoes,
  };
}

function extrairCorpoSugestao(json: unknown): TrilhaSugestaoResposta {
  if (json && typeof json === "object" && "trilha" in json && "secoes" in json) {
    return json as TrilhaSugestaoResposta;
  }
  if (json && typeof json === "object" && "data" in json) {
    return extrairCorpoSugestao((json as { data: unknown }).data);
  }
  if (json && typeof json === "object" && "sugestao" in json) {
    return extrairCorpoSugestao((json as { sugestao: unknown }).sugestao);
  }
  throw new Error("Formato de resposta do serviço de IA não reconhecido (esperado { trilha, secoes }).");
}

import Materia from "../models/materia";

/**
 * Encaminha a geração ao microsserviço de LLM (URL em TRILHA_IA_API_URL).
 * Opcional: TRILHA_IA_API_KEY como Bearer; TRILHA_IA_TIMEOUT_MS (padrão 120000).
 */
export async function gerarSugestaoTrilhaViaServicoIa(input: GerarSugestaoTrilhaInput): Promise<TrilhaSugestaoResposta> {
  const materia = input.materia.trim();
  if (!materia) throw new Error("matéria é obrigatória.");

  // Validar matéria contra o banco de dados
  const materiaExiste = await Materia.findOne({ 
    nome: new RegExp(`^${materia}$`, "i"),
    ativo: true 
  });
  if (!materiaExiste) {
    throw new Error("Matéria não habilitada. Por favor, entre em contato com o suporte para solicitar a adição deste tema.");
  }

  const numeroSecoes = Math.min(8, Math.max(1, input.numeroSecoes ?? 2));
  const fasesPorSecao = Math.min(6, Math.max(1, input.fasesPorSecao ?? 1));
  const perguntasPorFase = Math.min(8, Math.max(2, input.perguntasPorFase ?? 4));
  const dificuldade: DificuldadeTrilha = input.dificuldade || "Facil";

  const contextoRag = await buscarContextoRagTrilha(materia);

  const totalFasesPedidas = numeroSecoes * fasesPorSecao;
  /** Alinhado a `GerarTrilhaRequest` do microsserviço Integra-o-LLM (`POST /api/trilha/gerar`). */
  const tema = [
    `Matéria: ${materia}`,
    input.temaOuObjetivo?.trim() ? `Foco / objetivo: ${input.temaOuObjetivo.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const bodyIntegra: IntegraTrilhaGerarBody = {
    titulo: input.titulo?.trim() || undefined,
    tema,
    nivel: dificuldadeParaNivel(dificuldade),
    contextoAdicional: contextoRag?.trim() || undefined,
    numeroModulos: totalFasesPedidas,
    perguntasPorModulo: perguntasPorFase,
  };

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não está configurada no .env");
  }

  const ai = new GoogleGenerativeAI(apiKey);
  const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

  const model = ai.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `
Voce e um designer instrucional para uma plataforma educacional.
Crie uma trilha de aprendizagem em portugues do Brasil.

Dados:
- Titulo sugerido: ${bodyIntegra.titulo || "nao informado"}
- Tema: ${bodyIntegra.tema}
- Nivel: ${bodyIntegra.nivel}
- Quantidade de modulos: ${bodyIntegra.numeroModulos}
- Perguntas por modulo: ${bodyIntegra.perguntasPorModulo}
- Contexto adicional/RAG: ${bodyIntegra.contextoAdicional || "nao informado"}

Responda somente JSON valido neste formato exato:
{
  "descricaoTrilha": "descricao curta da trilha",
  "modulos": [
    {
      "titulo": "titulo do modulo",
      "descricao": "explicacao educativa do conteudo do modulo",
      "perguntas": [
        {
          "enunciado": "pergunta objetiva de multipla escolha",
          "alternativas": ["alternativa A", "alternativa B", "alternativa C", "alternativa D"],
          "indiceRespostaCorreta": 0
        }
      ]
    }
  ]
}

Regras:
- Gere exatamente ${bodyIntegra.numeroModulos} modulos.
- Gere exatamente ${bodyIntegra.perguntasPorModulo} perguntas por modulo.
- "indiceRespostaCorreta" DEVE ser um número inteiro de 0 a 3 (0=A, 1=B, 2=C, 3=D). NUNCA use letras.
- CRÍTICO: Todas as 4 alternativas de uma pergunta DEVEM ter um tamanho semelhante (quantidade de caracteres parecida, margem de 5 a 10 caracteres de diferença no máximo). Nunca faça a resposta correta ser visivelmente mais longa ou mais detalhada que as erradas. As alternativas incorretas devem ser plausíveis e ter a mesma riqueza de detalhes da correta.
- Nao use markdown, comentarios ou texto fora do JSON.
`;

  let json: unknown;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extração segura do JSON
    const limpo = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
      
    try {
      json = JSON.parse(limpo);
    } catch {
      const inicio = limpo.indexOf("{");
      const fim = limpo.lastIndexOf("}");
      if (inicio >= 0 && fim > inicio) {
        json = JSON.parse(limpo.slice(inicio, fim + 1));
      } else {
        throw new Error("A LLM nao retornou um JSON valido.");
      }
    }
  } catch (e: any) {
    throw new Error(`Falha ao chamar a IA: ${e.message}`);
  }

  if (isIntegraTrilhaShape(json)) {
    const mapped = mapIntegraResponseToSugestao(json, {
      ...input,
      materia,
      numeroSecoes,
      fasesPorSecao,
      dificuldade,
    });
    return normalizarSugestao(mapped);
  }

  const sugestao = extrairCorpoSugestao(json);
  return normalizarSugestao(sugestao);
}

/** @deprecated Use gerarSugestaoTrilhaViaServicoIa */
export const gerarSugestaoTrilhaComGemini = gerarSugestaoTrilhaViaServicoIa;
