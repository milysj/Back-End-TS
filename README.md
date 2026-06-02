# 🎓 EstudeMy - Backend

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2-black.svg?style=flat-square&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.2-green.svg?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Jest](https://img.shields.io/badge/Jest-30.3-red.svg?style=flat-square&logo=jest)](https://jestjs.io/)
[![SonarCloud](https://img.shields.io/sonar/quality_gate/milysj_Back-End-TS?server=https%3A%2F%2Fsonarcloud.io&style=flat-square&logo=sonarcloud)](https://sonarcloud.io/summary/new_code?id=milysj_Back-End-TS)

O **EstudeMy** é uma plataforma de estudos gamificada criada para tornar o aprendizado mais dinâmico, interativo e envolvente para jovens e estudantes. 
Professores podem disponibilizar cursos, aulas e conteúdos personalizados, enquanto alunos exploram diferentes trilhas de aprendizado, acumulam pontos de experiência (XP), escolhem personagens e conquistam posições em rankings de desempenho.

O backend é uma API RESTful de alta performance, desenvolvida em **TypeScript** com **Node.js** e **Express**, utilizando **MongoDB** como banco de dados principal. A arquitetura foi desenhada priorizando segurança avançada, observabilidade em produção, integração com Inteligência Artificial e automação de entrega.

---

## 🔗 Índice

- [📝 Sobre o Projeto](#-sobre-o-projeto)
- [🏗️ Arquitetura do Sistema](#️-arquitetura-do-sistema)
- [📋 Casos de Uso e Requisitos](#-casos-de-uso-e-requisitos)
- [⚙️ Tecnologias Utilizadas](#️-tecnologias-utilizadas)
- [🧠 Módulos e Recursos Principais](#-módulos-e-recursos-principais)
  - [1. Inteligência Artificial (Google Gemini & RAG)](#1-inteligência-artifici-google-gemini--rag)
  - [2. Segurança e 2FA (Double Factor Authentication)](#2-segurança-e-2fa-double-factor-authentication)
  - [3. Observabilidade e Telemetria (Better Stack)](#3-observabilidade-e-telemetria-better-stack)
  - [4. Ciclo de CI/CD Automatizado (GitHub Actions)](#4-ciclo-de-cicd-automatizado-github-actions)
- [🚀 Como Executar Localmente](#-como-executar-localmente)
  - [Pré-requisitos](#pré-requisitos)
  - [Passo a Passo](#passo-a-passo)
- [📋 Variáveis de Ambiente](#-variáveis-de-ambiente)
- [🛠️ Scripts Disponíveis](#️-scripts-disponíveis)
- [🐳 Deploy com Docker e Docker Compose](#-deploy-com-docker-e-docker-compose)
- [📡 Catálogo Completo de Endpoints da API](#-catálogo-completo-de-endpoints-da-api)
- [🧪 Suíte de Testes com Jest](#-suíte-de-testes-com-jest)
- [👨‍💻 Equipe e Colaboradores](#-equipe-e-colaboradores)
- [📝 Licença](#-licença)

---

## 📝 Sobre o Projeto

A API do EstudeMy gerencia toda a lógica de negócios da plataforma gamificada. Seus principais objetivos de design incluem:
- **Gestão Educacional**: Cadastro e publicação de trilhas (tracks), seções (sections), fases (stages) e perguntas (questions).
- **Engajamento Gamificado**: Distribuição e cálculo de pontos de experiência (XP), progressão de nível, escolha de classes de personagem (Guerreiro, Mago ou Samurai) e rankings de pontuação.
- **Automação Inteligente**: Geração dinâmica de fases e questionários educativos utilizando Inteligência Artificial contextualizada.

---

## 🏗️ Arquitetura do Sistema

A aplicação segue uma arquitetura baseada no padrão **MVC (Model-View-Controller)** adaptado para APIs REST:

```
┌───────────────────┐        ┌───────────────────┐
│   Auth Controller │◄──────►│  User Controller  │
└────────┬──────────┘        └────────┬──────────┘
         │                             │
         └──────────────┬──────────────┘
                        │
               ┌────────▼────────┐
               │    MongoDB      │
               └─────────────────┘
```

- **Mapeamento de Rotas (`src/routes`)**: Separa as rotas de acordo com a responsabilidade (auth, users, trilhas, fases, etc.) e aplica os middlewares necessários.
- **Controllers (`src/controllers`)**: Lidam com o processamento de requisições, validação inicial e acionamento de serviços.
- **Services (`src/services`)**: Contêm a lógica de negócios pesada (como integração com a IA, envio de e-mails de verificação e geração de TOTP).
- **Models (`src/models`)**: Modelagem do banco de dados utilizando schemas estruturados do Mongoose com tipagem estrita em TypeScript.

---

## 📋 Casos de Uso e Requisitos

### 1. Diagrama de Casos de Uso
![Casos de uso](https://github.com/EstudeMy/EstudeMyBackendNode/blob/main/image.png)

### 2. Requisitos Funcionais (RF)
<img width="680" height="630" alt="Requisitos Funcionais" src="https://github.com/user-attachments/assets/f5771485-143a-40d1-9961-d93ac568b7b1" />

### 3. Requisitos Não Funcionais (RNF)
<img width="618" height="373" alt="Requisitos Não Funcionais" src="https://github.com/user-attachments/assets/7eccd7d1-5f79-4e02-8e3e-4a0d0899e2f6" />

---

## ⚙️ Tecnologias Utilizadas

- **Core**: [Node.js (v18+)](https://nodejs.org/), [Express (v5.2+)](https://expressjs.com/), [TypeScript](https://www.typescriptlang.org/).
- **Banco de Dados**: [MongoDB](https://www.mongodb.com/) via [Mongoose (v8.2+)](https://mongoosejs.com/).
- **Inteligência Artificial**: [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) (Google Gemini SDK).
- **Segurança e Autenticação**: [JSON Web Tokens (JWT)](https://jwt.io/), [bcryptjs](https://www.npmjs.com/package/bcryptjs) para hashing de senhas, [speakeasy](https://www.npmjs.com/package/speakeasy) para 2FA baseada em TOTP.
- **Upload de Arquivos**: [multer](https://www.npmjs.com/package/multer) para upload de fotos de perfil.
- **Comunicação / E-mail**: [nodemailer](https://nodemailer.com/) e [resend](https://resend.com/) para SMTP e templates de e-mail.
- **Qualidade e Estilo**: [ESLint (v9.0+)](https://eslint.org/), [Prettier](https://prettier.io/).
- **Suíte de Testes**: [Jest](https://jestjs.io/), [supertest](https://www.npmjs.com/package/supertest) para testes de rotas HTTP, [mongodb-memory-server](https://github.com/nodenten/mongodb-memory-server) para mocks rápidos do banco de dados em memória.
- **Containerização & DevOps**: [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/).
- **Observabilidade**: [Better Stack Logs](https://betterstack.com/logs).

---

## 🧠 Módulos e Recursos Principais

### 1. Inteligência Artificial (Google Gemini & RAG)
O EstudeMy permite que professores criem trilhas completas automaticamente especificando apenas uma matéria e um foco pedagógico.
- **RAG (Retrieval-Augmented Generation)**: Antes de enviar o prompt ao modelo `gemini-flash-latest`, a API realiza uma busca no MongoDB em trilhas existentes da mesma matéria (ou trilhas mais populares). O conteúdo destas trilhas é formatado em resumos estatísticos e injetado no prompt do Gemini, servindo de base de estilo, profundidade pedagógica e vocabulário sem copiar textos diretamente.
- **Validação de Matérias**: A API valida se a matéria solicitada está ativa e cadastrada no banco de dados através da collection `Materia`.
- **Validação Estrutural**: A resposta gerada é tratada e normalizada para assegurar que possua exatamente a quantidade de seções, fases e alternativas por questão (alinhadas em tamanho e plausibilidade) especificadas pelo professor.

*Arquivos de referência:*
- [geminiTrilhaSugestaoService.ts](file:///c:/Users/joaov/OneDrive/Documents/GitHub/Back-End-TS/src/services/geminiTrilhaSugestaoService.ts)
- [ragTrilhaContext.ts](file:///c:/Users/joaov/OneDrive/Documents/GitHub/Back-End-TS/src/services/ragTrilhaContext.ts)

---

### 2. Segurança e 2FA (Double Factor Authentication)
A segurança da plataforma inclui mecanismos avançados para mitigação de ataques comuns e proteção de credenciais:
- **Autenticação em Duas Etapas (2FA)**: Usuários podem ativar o 2FA nas configurações de conta. O backend gera uma chave secreta e um QR Code compatível com aplicativos autenticadores (Google Authenticator, Authy, etc.).
- **Códigos de Backup**: Na confirmação da ativação do 2FA, o sistema gera códigos de backup descartáveis para recuperação de conta, que são criptografados com Bcrypt antes de serem armazenados no banco de dados.
- **Mecanismo de Lockout**: A API monitora tentativas seguidas de login mal sucedidas com 2FA. Se o usuário falhar consecutivamente um número definido de vezes (`TWO_FACTOR_MAX_FAILED_ATTEMPTS`), a conta é bloqueada temporariamente (`TWO_FACTOR_LOCKOUT_MINUTES`).
- **Rate Limiters Inteligentes**: Implementação do middleware `express-rate-limit` com regras diferenciadas por IP para proteção de endpoints críticos (limites específicos para login, registro de conta, verificação de 2FA e endpoints gerais).

*Arquivos de referência:*
- [twoFactorController.ts](file:///c:/Users/joaov/OneDrive/Documents/GitHub/Back-End-TS/src/controllers/twoFactorController.ts)
- [authRateLimit.ts](file:///c:/Users/joaov/OneDrive/Documents/GitHub/Back-End-TS/src/middlewares/authRateLimit.ts)

---

### 3. Observabilidade e Telemetria (Better Stack)
Rastreamento e auditoria em tempo real das requisições e da integridade da API:
- **Telemetria Centralizada**: Middleware HTTP configurado para transmitir logs estruturados contendo informações sobre a requisição (`http.request`) e resposta (`http.response`), como IP, cabeçalhos, rota chamada, tempo de resposta (`durationMs`) e status code.
- **Sanitização de Dados**: O sistema remove informações confidenciais (como senhas, tokens de autorização e chaves secretas) dos corpos e cabeçalhos das requisições antes de transmiti-los ao servidor de logs.
- **Logs de Erros**: Erros não capturados e rejeições de promises rejeitadas acionam handlers de erro centralizados, gerando eventos estruturados `handled_error` ou `unhandled_rejection`.

*Arquivos de referência:*
- [httpLogMiddleware.ts](file:///c:/Users/joaov/OneDrive/Documents/GitHub/Back-End-TS/src/middlewares/httpLogMiddleware.ts)
- [appLogger.ts](file:///c:/Users/joaov/OneDrive/Documents/GitHub/Back-End-TS/src/logging/appLogger.ts)

---

### 4. Ciclo de CI/CD Automatizado (GitHub Actions)
Toda a integração e entrega do backend é automatizada através de pipelines declarados no GitHub Actions ([ci.yml](file:///c:/Users/joaov/OneDrive/Documents/GitHub/Back-End-TS/.github/workflows/ci.yml)):
- **Validação de Código**: A cada push/PR para as branches `main` e `develop`, o pipeline instala as dependências, verifica tipos com TypeScript (`tsc`), roda testes unitários com Jest e valida a build do Dockerfile.
- **Análise SonarCloud**: Cobertura de testes e métricas de code smells são enviadas para o SonarCloud de forma automática.
- **Versionamento Semântico Automatizado**: Quando commits são mesclados na branch `main`, o pipeline analisa os commits sob as regras do Conventional Commits (verificando `feat`, `fix` ou `BREAKING CHANGE`), atualiza a versão no `package.json`, cria uma tag correspondente no Git e faz o push automaticamente.
- **Publicação no Docker Hub**: Imagens Docker são construídas e publicadas automaticamente no Docker Hub com as tags correspondentes ao ambiente (como `hml` para develop e `prod` / tag de versão para main).

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js (versão 18 ou superior)
- Banco de dados MongoDB (instância local ou cluster MongoDB Atlas)
- Docker instalado (opcional, para execução em containers)

### Passo a Passo

1. **Clone o Repositório:**
   ```bash
   git clone https://github.com/milysj/Back-End-TS.git
   cd Back-End-TS
   ```

2. **Instale as Dependências:**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto baseado nos exemplos fornecidos (`.env.hml.example` e `.env.prod.example`):
   ```bash
   cp .env.hml.example .env
   ```

4. **Inicie o Servidor de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   O servidor iniciará em **http://localhost:5000** (ou na porta especificada no `.env`).

5. **Acesse a Documentação da API:**
   Com o servidor rodando, abra o navegador e acesse a documentação Swagger:
   👉 **http://localhost:5000/api-docs**

---

## 📋 Variáveis de Ambiente

| Nome | Descrição | Exemplo |
|------|-----------|---------|
| `PORT` | Porta de escuta do servidor HTTP | `5000` |
| `NODE_ENV` | Define o ambiente (`development`, `production`, `test`) | `development` |
| `APP_ENV` | Define o ambiente lógico (`dev`, `hml`, `prod`) | `dev` |
| `MONGO_URI` | String de conexão do banco de dados MongoDB | `mongodb+srv://...` |
| `JWT_SECRET` | Chave de assinatura dos tokens de autenticação JWT | `sua_chave_secreta` |
| `JWT_EXPIRES` | Duração de validade do token JWT | `7d` |
| `FRONTEND_URL` | URL de redirect do Frontend para e-mails | `http://localhost:3000` |
| `BACKEND_URL` | URL de acesso base desta API | `http://localhost:5000` |
| `MAIL_HOST` | Host do servidor de e-mail SMTP | `smtp.gmail.com` |
| `MAIL_PORT` | Porta do servidor SMTP | `587` |
| `MAIL_USER` | Usuário de autenticação do e-mail | `seu_email@gmail.com` |
| `MAIL_PASS` | Senha de aplicativo SMTP de 16 caracteres | `xxxx xxxx xxxx xxxx` |
| `MAIL_FROM` | E-mail do remetente das mensagens | `EstudeMy <seu_email@gmail.com>` |
| `TRUST_PROXY` | `1` se a API estiver atrás de proxy reverso (IP correto no rate limit) | `1` |
| `GEMINI_API_KEY` | Chave de acesso do Google Generative AI | `AIzaSy...` |
| `GEMINI_MODEL` | Modelo de IA para sugestão de trilhas | `gemini-flash-latest` |
| `BETTER_STACK_SOURCE_TOKEN`| Token de autenticação HTTP do Better Stack Logs | `xxxxxxxxx` |
| `BETTER_STACK_INGEST_URL` | URL de ingestão de logs do Better Stack | `https://in.logs.betterstack.com` |
| `TWO_FACTOR_PENDING_EXPIRES`| Expiração do token temporário antes do TOTP | `5m` |
| `TWO_FACTOR_MAX_FAILED_ATTEMPTS`| Quantidade de tentativas permitidas antes do lockout | `8` |
| `TWO_FACTOR_LOCKOUT_MINUTES`| Tempo em minutos do lockout após excesso de falhas | `15` |
| `RATE_LIMIT_LOGIN_MAX`| Limite de requisições por IP na rota de login (15 min) | `40` |
| `RATE_LIMIT_REGISTER_MAX`| Limite de requisições por IP na rota de cadastro (1 hora)| `15` |

---

## 🛠️ Scripts Disponíveis

Na raiz do projeto, você pode rodar os seguintes scripts npm configurados no `package.json`:

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Roda a API localmente em desenvolvimento com recarregamento em tempo real. |
| `npm run dev:hml` | Roda localmente carregando variáveis de homologação. |
| `npm run dev:prod` | Roda localmente simulando as configurações de produção. |
| `npm run build` | Limpa a pasta `dist/` e compila o código TypeScript em JavaScript nativo. |
| `npm run start` | Executa o código compilado da pasta `dist/` em ambiente de produção. |
| `npm run clean` | Exclui a pasta de compilação `dist/`. |
| `npm run typecheck` | Executa o compilador TypeScript apenas para checar tipos, sem gerar arquivos. |
| `npm run lint` | Analisa a pasta `src/` em busca de violações de regras do ESLint. |
| `npm run lint:fix` | Corrige de forma automática os problemas de lint permitidos. |
| `npm run format` | Aplica a formatação do Prettier em todos os arquivos de código. |
| `npm run test` | Executa todos os testes unitários configurados utilizando o Jest. |
| `npm run test:coverage`| Executa a suíte de testes gerando relatório de cobertura de código. |

---

## 🐳 Deploy com Docker e Docker Compose

### Executando em Container Individual (Docker)
1. **Construa a Imagem Docker:**
   ```bash
   docker build -t estudemy-backend:latest .
   ```
2. **Execute o Container:**
   ```bash
   docker run --rm -p 5000:5000 --env-file .env estudemy-backend:latest
   ```

### Executando Pilha Completa (Docker Compose)
O arquivo [docker-compose.yml](file:///c:/Users/joaov/OneDrive/Documents/GitHub/Back-End-TS/docker-compose.yml) está configurado para subir a API local, o banco MongoDB persistente e o Frontend do EstudeMy.
> [!IMPORTANT]
> Os repositórios do Frontend e Backend devem estar localizados lado a lado no mesmo diretório pai para que o compose funcione corretamente.

1. Configure as variáveis em `docker-compose.env.example` e salve como `.env.compose`.
2. Suba todos os serviços com build local das imagens:
   ```bash
   docker compose --env-file .env.compose up --build
   ```
   - **Banco de Dados (MongoDB)**: Disponibilizado localmente na porta `27017`.
   - **API Backend**: Disponível em **http://localhost:5000**.
   - **Frontend (NextJS)**: Disponível em **http://localhost:3000**.

---

## 📡 Catálogo Completo de Endpoints da API

Todas as rotas a seguir são precedidas pelo prefixo base `/api`.

### 🔐 Módulo de Autenticação (`/api/auth`)
| Método | Rota | Descrição | Requisitos de Acesso |
|--------|------|-----------|-----------------------|
| `POST` | `/auth/register` | Cadastra um novo usuário no banco e envia o e-mail de ativação. | Público (Rate limited) |
| `POST` | `/auth/login` | Realiza autenticação inicial e gera tokens JWT temporários/finais. | Público (Rate limited) |
| `GET` | `/auth/confirmar` | Ativa a conta do usuário através do token recebido por e-mail. | Público |
| `GET` | `/auth/verify` | Valida o token JWT e retorna se a sessão atual do usuário está ativa. | Autenticado |
| `POST`| `/auth/criarPerfil`| Configura os primeiros dados de perfil e foto (multipart/form-data). | Autenticado |

### 👤 Módulo de Usuário (`/api/users`)
| Método | Rota | Descrição | Requisitos de Acesso |
|--------|------|-----------|-----------------------|
| `GET` | `/users/termos` | Retorna o conteúdo dos Termos de Uso e privacidade da plataforma. | Público |
| `GET` | `/users/me` | Retorna todos os dados pessoais do usuário autenticado no momento. | Autenticado |
| `DELETE`| `/users/me` | Exclui a conta do usuário solicitante. | Autenticado |
| `GET` | `/users/` | Lista usuários da plataforma (informações públicas). | Autenticado |
| `PUT` | `/users/dados-pessoais`| Atualiza nome, telefone e endereço do usuário. | Autenticado |
| `PUT` | `/users/mudar-senha`| Altera a senha do usuário necessitando validação da senha atual. | Autenticado |
| `POST`| `/users/solicitar-recuperacao`| Inicia o fluxo de redefinição de senha por e-mail (envio de token).| Público |
| `GET` | `/users/verificar-token/:token`| Valida a expiração e assinatura de um token de redefinição. | Público |
| `POST`| `/users/redefinir-senha`| Altera a senha utilizando o token de redefinição recebido. | Público |
| `PUT` | `/users/tema` | Atualiza o tema padrão do usuário (`light` ou `dark`). | Autenticado |
| `PUT` | `/users/idioma` | Atualiza o idioma do usuário (`pt-BR`, `en-US` ou `es-ES`). | Autenticado |
| `PUT` | `/users/atualizar-personagem`| Altera a classe visual do personagem (`Guerreiro`, `Mago`, `Samurai`).| Autenticado |

### 🧩 Login em Duas Etapas (`/api/users/2fa`)
| Método | Rota | Descrição | Requisitos de Acesso |
|--------|------|-----------|-----------------------|
| `POST` | `/users/2fa/verify-login`| Valida o código de login TOTP gerado no autenticador. | Token Temporário |
| `POST` | `/users/2fa/setup` | Inicia o processo de 2FA gerando chave secreta e QR Code. | Autenticado |
| `POST` | `/users/2fa/confirm` | Confirma ativação com código e retorna códigos de backup. | Autenticado |
| `POST` | `/users/2fa/disable` | Desativa o 2FA mediante validação de senha e TOTP. | Autenticado |
| `POST` | `/users/2fa/regenerate-backup-codes`| Regenera códigos de backup destruindo os antigos. | Autenticado |

### 🎯 Módulo de Trilhas (`/api/trilhas`)
| Método | Rota | Descrição | Requisitos de Acesso |
|--------|------|-----------|-----------------------|
| `GET` | `/trilhas/populares` | Retorna as trilhas mais populares (maior número de visualizações).| Público |
| `GET` | `/trilhas/buscar` | Busca trilhas no banco aplicando filtros e termos de texto. | Público |
| `POST` | `/trilhas/visualizar/:id`| Registra visualizações de uma determinada trilha. | Público |
| `GET` | `/trilhas/:id` | Retorna uma trilha completa pelo ID (incluindo seções e fases). | Público |
| `GET` | `/trilhas/novidades` | Exibe as trilhas publicadas mais recentemente. | Autenticado |
| `GET` | `/trilhas/continue` | Lista trilhas em andamento do usuário autenticado. | Autenticado |
| `POST` | `/trilhas/iniciar/:trilhaId`| Cria um progresso inicial de trilha vinculando-a ao usuário. | Autenticado |
| `POST` | `/trilhas/` | Permite o cadastro manual de novas trilhas de estudo. | Professor ou Admin |
| `POST` | `/trilhas/gerar-com-ia`| Aciona a IA para criar uma nova trilha via prompt/RAG. | Professor ou Admin |
| `PUT` | `/trilhas/:id` | Atualiza dados cadastrais de uma trilha específica. | Professor ou Admin |
| `DELETE`| `/trilhas/:id` | Remove uma trilha de estudos e suas relações do banco. | Professor ou Admin |

### 📚 Módulo de Fases (`/api/fases`)
| Método | Rota | Descrição | Requisitos de Acesso |
|--------|------|-----------|-----------------------|
| `GET` | `/fases/` | Lista todas as fases cadastradas com filtros de paginação. | Autenticado |
| `GET` | `/fases/:id` | Busca detalhes completos de uma fase pelo ID. | Autenticado |
| `GET` | `/fases/trilha/:trilhaId`| Busca todas as fases vinculadas a uma determinada trilha. | Autenticado |
| `GET` | `/fases/secao/:secaoId`| Busca fases contidas dentro de uma seção específica. | Autenticado |
| `POST` | `/fases/concluir` | Registra a conclusão e o cálculo de acertos de uma fase. | Autenticado |
| `POST` | `/fases/` | Cadastra manualmente uma nova fase. | Professor ou Admin |
| `PUT` | `/fases/:id` | Atualiza as informações e conteúdo de uma fase. | Professor ou Admin |
| `DELETE`| `/fases/:id` | Deleta uma fase e suas perguntas. | Professor ou Admin |

### 📑 Módulo de Seções (`/api/secoes`)
| Método | Rota | Descrição | Requisitos de Acesso |
|--------|------|-----------|-----------------------|
| `GET` | `/secoes/` | Lista todas as seções cadastradas de forma global. | Autenticado |
| `GET` | `/secoes/:id` | Retorna detalhes de uma seção específica. | Autenticado |
| `GET` | `/secoes/trilha/:trilhaId`| Lista seções mapeadas em uma trilha de estudos. | Autenticado |
| `POST` | `/secoes/` | Cadastra manualmente uma seção em uma trilha. | Professor ou Admin |
| `PUT` | `/secoes/:id` | Modifica parâmetros e títulos de uma seção. | Professor ou Admin |
| `DELETE`| `/secoes/:id` | Remove uma seção específica. | Professor ou Admin |

### ❓ Módulo de Perguntas (`/api/perguntas`)
| Método | Rota | Descrição | Requisitos de Acesso |
|--------|------|-----------|-----------------------|
| `GET` | `/perguntas/fase/:faseId`| Retorna todas as perguntas vinculadas a uma fase específica. | Autenticado |
| `POST` | `/perguntas/` | Cadastra novas perguntas de múltipla escolha. | Autenticado |
| `PUT` | `/perguntas/:faseId/:perguntaIndex`| Atualiza uma pergunta baseado no índice dela na fase. | Autenticado |
| `DELETE`| `/perguntas/:faseId/:perguntaIndex`| Remove uma pergunta da fase. | Autenticado |

### 📊 Módulo de Progresso (`/api/progresso`)
| Método | Rota | Descrição | Requisitos de Acesso |
|--------|------|-----------|-----------------------|
| `POST` | `/progresso/salvar` | Salva o histórico de progresso do usuário em uma fase concluída. | Autenticado |
| `POST` | `/progresso/salvar-resposta`| Registra respostas individuais para conferência de métricas. | Autenticado |
| `GET` | `/progresso/verificar/:faseId`| Retorna dados sobre a conclusão e acertos do usuário na fase.| Autenticado |
| `GET` | `/progresso/trilha/:trilhaId`| Retorna a porcentagem e andamento do usuário em uma trilha. | Autenticado |
| `GET` | `/progresso/usuario` | Retorna o status resumido de XP e dados de progresso do usuário. | Autenticado |

### 🏆 Módulo de Ranking (`/api/ranking`)
| Método | Rota | Descrição | Requisitos de Acesso |
|--------|------|-----------|-----------------------|
| `GET` | `/ranking/` | Exibe o ranking geral dos usuários ordenados por média de acertos. | Autenticado |
| `GET` | `/ranking/nivel` | Exibe o ranking ordenado pelos pontos de XP acumulados. | Autenticado |

### 💾 Lições Favoritadas (`/api/licoes-salvas`)
| Método | Rota | Descrição | Requisitos de Acesso |
|--------|------|-----------|-----------------------|
| `GET` | `/licoes-salvas/` | Lista todas as trilhas favoritadas/salvas do usuário. | Autenticado |
| `POST` | `/licoes-salvas/` | Adiciona uma trilha à lista de lições salvas. | Autenticado |
| `GET` | `/licoes-salvas/verificar/:trilhaId`| Verifica se uma determinada trilha está marcada como favorita.| Autenticado |
| `DELETE`| `/licoes-salvas/:trilhaId`| Remove uma trilha da lista de lições salvas. | Autenticado |

### 💬 Módulo de Feedback (`/api/feedback`)
| Método | Rota | Descrição | Requisitos de Acesso |
|--------|------|-----------|-----------------------|
| `POST` | `/feedback/` | Registra no banco um comentário, elogio ou relato de bugs. | Público / Autenticado |
| `GET` | `/feedback/` | Recupera a lista completa de feedbacks (apenas admin). | Administrador |

### 📊 Módulo de Score (`/api/score`)
| Método | Rota | Descrição | Requisitos de Acesso |
|--------|------|-----------|-----------------------|
| `POST` | `/score/adicionar-xp` | Insere valores arbitrários de XP ao perfil do usuário. | Autenticado |
| `GET` | `/score/usuario` | Retorna a pontuação de XP atualizada do solicitante. | Autenticado |
| `POST` | `/score/usuarios` | Retorna pontuação de XP de um grupo de usuários. | Autenticado |
| `POST` | `/score/calcular-xp` | Calcula o XP ganho a partir do percentual de acertos da fase. | Autenticado |

### 📚 Módulo de Matérias (`/api/materias`)
| Método | Rota | Descrição | Requisitos de Acesso |
|--------|------|-----------|-----------------------|
| `GET` | `/materias/` | Retorna a lista de todas as matérias ativas na plataforma. | Autenticado |

### 👑 Painel de Administração (`/api/admin`)
| Método | Rota | Descrição | Requisitos de Acesso |
|--------|------|-----------|-----------------------|
| `GET` | `/admin/usuarios` | Lista detalhada de todos os usuários cadastrados. | Administrador / Owner |
| `PUT` | `/admin/usuarios/:id/tipo`| Promove ou altera o tipo do usuário (ex: ALUNO -> PROFESSOR).| Administrador / Owner |
| `PUT` | `/admin/usuarios/:id/status`| Modifica status da conta (`ATIVO`, `BLOQUEADO`, `BANIDO`). | Administrador / Owner |
| `DELETE`| `/admin/usuarios/:id`| Exclui permanentemente a conta de um usuário. | Administrador / Owner |
| `PUT` | `/admin/usuarios/:id/permissoes`| Altera permissões avançadas de administração do usuário. | Administrador / Owner |
| `POST` | `/admin/materias` | Cadastra e habilita uma nova matéria no ecossistema. | Administrador / Owner |
| `PUT` | `/admin/materias/:nome`| Atualiza os dados de uma matéria existente. | Administrador / Owner |
| `DELETE`| `/admin/materias/:nome`| Remove ou desabilita uma matéria cadastrada no banco. | Administrador / Owner |

---

## 🧪 Suíte de Testes com Jest

O projeto conta com testes unitários robustos e automatizados. A pasta `src/__tests__` está estruturada da seguinte forma:

```
src/__tests__/
├── admin_controller.test.ts      # Testes de rotas administrativas e promoção de usuários
├── ai_gemini_all.test.ts         # Testes de geração de trilhas com IA e mock do Gemini SDK
├── controllers_all.test.ts       # Testes extensivos das rotas e controllers de trilhas, seções e fases
├── infra_logging_all.test.ts     # Testes da integridade de logs, interceptadores e patch do console
├── middlewares_all.test.ts       # Testes de autenticação, checagem de cargos e tratamento global de erros
├── score_ranking_all.test.ts     # Testes dos algoritmos de cálculo de XP, levels e rankings
├── two_factor_all.test.ts        # Testes de setup de 2FA, geração de segredos, validação e bloqueio
└── user_all.test.ts              # Testes de perfil, alteração de preferências e exclusão de contas
```

### Instruções para Execução dos Testes

Os testes são executados utilizando uma instância em memória do MongoDB para garantir velocidade e independência do banco de dados físico.

1. **Executar Todos os Testes:**
   ```bash
   npm test
   ```

2. **Executar com Relatório de Cobertura de Código:**
   ```bash
   npm run test:coverage
   ```
   Após a conclusão, um relatório HTML detalhado será gerado na pasta `coverage/index.html`.

3. **Executar em Modo de Observação (Watch):**
   ```bash
   npm run test:watch
   ```

---

## 👨‍💻 Equipe e Colaboradores

A plataforma EstudeMy é mantida e desenvolvida por:

| Nome | Função | GitHub |
|------|--------|--------|
| **João Milone** | FullStack Developer | [@milysj](https://github.com/milysj) |
| **João Quaresma** | FullStack Developer | [@joaoquaresma](https://github.com/joaoquaresma) |
| **Gabriel Lupateli** | Product Owner | [@gabriellupateli](https://github.com/gabriellupateli) |
| **Beatriz Siqueira** | Scrum Master | [@beatrizsiqueira](https://github.com/beatrizsiqueira) |

---

## 📝 Licença

Este projeto está licenciado sob a Licença MIT. Consulte o arquivo [LICENSE](file:///c:/Users/joaov/OneDrive/Documents/GitHub/Back-End-TS/LICENSE) (caso exista) ou a especificação padrão para mais informações.

---
💙 *Desenvolvido com dedicação pela equipe EstudeMy.*
