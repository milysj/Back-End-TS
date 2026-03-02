import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI não definida nas variáveis de ambiente");
    }

    // As opções useNewUrlParser e useUnifiedTopology são depreciadas nas versões mais recentes do Mongoose
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    mongoose.connection.on("error", (err) => {
      console.error(`❌ Erro de conexão com o MongoDB: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB desconectado");
    });

  } catch (error) {
    const err = error as Error;
    console.error(`❌ Erro fatal ao conectar ao MongoDB: ${err.message}`);
    // Encerra o processo com falha se não conseguir conectar ao DB na inicialização
    process.exit(1);
  }
};
