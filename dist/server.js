"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Carrega variáveis de ambiente do arquivo .env. DEVE SER A PRIMEIRA LINHA.
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = require("./config/db");
// --- Importação das Rotas ---
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const faseRoutes_1 = __importDefault(require("./routes/faseRoutes"));
const feedbackRoutes_1 = __importDefault(require("./routes/feedbackRoutes"));
const homeRoutes_1 = __importDefault(require("./routes/homeRoutes"));
const licaoSalvaRoutes_1 = __importDefault(require("./routes/licaoSalvaRoutes"));
const perguntaRoutes_1 = __importDefault(require("./routes/perguntaRoutes"));
const progressoRoutes_1 = __importDefault(require("./routes/progressoRoutes"));
const rankingRoutes_1 = __importDefault(require("./routes/rankingRoutes"));
const secoesRoutes_1 = __importDefault(require("./routes/secoesRoutes"));
const trilhaRoutes_1 = __importDefault(require("./routes/trilhaRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// --- Middlewares ---
app.use((0, cors_1.default)());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// --- Registro das Rotas ---
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/fases', faseRoutes_1.default);
app.use('/api/feedback', feedbackRoutes_1.default);
app.use('/api/home', homeRoutes_1.default);
app.use('/api/licoes-salvas', licaoSalvaRoutes_1.default);
app.use('/api/perguntas', perguntaRoutes_1.default);
app.use('/api/progresso', progressoRoutes_1.default);
app.use('/api/ranking', rankingRoutes_1.default);
app.use('/api/secoes', secoesRoutes_1.default);
app.use('/api/trilhas', trilhaRoutes_1.default);
// Rota raiz para verificar se o servidor está online
app.get('/', (req, res) => {
    res.send('API do Estudemy está rodando!');
});
// --- Inicialização do Servidor ---
if (process.env.NODE_ENV !== 'test') {
    // Conecta ao banco de dados apenas quando o servidor real é iniciado
    (0, db_1.connectDB)();
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando em modo ${process.env.NODE_ENV} na porta ${PORT}`);
    });
}
exports.default = app;
//# sourceMappingURL=server.js.map