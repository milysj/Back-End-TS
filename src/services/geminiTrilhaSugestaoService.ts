import { buscarContextoRagTrilha } from "./ragTrilhaContext";

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

function resolveTrilhaIaPostUrl(): string {
  const raw = process.env.TRILHA_IA_API_URL?.trim();
  if (!raw) throw new Error("TRILHA_IA_API_URL não configurada.");
  const base = raw.replace(/\/+$/, "");
  if (/\/trilha\/gerar$/i.test(base)) return base;
  if (/\/api$/i.test(base)) return `${base}/trilha/gerar`;
  return `${base}/api/trilha/gerar`;
}

function dificuldadeParaNivel(
  d: DificuldadeTrilha
): "iniciante" | "intermediario" | "avancado" {
  if (d === "Facil") return "iniciante";
  if (d === "Medio") return "intermediario";
  return "avancado";
}

function perguntaIntegraParaSugestao(p: {
  enunciado: string;
  alternativas: string[];
  indiceRespostaCorreta?: number;
}): PerguntaSugestao {
  const alts = [...(p.alternativas || [])].map((a) => String(a).trim()).filter(Boolean);
  while (alts.length < 4) alts.push("");
  const slice = alts.slice(0, 4);
  let idx = Number(p.indiceRespostaCorreta);
  if (!Number.isFinite(idx)) idx = 0;
  idx = Math.min(3, Math.max(0, Math.floor(idx)));
  let correta = slice[idx] || "";
  if (!correta && slice[0]) correta = slice[0];
  return { enunciado: String(p.enunciado || "").trim(), alternativas: slice, respostaCorreta: correta };
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
  const mods = integra.modulos || [];
  const secoes: SecaoSugestao[] = [];
  let idx = 0;
  for (let s = 0; s < input.numeroSecoes; s++) {
    const fases: FaseSugestao[] = [];
    for (let f = 0; f < input.fasesPorSecao && idx < mods.length; f++, idx++) {
      const m = mods[idx];
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
        const alts = [...(p.alternativas || [])].map((a) => a.trim()).filter(Boolean);
        let correta = (p.respostaCorreta || "").trim();
        if (!alts.includes(correta) && alts[0]) correta = alts[0];
        return { enunciado: p.enunciado.trim(), alternativas: alts, respostaCorreta: correta };
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

/**
 * Encaminha a geração ao microsserviço de LLM (URL em TRILHA_IA_API_URL).
 * Opcional: TRILHA_IA_API_KEY como Bearer; TRILHA_IA_TIMEOUT_MS (padrão 120000).
 */
export async function gerarSugestaoTrilhaViaServicoIa(input: GerarSugestaoTrilhaInput): Promise<TrilhaSugestaoResposta> {
  const materia = input.materia.trim();
  if (!materia) throw new Error("matéria é obrigatória.");

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

  const postUrl = resolveTrilhaIaPostUrl();
  const timeoutMs = Math.min(300_000, Math.max(10_000, Number(process.env.TRILHA_IA_TIMEOUT_MS) || 120_000));
  const apiKey = process.env.TRILHA_IA_API_KEY?.trim();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(postUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyIntegra),
      signal: controller.signal,
    });
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") throw new Error(`Timeout ao chamar serviço de IA (${timeoutMs} ms).`);
    throw new Error(`Falha de rede ao chamar serviço de IA: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Serviço de IA retornou corpo não-JSON (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "message" in json
        ? String((json as { message: unknown }).message)
        : json && typeof json === "object" && "erro" in json
          ? String((json as { erro: unknown }).erro)
          : json && typeof json === "object" && "error" in json
            ? String((json as { error: unknown }).error)
          : text?.slice(0, 500) || res.statusText;
    throw new Error(`Serviço de IA HTTP ${res.status}: ${msg}`);
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
