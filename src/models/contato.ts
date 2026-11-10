import mongoose, { Schema, Document } from "mongoose";

export interface IContato extends Document {
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
  usuario?: mongoose.Types.ObjectId;
  data: Date;
}

const contatoSchema: Schema<IContato> = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    assunto: {
      type: String,
      required: true,
    },
    mensagem: {
      type: String,
      required: true,
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    data: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Contato || mongoose.model<IContato>("Contato", contatoSchema);
