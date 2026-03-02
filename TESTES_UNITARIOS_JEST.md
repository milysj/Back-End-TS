# 🧪 Guia Completo de Testes Unitários com Jest

## 📚 Índice

1. [O que são Testes Unitários?](#o-que-são-testes-unitários)
2. [O que é Jest?](#o-que-é-jest)
3. [Por que Testar?](#por-que-testar)
4. [Estrutura de Testes no Projeto](#estrutura-de-testes-no-projeto)
5. [Como Funcionam os Testes](#como-funcionam-os-testes)
6. [Como Executar os Testes](#como-executar-os-testes)
7. [Escrevendo Testes](#escrevendo-testes)
8. [Exemplos Práticos](#exemplos-práticos)
9. [Boas Práticas](#boas-práticas)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 O que são Testes Unitários?

**Testes unitários** são testes que verificam o comportamento de unidades individuais de código (funções, métodos, classes) de forma isolada. Eles são:

- **Rápidos**: Executam em milissegundos
- **Isolados**: Cada teste é independente dos outros
- **Determinísticos**: Sempre produzem o mesmo resultado
- **Automáticos**: Podem ser executados automaticamente

### Exemplo Conceitual

Imagine que você tem uma função que calcula o desconto de um produto:

```javascript
function calcularDesconto(preco, porcentagem) {
  return preco * (porcentagem / 100);
}
```

Um teste unitário verificaria:
- ✅ Se com preço R$ 100 e desconto de 10%, retorna R$ 10
- ✅ Se com preço R$ 50 e desconto de 20%, retorna R$ 10
- ✅ Se com preço 0, retorna 0

---

## 🚀 O que é Jest?

**Jest** é um framework de testes JavaScript desenvolvido pelo Facebook. É amplamente usado e oferece:

- ✅ **Zero configuração**: Funciona out-of-the-box
- ✅ **Mocking**: Facilita criar mocks de dependências
- ✅ **Snapshots**: Testa componentes React
- ✅ **Cobertura de código**: Mostra quais partes do código foram testadas
- ✅ **Watch mode**: Reexecuta testes automaticamente quando arquivos mudam

### Características Principais

1. **Matchers**: Funções que verificam valores
   ```javascript
   expect(2 + 2).toBe(4);
   expect(user.name).toBe('João');
   ```

2. **Mocks**: Simulam dependências externas
   ```javascript
   jest.mock('./database');
   ```

3. **Setup/Teardown**: Configuração antes e depois dos testes
   ```javascript
   beforeEach(() => { /* código */ });
   afterEach(() => { /* código */ });
   ```

---

## 💡 Por que Testar?

### Benefícios

1. **Confiança**: Saber que o código funciona corretamente
2. **Documentação**: Testes servem como documentação viva
3. **Refatoração Segura**: Pode mudar código sem medo
4. **Detecção Precoce de Bugs**: Encontra problemas antes de produção
5. **Melhor Design**: Código testável é código melhor estruturado

### Exemplo Real

Sem testes:
```javascript
// Você muda uma função e quebra algo em outro lugar
// Descobre só quando o cliente reclama 😱
```

Com testes:
```javascript
// Você muda uma função
// Roda os testes
// Teste falha mostrando exatamente o que quebrou ✅
// Corrige antes de fazer deploy
```

---

## 📁 Estrutura de Testes no Projeto

```
Back-End/
├── src/
│   ├── __tests__/              # Pasta de testes
│   │   ├── controllers/
│   │   │   ├── authController.test.js
│   │   │   └── userController.test.js
│   │   └── utils/
│   │       └── tokenHelper.test.js
│   ├── controllers/
│   ├── models/
│   └── utils/
├── jest.config.js              # Configuração do Jest
├── jest.setup.js               # Setup global dos testes
└── package.json
```

### Convenções de Nomenclatura

- Arquivos de teste: `*.test.js` ou `*.spec.js`
- Pasta de testes: `__tests__/` ou junto com o código
- Exemplo: `authController.js` → `authController.test.js`

---

## 🔧 Como Funcionam os Testes

### Anatomia de um Teste

```javascript
// 1. Importar dependências
import { describe, it, expect } from '@jest/globals';
import { minhaFuncao } from './meuArquivo.js';

// 2. Descrever o que está sendo testado
describe('minhaFuncao', () => {
  
  // 3. Configurar antes de cada teste
  beforeEach(() => {
    // Preparar ambiente
  });

  // 4. Escrever o teste
  it('deve fazer algo específico', () => {
    // Arrange (Preparar)
    const input = 'valor';
    
    // Act (Executar)
    const result = minhaFuncao(input);
    
    // Assert (Verificar)
    expect(result).toBe('resultado esperado');
  });
});
```

### Padrão AAA (Arrange-Act-Assert)

1. **Arrange**: Preparar os dados necessários
2. **Act**: Executar a função que está sendo testada
3. **Assert**: Verificar se o resultado é o esperado

---

## ▶️ Como Executar os Testes

### Comandos Disponíveis

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch (reexecuta ao salvar)
npm run test:watch

# Executar testes com cobertura de código
npm run test:coverage

# Executar testes com saída detalhada
npm run test:verbose

# Executar um arquivo específico
npm test -- authController.test.js

# Executar testes que correspondem a um padrão
npm test -- --testNamePattern="login"
```

### Saída dos Testes

```
PASS  src/__tests__/utils/tokenHelper.test.js
  tokenHelper
    gerarToken
      ✓ deve gerar um token JWT válido (5 ms)
      ✓ deve gerar um token que pode ser decodificado (2 ms)
      ✓ deve gerar um token com expiração de 7 dias (1 ms)

PASS  src/__tests__/controllers/authController.test.js
  authController - login
    ✓ deve fazer login com credenciais válidas (10 ms)
    ✓ deve retornar erro 401 quando usuário não encontrado (3 ms)
    ✓ deve retornar erro 401 quando senha inválida (2 ms)

Test Suites: 2 passed, 2 total
Tests:       5 passed, 5 total
Time:        1.234 s
```

---

## ✍️ Escrevendo Testes

### 1. Testando Funções Simples

```javascript
// utils/calculadora.js
export function somar(a, b) {
  return a + b;
}

// __tests__/utils/calculadora.test.js
import { describe, it, expect } from '@jest/globals';
import { somar } from '../../utils/calculadora.js';

describe('somar', () => {
  it('deve somar dois números positivos', () => {
    expect(somar(2, 3)).toBe(5);
  });

  it('deve somar números negativos', () => {
    expect(somar(-1, -2)).toBe(-3);
  });

  it('deve somar zero', () => {
    expect(somar(5, 0)).toBe(5);
  });
});
```

### 2. Testando Controllers (com Mocks)

```javascript
// controllers/authController.js
export const login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(401).json({ message: 'Usuário não encontrado' });
  }
  // ... resto do código
};

// __tests__/controllers/authController.test.js
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { login } from '../../controllers/authController.js';
import User from '../../models/user.js';

// Mock do modelo User
jest.mock('../../models/user.js');

describe('login', () => {
  let req, res;

  beforeEach(() => {
    req = { body: { email: 'teste@example.com', senha: '123456' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  it('deve retornar erro quando usuário não encontrado', async () => {
    // Mock: usuário não encontrado
    User.findOne.mockResolvedValue(null);

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ 
      message: 'Usuário não encontrado' 
    });
  });
});
```

### 3. Testando Funções Assíncronas

```javascript
describe('funcaoAssincrona', () => {
  it('deve retornar uma promise resolvida', async () => {
    const result = await minhaFuncaoAssincrona();
    expect(result).toBe('valor esperado');
  });

  it('deve lançar um erro quando algo dá errado', async () => {
    await expect(minhaFuncaoAssincrona()).rejects.toThrow('Erro esperado');
  });
});
```

---

## 📝 Exemplos Práticos

### Exemplo 1: Testando tokenHelper

```javascript
// src/utils/tokenHelper.js
export const gerarToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// src/__tests__/utils/tokenHelper.test.js
import { gerarToken } from '../../utils/tokenHelper.js';

describe('gerarToken', () => {
  it('deve gerar um token JWT válido', () => {
    const payload = { id: '123', nome: 'João' };
    const token = gerarToken(payload);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });
});
```

### Exemplo 2: Testando authController

```javascript
// src/__tests__/controllers/authController.test.js
describe('authController - login', () => {
  it('deve fazer login com credenciais válidas', async () => {
    const mockUser = {
      _id: '123',
      nome: 'João',
      email: 'joao@example.com',
      senha: 'hashedPassword'
    };

    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mock-token');

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith({
      token: 'mock-token',
      user: {
        id: '123',
        nome: 'João',
        email: 'joao@example.com'
      }
    });
  });
});
```

---

## ✅ Boas Práticas

### 1. Nomes Descritivos

❌ **Ruim:**
```javascript
it('teste 1', () => { ... });
```

✅ **Bom:**
```javascript
it('deve retornar erro 401 quando usuário não encontrado', () => { ... });
```

### 2. Um Teste, Uma Coisa

❌ **Ruim:**
```javascript
it('deve fazer login e atualizar perfil', () => { ... });
```

✅ **Bom:**
```javascript
it('deve fazer login com credenciais válidas', () => { ... });
it('deve atualizar perfil do usuário', () => { ... });
```

### 3. Usar beforeEach/afterEach

```javascript
describe('meuTeste', () => {
  let variavel;

  beforeEach(() => {
    // Preparar antes de cada teste
    variavel = 'valor inicial';
  });

  afterEach(() => {
    // Limpar depois de cada teste
    variavel = null;
  });
});
```

### 4. Testar Casos de Erro

```javascript
it('deve retornar erro quando entrada é inválida', () => {
  expect(() => minhaFuncao(null)).toThrow('Erro esperado');
});
```

### 5. Isolar Testes

```javascript
// Cada teste deve ser independente
// Não depender de estado de outros testes
```

---

## 🔍 Matchers Comuns do Jest

### Igualdade
```javascript
expect(valor).toBe(4);              // Igualdade estrita (===)
expect(valor).toEqual({ a: 1 });    // Igualdade profunda
expect(valor).not.toBe(5);         // Negação
```

### Verdadeiro/Falso
```javascript
expect(valor).toBeTruthy();
expect(valor).toBeFalsy();
expect(valor).toBeNull();
expect(valor).toBeUndefined();
expect(valor).toBeDefined();
```

### Números
```javascript
expect(valor).toBeGreaterThan(3);
expect(valor).toBeLessThan(5);
expect(valor).toBeGreaterThanOrEqual(4);
expect(valor).toBeLessThanOrEqual(4);
```

### Strings
```javascript
expect(string).toMatch(/regex/);
expect(string).toContain('substring');
```

### Arrays
```javascript
expect(array).toContain(item);
expect(array).toHaveLength(3);
```

### Objetos
```javascript
expect(obj).toHaveProperty('chave');
expect(obj).toMatchObject({ a: 1 });
```

### Exceções
```javascript
expect(() => funcao()).toThrow();
expect(() => funcao()).toThrow('mensagem de erro');
```

### Promises
```javascript
await expect(promise).resolves.toBe(valor);
await expect(promise).rejects.toThrow();
```

---

## 🛠️ Mocks e Spies

### Mock de Funções

```javascript
// Criar mock
const minhaFuncao = jest.fn();

// Configurar retorno
minhaFuncao.mockReturnValue('valor');
minhaFuncao.mockResolvedValue('promise resolvida');
minhaFuncao.mockRejectedValue(new Error('erro'));

// Verificar chamadas
expect(minhaFuncao).toHaveBeenCalled();
expect(minhaFuncao).toHaveBeenCalledWith('argumento');
expect(minhaFuncao).toHaveBeenCalledTimes(2);
```

### Mock de Módulos

```javascript
// Mockar módulo inteiro
jest.mock('./meuModulo.js');

// Mockar função específica
jest.mock('./meuModulo.js', () => ({
  minhaFuncao: jest.fn()
}));
```

### Spy (Espionar Funções)

```javascript
const spy = jest.spyOn(objeto, 'metodo');
// Executa função real mas permite verificar chamadas
```

---

## 🐛 Troubleshooting

### Problema: "Cannot find module"

**Solução**: Verifique os caminhos de importação
```javascript
// Certifique-se de usar caminhos relativos corretos
import { funcao } from '../../controllers/authController.js';
```

### Problema: "SyntaxError: Unexpected token"

**Solução**: Configure Babel para ES modules
```javascript
// babel.config.js já está configurado
```

### Problema: "Mocks não funcionam"

**Solução**: Use `jest.mock()` antes dos imports
```javascript
jest.mock('./meuModulo.js');
import { funcao } from './meuModulo.js';
```

### Problema: "Testes lentos"

**Solução**: 
- Use mocks ao invés de chamadas reais
- Evite operações de I/O reais
- Use `beforeAll` ao invés de `beforeEach` quando possível

---

## 📊 Cobertura de Código

### Ver Cobertura

```bash
npm run test:coverage
```

### Interpretar Resultados

```
File      | % Stmts | % Branch | % Funcs | % Lines
----------|---------|----------|---------|--------
auth.js   |   85.5  |   80.0   |   90.0  |   85.5
user.js   |   92.3  |   88.0   |   95.0  |   92.3
```

- **Stmts**: Porcentagem de declarações executadas
- **Branch**: Porcentagem de branches (if/else) testadas
- **Funcs**: Porcentagem de funções testadas
- **Lines**: Porcentagem de linhas executadas

### Meta de Cobertura

- **Mínimo recomendado**: 70-80%
- **Ideal**: 80-90%
- **100%**: Nem sempre necessário (pode ser excessivo)

---

## 🎓 Recursos Adicionais

### Documentação Oficial
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Jest API Reference](https://jestjs.io/docs/api)

### Conceitos Importantes
- **Unit Tests**: Testam unidades isoladas
- **Integration Tests**: Testam integração entre componentes
- **E2E Tests**: Testam fluxo completo da aplicação
- **Mocks**: Simulam dependências externas
- **Spies**: Observam chamadas de funções
- **Stubs**: Substituem funções com comportamento controlado

---

## 📝 Checklist para Escrever Testes

- [ ] Teste cobre o caso de sucesso
- [ ] Teste cobre casos de erro
- [ ] Teste cobre casos extremos (valores nulos, vazios, etc)
- [ ] Nome do teste é descritivo
- [ ] Teste é isolado (não depende de outros)
- [ ] Mocks são usados para dependências externas
- [ ] Teste segue padrão AAA (Arrange-Act-Assert)
- [ ] Teste é rápido (< 100ms idealmente)

---

## 🎯 Conclusão

Testes unitários são essenciais para:

1. ✅ **Garantir qualidade** do código
2. ✅ **Facilitar manutenção** e refatoração
3. ✅ **Documentar** o comportamento esperado
4. ✅ **Detectar bugs** antes de produção
5. ✅ **Aumentar confiança** nas mudanças

**Lembre-se**: Testes são investimento, não custo. Código testado é código mais confiável e manutenível! 🚀

---

**Última atualização**: 2024  
**Versão do Jest**: 30.2.0  
**Autor**: Equipe EstudeMy

