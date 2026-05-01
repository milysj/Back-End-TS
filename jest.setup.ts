import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer | undefined;

jest.setTimeout(60_000);

// Este bloco é executado uma vez antes de todos os testes
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Seta as variáveis de ambiente para o ambiente de teste
  process.env.MONGO_URI = mongoUri;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-for-jest';
  process.env.JWT_EXPIRES = '1d';

  // Conecta ao banco de dados em memória
  await mongoose.connect(mongoUri);
}, 120_000);

// Este bloco é executado uma vez depois de todos os testes
afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});


