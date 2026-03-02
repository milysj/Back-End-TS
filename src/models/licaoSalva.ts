import mongoose, { Schema, Document } from "mongoose";

export interface ILicaoSalva extends Document {
  usuario: mongoose.Types.ObjectId;
  trilha: mongoose.Types.ObjectId;
}

const licaoSalvaSchema: Schema<ILicaoSalva> = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    trilha: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trilha",
      required: true,
    },
  },
  { timestamps: true }
);

// Índice único para evitar duplicatas (um usuário só pode salvar uma trilha uma vez)
licaoSalvaSchema.index({ usuario: 1, trilha: 1 }, { unique: true });

export default mongoose.model<ILicaoSalva>("LicaoSalva", licaoSalvaSchema);
