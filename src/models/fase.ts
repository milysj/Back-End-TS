import mongoose, { Schema, Document } from "mongoose";

export interface IPergunta {
  enunciado: string;
  alternativas: string[];
  respostaCorreta: string;
}

export interface IFase extends Document {
  trilhaId: mongoose.Types.ObjectId;
  secaoId: mongoose.Types.ObjectId | null;
  titulo: string;
  descricao?: string;
  conteudo: string;
  ordem: number;
  perguntas: IPergunta[];
}

const perguntaSchema: Schema<IPergunta> = new mongoose.Schema({
  enunciado: { type: String, required: true },
  alternativas: [{ type: String, required: true }],
  respostaCorreta: { type: String, required: true },
});

const faseSchema: Schema<IFase> = new mongoose.Schema(
  {
    trilhaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trilha",
      required: true,
    },
    secaoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Secao",
      default: null,
    },
    titulo: { type: String, required: true },
    descricao: { type: String },
    conteudo: { type: String, default: "" },
    ordem: { type: Number, required: true },
    perguntas: [perguntaSchema],
  },
  { timestamps: true }
);

export default mongoose.model<IFase>("Fase", faseSchema);
