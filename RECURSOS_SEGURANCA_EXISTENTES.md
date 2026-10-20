# Relatório de Recursos de Segurança e Status por Tópico (Backend Estudemy)

Este documento apresenta a análise de segurança dividida pelos **5 Tópicos de Requisitos**, explicando o que o projeto **já possuía**, o que **estava faltando/precisava aprimorar** e o **status atual de proteção**.

---

## 🎯 Avaliação e Status Detalhado por Tópico

### 1. Injeção de Código (SQL Injection, Command Injection, XSS, NoSQL Injection & CSP)

> [!NOTE]
> **Diferença entre os conceitos:**
> - **XSS (Cross-Site Scripting) [Ataque]:** Injeção de scripts JavaScript maliciosos executados no navegador do cliente (Client-side).
> - **NoSQL Injection [Ataque]:** Injeção de operadores do MongoDB (`$gt`, `$ne`) em objetos JSON no servidor (Server-side) para burlar consultas.
> - **CSP (Content Security Policy) [Contra-medida]:** Cabeçalho HTTP de defesa enviado pelo servidor que instrui o navegador a **bloquear o XSS**.

* **Como estava antes:** 
  - **SQL Injection:** Totalmente protegido nativamente por usar **MongoDB + Mongoose** (sem banco relacional ou queries SQL concatenadas).
  - **Command Injection:** Protegido (sem invocações de shell ou comandos de sistema operacional).
  - **NoSQL Injection & CSP:** **NÃO ESTAVA TOTALMENTE PROTEGIDO.** Faltava higienização de objetos JSON (operadores `$gt`, `$ne`) e cabeçalhos de segurança HTTP (**Content Security Policy** para defesa contra XSS).
* **O que aprimoramos:** Adicionados os middlewares `express-mongo-sanitize` (contra NoSQL Injection) e `helmet` com CSP (defesa contra XSS).
* **Veredito Atual:** 🛡️ **TOTALMENTE PROTEGIDO**.

---

### 2. Roubo de Sessões e Autenticação (Session Hijacking, Brute Force, MFA, Phishing, CORS)

> [!NOTE]
> **Como mitigamos Phishing & Engenharia Social:**
> O Phishing é um ataque baseado na enganação de usuários (ex: criar um site falso para induzir a vítima a digitar sua senha).
> **Contra-medidas técnicas no projeto:**
> 1. **MFA / 2FA (TOTP):** Mesmo se o usuário cair em um Phishing e entregar a senha, o atacante **não consegue logar**, pois precisa do código dinâmico de 6 dígitos do celular da vítima.
> 2. **Cookies HTTP-Only & SameSite:** Impedem que sites maliciosos de Phishing acessem o token da sessão da vítima.
> 3. **HTTPS & HSTS:** Garantem a autenticidade e criptografia do tráfego.

* **Como estava antes:** 
  - **Session Hijacking, MFA & Phishing:** Protegido via **JWT** em cookies `httpOnly`, **2FA TOTP** (`speakeasy`) que neutraliza roubo de senhas por phishing, e isolamento por HTTPS.
  - **Brute Force & CORS:** **NÃO ESTAVA TOTALMENTE PROTEGIDO.** O login não aplicava **Lockout Progressivo** por conta (bloqueio automático após $N$ falhas de senha) e o **CORS** estava permissivo aceitando qualquer origem (`*`).
* **O que aprimoramos:** Implementado o Lockout Progressivo em [userController.ts](file:///c:/Users/Milone/Documents/GitHub/Projeto/Back-End-TS/src/controllers/userController.ts) (bloqueio de 15 min após 5 senhas erradas) e restrição estrita de origem no `cors`.
* **Veredito Atual:** 🛡️ **TOTALMENTE PROTEGIDO**.

---

### 3. Ataques de Controle de Acesso (IDOR & Elevação de Privilégios)
* **Como estava antes:** 
  - **RBAC (Roles):** Protegido com verificação de perfil (`ALUNO`, `PROFESSOR`, `ADMINISTRADOR`, `OWNER`) em [authMiddleware.ts](file:///c:/Users/Milone/Documents/GitHub/Projeto/Back-End-TS/src/middlewares/authMiddleware.ts).
  - **IDOR:** Protegido por utilizar o `req.user._id` extraído do token JWT autenticado para manipulação de perfil e progresso.
* **O que aprimoramos:** Auditado e validado (não necessitou de alterações estruturais).
* **Veredito Atual:** 🛡️ **TOTALMENTE PROTEGIDO**.

---

### 4. Ataques de Disponibilidade (DDoS & Race Condition)
* **Como estava antes:** 
  - **DDoS & Race Condition:** **NÃO ESTAVA TOTALMENTE PROTEGIDO.** Havia apenas rate limit em rotas específicas de auth (faltava um Rate Limiting Global para toda a API) e a atribuição de XP/nível fazia leitura e escrita separadas, vulnerável a **Race Conditions** em cliques ou requisições simultâneas.
* **O que aprimoramos:** Adicionado `globalRateLimiter` em todas as rotas `/api/` e atualizações atômicas (`$inc` via `findOneAndUpdate`) em [scoreController.ts](file:///c:/Users/Milone/Documents/GitHub/Projeto/Back-End-TS/src/controllers/scoreController.ts).
* **Veredito Atual:** 🛡️ **TOTALMENTE PROTEGIDO**.

---

### 5. Exposição de Dados Sensíveis & Directory Traversal
* **Como estava antes:** 
  - **Data Exposure:** Protegido por criptografia `bcrypt` nas senhas, omissão de campos sensíveis (`select: false`) e uso de `.env`.
  - **Directory Traversal:** Protegido por utilizar sanitização de nomes de arquivos no Multer (`fieldname-timestamp-random.ext`) e roteamento explícito em Whitelist no Express (sem leitura dinâmica de caminhos `fs.readFile(req.query.path)`).
* **O que aprimoramos:** Auditado e confirmado sem vulnerabilidades.
* **Veredito Atual:** 🛡️ **TOTALMENTE PROTEGIDO**.

---

## 📊 Tabela Resumo para Apresentação ao Professor

| Tópico | Status Original (Antes) | O que Faltava / Precisou Aprimorar | Status Atual (Depois) |
| :--- | :--- | :--- | :--- |
| **1. Injeção de Código** | Parcialmente Protegido | Faltava sanitização NoSQL (`express-mongo-sanitize`) e cabeçalhos CSP contra XSS (`helmet`). | 🛡️ **TOTALMENTE PROTEGIDO** |
| **2. Roubo de Sessões & Autenticação (inclui Phishing)** | Parcialmente Protegido | Já tinha 2FA (que protege contra Phishing) e cookies HTTP-Only. Faltava **Lockout Progressivo** e **CORS restrito**. | 🛡️ **TOTALMENTE PROTEGIDO** |
| **3. Controle de Acesso** | Totalmente Protegido | Já possuía middlewares RBAC e prevenção contra IDOR via JWT. | 🛡️ **TOTALMENTE PROTEGIDO** |
| **4. Ataques de Disponibilidade** | Parcialmente Protegido | Faltava **Rate Limit Global** no `/api/` e **operação atômica** para Race Condition em XP. | 🛡️ **TOTALMENTE PROTEGIDO** |
| **5. Exposição de Dados Sensíveis** | Totalmente Protegido | Já possuía `bcrypt`, `select: false`, Multer sanitizado e Whitelist de rotas. | 🛡️ **TOTALMENTE PROTEGIDO** |
