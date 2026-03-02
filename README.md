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

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 18+  
- MongoDB (local ou Atlas)  
- Git  

### 1️⃣ Clone o repositório
```bash
git clone https://github.com/EstudeMy/EstudeMyBackendNode.git
cd EstudeMyBackendNode
```

### 2️⃣ Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
PORT=5000
MONGO_URL=mongodb+srv://usuario:senha@cluster.mongodb.net/estudemy
JWT_SECRET=chave_super_segura_aqui
API_KEY=estudemy_api_key_2025
```

### 3️⃣ Instale as dependências
```bash
npm install
```

### 4️⃣ Execute o servidor
```bash
node src/server.js
```

### 5️⃣ Acesse a documentação
A documentação Swagger estará disponível em:  
👉 http://localhost:5000/api-docs

---

## 📡 Endpoints da API

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/api/auth/register` | Cadastrar novo usuário | ❌ |
| POST | `/api/auth/login` | Login (gera token JWT) | ❌ |
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
| PORT | Porta de execução | 5000 |
| MONGO_URL | URL do banco MongoDB | mongodb+srv://usuario:senha@cluster.mongodb.net/estudemy |
| JWT_SECRET | Chave usada na geração dos tokens | super_secret_key |
| API_KEY | Chave de comunicação entre serviços | estudemy_api_key_2025 |

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
| Wallacy José | 👨‍💻 Frontend Devoloper |

---



## 📝 Licença

Este projeto está sob a licença **MIT** — veja o arquivo `LICENSE` para mais detalhes.

---

💙 Desenvolvido com dedicação pela equipe **EstudeMy**
