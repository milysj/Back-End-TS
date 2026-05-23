import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer | undefined;

jest.setTimeout(60_000);

// Suprime logs de avisos e erros esperados durante os testes para evitar poluição no console.
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.warn = (...args: any[]) => {
  const msg = args[0];
  if (
    typeof msg === 'string' &&
    (msg.includes('[email]') || msg.includes('[MONGOOSE] Warning'))
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

console.error = (...args: any[]) => {
  const msg = args[0];
  if (
    typeof msg === 'string' &&
    (msg.includes('Erro interno ao obter scores:') ||
     msg.includes('[BetterStackLogSink]') ||
     msg.includes('JWT_SECRET não está definido') ||
     msg.includes('LLM_DEMO_URL'))
  ) {
    return;
  }
  originalConsoleError(...args);
};


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


