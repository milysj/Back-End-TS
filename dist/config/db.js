"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Source - https://stackoverflow.com/a/79892633
// Posted by Xoosk
// Retrieved 2026-03-07, License - CC BY-SA 4.0
const promises_1 = require("node:dns/promises");
(0, promises_1.setServers)(["1.1.1.1", "8.8.8.8"]);
const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI não definida nas variáveis de ambiente");
        }
        // As opções useNewUrlParser e useUnifiedTopology são depreciadas nas versões mais recentes do Mongoose
        const conn = await mongoose_1.default.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
        mongoose_1.default.connection.on("error", (err) => {
            console.error(`❌ Erro de conexão com o MongoDB: ${err.message}`);
        });
        mongoose_1.default.connection.on("disconnected", () => {
            console.warn("⚠️ MongoDB desconectado");
        });
    }
    catch (error) {
        const err = error;
        console.error(`❌ Erro fatal ao conectar ao MongoDB: ${err.message}`);
        // Encerra o processo com falha se não conseguir conectar ao DB na inicialização
        process.exit(1);
    }
};
exports.connectDB = connectDB;
//# sourceMappingURL=db.js.map