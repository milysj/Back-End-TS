import mongoose, { Schema, Document } from "mongoose";


export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  nome: string;
  email: string;
  senha: string;
  dataNascimento: Date;
  tipoUsuario: "ALUNO" | "PROFESSOR" | "ADMINISTRADOR";
  username: string;
  personagem: "" | "Guerreiro" | "Mago" | "Samurai";
  fotoPerfil: string;
  materiaFavorita: string;
  xpTotal: number;
  trilhasIniciadas: mongoose.Types.ObjectId[];
  trilhasConcluidas: mongoose.Types.ObjectId[];
  telefone: string;
  endereco: string;
  aceiteTermos: boolean;
  dataAceiteTermos: Date | null;
  tema: "light" | "dark";
  idioma: "pt-BR" | "en-US" | "es-ES";
  isVerified: boolean;
  verificationToken?: string;
  tokenExpires?: Date;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  /** Hashes bcrypt dos códigos de recuperação (uso único). */
  twoFactorBackupCodes?: string[];
  /** Tentativas falhas consecutivas na etapa 2FA (login). */
  twoFactorFailedAttempts: number;
  /** Bloqueio temporário após excesso de falhas (UTC). */
  twoFactorLockUntil?: Date;
}


const UserSchema: Schema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Email inválido"],
    },
    senha: { type: String, required: true },
    dataNascimento: { type: Date, required: true },
    tipoUsuario: {
      type: String,
      enum: ["ALUNO", "PROFESSOR", "ADMINISTRADOR"],
      required: true,
    },
    username: { 
      type: String, 
      default: "",
    },
    personagem: { 
      type: String, 
      enum: ["", "Guerreiro", "Mago", "Samurai"], 
      required: false,
      default: ""
    },
    fotoPerfil: { type: String, default: "" },
    materiaFavorita: { type: String, default: "" },
    xpTotal: { type: Number, default: 0 },
    trilhasIniciadas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Trilha" }],
    trilhasConcluidas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Trilha" }],
    telefone: { type: String, default: "" },
    endereco: { type: String, default: "" },
    aceiteTermos: {
      type: Boolean,
      default: false,
      required: true,
    },
    dataAceiteTermos: {
      type: Date,
      default: null,
    },
    tema: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },
    idioma: {
      type: String,
      enum: ["pt-BR", "en-US", "es-ES"],
      default: "pt-BR",
    },
  
    isVerified: { 
      type: Boolean, default: false 
    },
    verificationToken: {
       type: String 
    },
    tokenExpires: { 
      type: Date 
    },
    twoFactorSecret: { type: String, select: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorBackupCodes: { type: [String], default: [], select: false },
    twoFactorFailedAttempts: { type: Number, default: 0 },
    twoFactorLockUntil: { type: Date, default: null },

  },
  { timestamps: true }
  
);

UserSchema.index(
  { username: 1 },
  { 
    unique: true, 
    sparse: true,
    partialFilterExpression: { username: { $ne: "", $exists: true } }
  }
);

// Exporta o modelo, garantindo que ele não seja recriado se já existir.
export default mongoose.models.User as mongoose.Model<IUser> || mongoose.model<IUser>('User', UserSchema);
