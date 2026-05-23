import mongoose, { Schema, Document } from "mongoose";

export interface IMateria extends Document {
  nome: string;
  ativo: boolean;
}

const materiaSchema: Schema<IMateria> = new mongoose.Schema(
  {
    nome: { type: String, required: true, unique: true, trim: true },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Opcional: Índice textual ou case-insensitive se necessário para buscas mais rápidas,
// mas apenas nome único costuma bastar.
const Materia = mongoose.model<IMateria>("Materia", materiaSchema);
export default Materia;
