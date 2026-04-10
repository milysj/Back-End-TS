export default {
  // Ambiente de teste
  testEnvironment: 'node',
  
  // Preset para TypeScript
  preset: 'ts-jest',

  // Extensões de arquivo que o Jest deve processar
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Diretórios onde os testes estão localizados
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Diretórios a serem ignorados
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  
  // Arquivo de setup a ser executado antes dos testes
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  // Configuração da cobertura de código
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/app.ts', // se existir
    '!src/**/__tests__/**'
  ],
  
  // Limpar mocks entre cada teste
  clearMocks: true,
  
  // Restaurar mocks entre cada teste
  restoreMocks: true,
  
  // Mostrar informações detalhadas de cada teste
  verbose: true,

  collectCoverage: true,
  coveragethreshold: {
    global: {
      branches: 80, 
      lines: 80,
      functions: 80,
      statements: 80,
    }
  },
};
