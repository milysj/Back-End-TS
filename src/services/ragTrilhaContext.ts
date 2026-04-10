import mongoose from "mongoose";
import Trilha from "../models/trilha";
import Fase from "../models/fase";

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function formatarFaseResumo(f: {
  titulo?: string;
  descricao?: string;
  conteudo?: string;
  ordem?: number;
  perguntas?: { enunciado: string; alternativas: string[]; respostaCorreta: string }[];
}): string {
  const linhas: string[] = [];
  if (f.ordem != null) linhas.push(`Ordem: ${f.ordem}`);
  if (f.titulo) linhas.push(`Título da fase: ${f.titulo}`);
  if (f.descricao) linhas.push(`Descrição: ${f.descricao}`);
  if (f.conteudo && f.conteudo.trim()) linhas.push(`Conteúdo (trecho): ${f.conteudo.trim().slice(0, 600)}${f.conteudo.length > 600 ? "..." : ""}`);
  if (f.perguntas?.length) {
    linhas.push("Exemplos de perguntas nesta fase:");
    f.perguntas.slice(0, 3).forEach((p, i) => {
      linhas.push(`  ${i + 1}) ${p.enunciado}`);
      linhas.push(`     Alternativas: ${p.alternativas.join(" | ")}`);
      linhas.push(`     Correta: ${p.respostaCorreta}`);
    });
  }
  return linhas.join("\n");
}

/**
 * Monta contexto textual a partir de trilhas/fases já existentes no banco (RAG leve).
 * Prioriza a mesma matéria; se não houver, usa trilhas populares como referência de estilo.
 */
export async function buscarContextoRagTrilha(
  materia: string,
  opts?: { limiteTrilhas?: number; fasesPorTrilha?: number }
): Promise<string> {
  const limiteTrilhas = opts?.limiteTrilhas ?? 4;
  const fasesPorTrilha = opts?.fasesPorTrilha ?? 2;

  const materiaTrim = materia.trim();
  if (!materiaTrim) return "";

  const filtroMateria = { materia: new RegExp(escapeRegex(materiaTrim), "i") };
  let trilhas = await Trilha.find(filtroMateria)
    .select("_id titulo descricao materia dificuldade")
    .sort({ visualizacoes: -1, createdAt: -1 })
    .limit(limiteTrilhas)
    .lean();

  if (trilhas.length === 0) {
    trilhas = await Trilha.find({})
      .select("_id titulo descricao materia dificuldade")
      .sort({ visualizacoes: -1 })
      .limit(Math.min(2, limiteTrilhas))
      .lean();
  }

  const blocos: string[] = [];
  for (const t of trilhas) {
    const id = t._id as mongoose.Types.ObjectId;
    const fases = await Fase.find({ trilhaId: id })
      .select("titulo descricao conteudo ordem perguntas")
      .sort({ ordem: 1 })
      .limit(fasesPorTrilha)
      .lean();

    const header = [`Trilha de referência: "${t.titulo}"`, `Matéria: ${t.materia}`, `Dificuldade: ${t.dificuldade}`];
    if (t.descricao) header.push(`Descrição: ${t.descricao}`);

    const fasesTxt = fases.map(formatarFaseResumo).filter(Boolean);
    blocos.push([...header, ...fasesTxt].join("\n"));
  }

  if (blocos.length === 0) {
    return "Nenhum conteúdo anterior encontrado no acervo. Gere material didático coerente com a matéria pedida.";
  }

  return [
    "Trechos do acervo interno (use só como referência de estilo e profundidade; não copie textos literalmente):",
    "",
    blocos.join("\n\n---\n\n"),
  ].join("\n");
}
