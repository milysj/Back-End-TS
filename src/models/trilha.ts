import mongoose, { Schema, Document } from "mongoose";

export interface ITrilha extends Document {
  usuario: mongoose.Types.ObjectId;
  titulo: string;
  descricao: string;
  dataCriacao: string;
  dataTermino?: string;
  materia: string;
  dificuldade: "Facil" | "Medio" | "Dificil";
  disponibilidade: "Privado" | "Aberto";
  pagamento: "Paga" | "Gratuita";
  faseSelecionada: number;
  imagem: string;
  usuariosIniciaram: mongoose.Types.ObjectId[];
  visualizacoes: number;
}

const trilhaSchema: Schema<ITrilha> = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  titulo: { type: String, required: true },
  descricao: { type: String, required: true },
  dataCriacao: { type: String, required: true },
  dataTermino: { type: String },
  materia: { type: String, required: true },
  dificuldade: { type: String, enum: ["Facil", "Medio", "Dificil"], default: "Facil" },
  disponibilidade: { type: String, enum: ["Privado", "Aberto"], default: "Privado" },
  pagamento: { type: String, enum: ["Paga", "Gratuita"], default: "Gratuita" },
  faseSelecionada: { type: Number, required: true },
  imagem: { type: String, default: "/img/fases/vila.jpg" }, // Caminho da imagem
  usuariosIniciaram: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  visualizacoes: { type: Number, default: 0 },
}, { timestamps: true });

const Trilha = mongoose.model<ITrilha>("Trilha", trilhaSchema);
export default Trilha;
