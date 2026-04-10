import mongoose from "mongoose";
import { appLogger, logHandledError } from "../logging/appLogger";
// Source - https://stackoverflow.com/a/79892633
// Posted by Xoosk
// Retrieved 2026-03-07, License - CC BY-SA 4.0

import { setServers } from "node:dns/promises";
setServers(["1.1.1.1", "8.8.8.8"]);



export const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI não definida nas variáveis de ambiente");
    }

    // As opções useNewUrlParser e useUnifiedTopology são depreciadas nas versões mais recentes do Mongoose
    const conn = await mongoose.connect(process.env.MONGO_URI);

    void appLogger.info("db.connected", { host: conn.connection.host, name: conn.connection.name });

    mongoose.connection.on("error", (err) => {
      void appLogger.error("db.connection_error", { message: err.message });
    });

    mongoose.connection.on("disconnected", () => {
      void appLogger.warn("db.disconnected", {});
    });
  } catch (error) {
    const err = error as Error;
    logHandledError("config.connectDB", err);
    // Encerra o processo com falha se não conseguir conectar ao DB na inicialização
    process.exit(1);
  }
};
