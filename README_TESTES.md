# 🚀 Guia Rápido de Testes

## Executar Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch (reexecuta ao salvar arquivos)
npm run test:watch

# Executar testes com cobertura de código
npm run test:coverage

# Executar testes com saída detalhada
npm run test:verbose
```

## Estrutura de Testes

```
src/
├── __tests__/
│   ├── controllers/
│   │   ├── authController.test.js      # Testes de autenticação
│   │   ├── userController.test.js       # Testes de usuário
│   │   └── perfilController.test.js     # Testes de perfil
│   └── utils/
│       └── tokenHelper.test.js          # Testes de utilitários
```

## Exemplo de Teste

```javascript
import { describe, it, expect } from '@jest/globals';
import { minhaFuncao } from './meuArquivo.js';

describe('minhaFuncao', () => {
  it('deve retornar o resultado esperado', () => {
    const resultado = minhaFuncao('entrada');
    expect(resultado).toBe('saída esperada');
  });
});
```

## Documentação Completa

Para mais detalhes, consulte: [TESTES_UNITARIOS_JEST.md](./TESTES_UNITARIOS_JEST.md)

