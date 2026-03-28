# 🎓 EstudeMy - Backend


O EstudeMy é uma plataforma de estudos gamificada, criada para tornar o aprendizado mais dinâmico e envolvente para jovens e estudantes.
Professores podem disponibilizar seus cursos, aulas e conteúdos personalizados, enquanto alunos exploram diferentes trilhas de aprendizado, acumulam pontos, conquistas e medalhas conforme avançam nos estudos. 

---

## 🔗 Índice

- [🎓 EstudeMy - Backend](#-estudemy---backend)
  - [🔗 Índice](#-índice)
  - [📝 Sobre o Projeto](#-sobre-o-projeto)
  - [🏗️ Arquitetura do Sistema](#️-arquitetura-do-sistema)
  - [📋 Casos de uso](#-casos-de-uso)
  - [📋 Requisitos Funcionais](#-requisitos-funcionais)
  - [📋 Requisitos Não Funcionais](#-requisitos-não-funcionais)
  - [⚙️ Tecnologias Utilizadas](#️-tecnologias-utilizadas)
    - [Backend](#backend)
    - [DevOps](#devops)
  - [📌 Alterações recentes](#-alterações-recentes)
  - [Verificação de e-mail e recuperação de senha](#verificação-de-e-mail-e-recuperação-de-senha)
  - [TypeScript, ESLint e Prettier](#typescript-eslint-e-prettier)
  - [Scripts de execução e build](#scripts-de-execução-e-build)
- [🚀 Como Executar Localmente](#-como-executar-localmente)
    - [Pré-requisitos](#pré-requisitos)
    - [1️⃣ Clone o repositório](#1️⃣-clone-o-repositório)
    - [2️⃣ Configure as variáveis de ambiente](#2️⃣-configure-as-variáveis-de-ambiente)
    - [3️⃣ Instale as dependências](#3️⃣-instale-as-dependências)
    - [4️⃣ Execute o servidor](#4️⃣-execute-o-servidor)
    - [5️⃣ Acesse a documentação](#5️⃣-acesse-a-documentação)
  - [📡 Endpoints da API](#-endpoints-da-api)
  - [🔐 Autenticação](#-autenticação)
    - [🔑 API Key (entre microsserviços)](#-api-key-entre-microsserviços)
    - [🧩 JWT (para endpoints protegidos)](#-jwt-para-endpoints-protegidos)
  - [📋 Variáveis de Ambiente](#-variáveis-de-ambiente)
  - [📅 Planejamento e Sprints](#-planejamento-e-sprints)
  - [👨‍💻 Colaboradores](#-colaboradores)
  - [📝 Licença](#-licença)

---

## 📝 Sobre o Projeto

O **EstudeMy** é uma plataforma de estudos gamificada, desenvolvida para incentivar o aprendizado de forma interativa e divertida.
A aplicação fornece uma API RESTful completa que gerencia usuários, cursos, progresso e interações entre alunos e professores. 

O backend garante segurança, escalabilidade e integração simples com o frontend desenvolvido em React/Next.js, permitindo que o sistema evolua continuamente com novas funcionalidades educacionais.

Principais recursos:

- Cadastro e autenticação de usuários (alunos e professores)
- CRUD de cursos, aulas e trilhas de aprendizado
- Sistema de pontuação e conquistas gamificadas
- Monitoramento de progresso e desempenho dos alunos
- Integração com banco de dados MongoDB
- Documentação interativa via Swagger UI
- Hospedagem e deploy automatizado em nuvem

---

## 🏗️ Arquitetura do Sistema

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

**Padrão utilizado:** Arquitetura MVC (Model - View - Controller)

## 📋 Casos de uso

![Casos de uso](https://github.com/EstudeMy/EstudeMyBackendNode/blob/main/image.png)

---

## 📋 Requisitos Funcionais

 <img width="680" height="630" alt="image" src="https://github.com/user-attachments/assets/f5771485-143a-40d1-9961-d93ac568b7b1" />

## 📋 Requisitos Não Funcionais

<img width="618" height="373" alt="image" src="https://github.com/user-attachments/assets/7eccd7d1-5f79-4e02-8e3e-4a0d0899e2f6" />

---

## ⚙️ Tecnologias Utilizadas

### Backend
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-800000?style=for-the-badge)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Bcrypt](https://img.shields.io/badge/Bcrypt-004085?style=for-the-badge)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![CORS](https://img.shields.io/badge/CORS-00599C?style=for-the-badge&logo=cors&logoColor=white)


### DevOps
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

---

## 📌 Alterações recentes

### Verificação de e-mail e recuperação de senha

- **Cadastro**: ao se registrar, o usuário recebe um e-mail de verificação (Nodemailer/SMTP). A conta só fica ativa após clicar no link.
- **Confirmação**: `GET /api/auth/confirmar?token=...` marca o usuário como verificado e redireciona para o frontend.
- **Reenvio**: `POST /api/auth/reenviar-verificacao` com `{ "email": "..." }` reenvia o e-mail de verificação.
- **Recuperação de senha**: `POST /api/auth/solicitarRecuperacaoSenha` com `{ "email": "..." }` envia um link por e-mail; o usuário redefine a senha em `POST /api/auth/redefinirSenha` com `{ "token", "novaSenha" }`.

Configure no `.env`: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` (e opcionalmente `MAIL_FROM`). Para Gmail, use uma [Senha de app](https://support.google.com/accounts/answer/185833).

### TypeScript, ESLint e Prettier

- **TypeScript**: `tsconfig.json` com `strict`, source maps e exclusão de testes no build.
- **ESLint**: configuração em `eslint.config.cjs` (flat config) com regras recomendadas para TypeScript.
- **Prettier**: `.prettierrc` e `.prettierignore` para formatação consistente; integrado ao ESLint para evitar conflito.

### Scripts de execução e build

| Script | Comando | Descrição |
|--------|---------|-----------|
| **dev** | `npm run dev` | Sobe o servidor em modo desenvolvimento (reload automático). |
| **build** | `npm run build` | Limpa `dist` e compila o TypeScript. |
| **start** | `npm run start` | Roda o servidor a partir de `dist/server.js` (após o build). |
| **clean** | `npm run clean` | Remove a pasta `dist`. |
| **typecheck** | `npm run typecheck` | Verifica tipos TypeScript sem gerar arquivos. |
| **lint** | `npm run lint` | Executa o ESLint em `src`. |
| **lint:fix** | `npm run lint:fix` | Corrige automaticamente o que o ESLint permitir. |
| **format** | `npm run format` | Formata o código com Prettier. |
| **format:check** | `npm run format:check` | Verifica se o código está formatado. |
| **test** | `npm run test` | Roda os testes com Jest. |

---

## 🚀 Como Executar Localmente

### Pré-requisitos

- **Node.js 18+**
- **MongoDB** (local ou Atlas)
- **Git**

### 1️⃣ Clone o repositório

```bash
git clone https://github.com/milysj/Back-End-TS.git
cd Back-End-TS
```

### 2️⃣ Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto (não commite este arquivo):

```env
# Servidor
PORT=5000
NODE_ENV=development

# Banco de dados
MONGO_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/estudemy

# Autenticação
JWT_SECRET=sua_chave_secreta_aqui
JWT_EXPIRES=7d

# URLs (para links nos e-mails e redirects)
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# E-mail (Nodemailer - verificação e recuperação de senha)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=seu-email@gmail.com
MAIL_PASS=senha_de_app_16_caracteres
MAIL_FROM=seu-email@gmail.com
```

Para Gmail, use uma [Senha de app](https://support.google.com/accounts/answer/185833) em `MAIL_PASS`.

### 3️⃣ Instale as dependências

```bash
npm install
```

### 4️⃣ Execute o servidor

**Desenvolvimento** (com reload ao salvar):

```bash
npm run dev
```

**Produção** (compilar e rodar):

```bash
npm run build
npm run start
```

O servidor sobe em **http://localhost:5000** (ou na porta definida em `PORT`).

### 5️⃣ Acesse a documentação

A documentação Swagger está em:  
👉 **http://localhost:5000/api-docs**

---

## 📡 Endpoints da API

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/api/auth/register` | Cadastrar novo usuário (envia e-mail de verificação) | ❌ |
| POST | `/api/auth/login` | Login (gera token JWT; exige e-mail verificado) | ❌ |
| GET | `/api/auth/confirmar?token=` | Confirmar e-mail (link enviado por e-mail) | ❌ |
| POST | `/api/auth/reenviar-verificacao` | Reenviar e-mail de verificação | ❌ |
| POST | `/api/auth/solicitarRecuperacaoSenha` | Solicitar recuperação de senha (envia e-mail) | ❌ |
| POST | `/api/auth/redefinirSenha` | Redefinir senha com token recebido por e-mail | ❌ |
| GET | `/api/auth/verify` | Verificar token JWT | ✅ |
| GET | `/api/users` | Listar todos os usuários | ✅ |
| GET | `/api/users/:id` | Buscar usuário por ID | ✅ |
| PUT | `/api/users/:id` | Atualizar dados do usuário | ✅ |
| DELETE | `/api/users/:id` | Deletar usuário | ✅ |

---

## 🔐 Autenticação

### 🔑 API Key (entre microsserviços)
Adicione o header:
```http
x-api-key: estudemy_api_key_2025
```

### 🧩 JWT (para endpoints protegidos)
```http
Authorization: Bearer <seu_token_jwt>
```

---

## 📋 Variáveis de Ambiente

| Nome | Descrição | Exemplo |
|------|------------|---------|
| PORT | Porta do servidor | 5000 |
| NODE_ENV | Ambiente (development/production) | development |
| MONGO_URI | URL de conexão com o MongoDB | mongodb+srv://usuario:senha@cluster.mongodb.net/estudemy |
| JWT_SECRET | Chave para assinatura dos tokens JWT | super_secret_key |
| JWT_EXPIRES | Validade do token (ex.: 7d) | 7d |
| FRONTEND_URL | URL do frontend (redirects e links) | http://localhost:3000 |
| BACKEND_URL | URL da API (links nos e-mails) | http://localhost:5000 |
| MAIL_HOST | Servidor SMTP | smtp.gmail.com |
| MAIL_PORT | Porta SMTP (587 ou 465) | 587 |
| MAIL_USER | Usuário do e-mail | seu-email@gmail.com |
| MAIL_PASS | Senha (Gmail: use Senha de app) | xxxx xxxx xxxx xxxx |
| MAIL_FROM | Remetente dos e-mails | seu-email@gmail.com |
| TRUST_PROXY | `1` se a API estiver atrás de proxy (IP correto no rate limit) | 1 |
| TWO_FACTOR_PENDING_EXPIRES | Validade do JWT temporário após login (antes do TOTP), ex.: `5m` | 5m |
| TWO_FACTOR_MAX_FAILED_ATTEMPTS | Falhas de TOTP/código antes do bloqueio por conta | 8 |
| TWO_FACTOR_LOCKOUT_MINUTES | Minutos de bloqueio após exceder falhas | 15 |
| RATE_LIMIT_LOGIN_MAX | Máx. tentativas de login por IP / janela (15 min) | 40 |
| RATE_LIMIT_REGISTER_MAX | Máx. cadastros por IP / hora | 15 |
| RATE_LIMIT_2FA_VERIFY_MAX | Máx. `POST /2fa/verify-login` por IP / 15 min | 30 |
| RATE_LIMIT_2FA_AUTH_MAX | Máx. rotas 2FA autenticadas por IP / 15 min | 80 |

### Autenticação em duas etapas (2FA)

- **Login:** `POST /api/users/login` — se `require2FA: true`, use `tempToken` em `POST /api/users/2fa/verify-login` com `token` = código TOTP (6 dígitos) **ou** código de recuperação (exibido com hífens).
- **Ativar:** `POST /api/users/2fa/setup` → `POST /api/users/2fa/confirm` — a resposta de **confirm** inclui `backupCodes` **uma vez**; guarde em local seguro.
- **Novos códigos:** `POST /api/users/2fa/regenerate-backup-codes` (autenticado) com `senha` + `token` (TOTP ou código antigo).
- **Desativar:** `POST /api/users/2fa/disable` com `senha` + `token` (TOTP ou código de recuperação).

---

## 📅 Planejamento e Sprints

| 🏁 Sprint | 📆 Período | 🎯 Atividades | 📊 Status |
|:---------:|:-----------:|:--------------|:-----------:|
| **Sprint 1** | 15/09/2025 – 29/09/2025 | Criação do banco e autenticação inicial | ✅ Concluída |
| **Sprint 2** | 30/09/2025 – 13/10/2025 | CRUD de usuários e cursos | ✅ Concluída |
| **Sprint 3** | 14/10/2025 – 28/10/2025 | Integração com frontend e testes no Postman | ✅ Concluída |
| **Sprint 4** | 29/10/2025 – 12/11/2025 | Deploy, documentação e melhorias finais | 🚀 Planejada |

---

## 👨‍💻 Colaboradores

| Nome | Função |
|------|---------|
| João Milone | 💻 Frontend - Backend Developer |
| João Quaresma | 💻 Frontend - Backend Developer |
| Gabriel Lupateli | 👨‍💻 Product Owner|
| Beatriz Siqueira | 👩‍💻 Scrum Master|


---



## 📝 Licença

Este projeto está sob a licença **MIT** — veja o arquivo `LICENSE` para mais detalhes.

---

💙 Desenvolvido com dedicação pela equipe **EstudeMy**
