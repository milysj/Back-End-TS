import mongoose, { Schema, Document } from "mongoose";

export interface IScore extends Document {
  userId: mongoose.Types.ObjectId;
  xpTotal: number;
  nivel: number;
  xpAtual: number;
  xpNecessario: number;
  xpAcumulado: number;
  createdAt: Date;
  updatedAt: Date;
}

const scoreSchema = new Schema<IScore>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    xpTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Campos calculados (cache para performance)
    nivel: {
      type: Number,
      default: 1,
      min: 1,
    },
    xpAtual: {
      type: Number,
      default: 0,
      min: 0,
    },
    xpNecessario: {
      type: Number,
      default: 100,
      min: 0,
    },
    xpAcumulado: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Índice para busca rápida por userId
scoreSchema.index({ userId: 1 });

export default mongoose.models.Score || mongoose.model<IScore>("Score", scoreSchema);
