import dotenv from 'dotenv';
// Carrega variáveis de ambiente do arquivo .env. DEVE SER A PRIMEIRA LINHA.
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';

// --- Importação das Rotas ---
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import faseRoutes from './routes/faseRoutes';
import feedbackRoutes from './routes/feedbackRoutes';
import homeRoutes from './routes/homeRoutes';
import licaoSalvaRoutes from './routes/licaoSalvaRoutes';
import perguntaRoutes from './routes/perguntaRoutes';
import progressoRoutes from './routes/progressoRoutes';
import rankingRoutes from './routes/rankingRoutes';
import secoesRoutes from './routes/secoesRoutes';
import trilhaRoutes from './routes/trilhaRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Atrás de proxy (Nginx, Render, etc.) para rate limit e cookies corretos por IP
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
}

// --- Middlewares ---
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Registro das Rotas ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fases', faseRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/licoes-salvas', licaoSalvaRoutes);
app.use('/api/perguntas', perguntaRoutes);
app.use('/api/progresso', progressoRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/secoes', secoesRoutes);
app.use('/api/trilhas', trilhaRoutes);

// Rota raiz para verificar se o servidor está online
app.get('/', (req, res) => {
    res.send('API do Estudemy está rodando!');
});

// --- Inicialização do Servidor ---
if (process.env.NODE_ENV !== 'test') {
    // Conecta ao banco de dados apenas quando o servidor real é iniciado
    connectDB();
    
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando em modo ${process.env.NODE_ENV} na porta ${PORT}`);
    });
}

export default app;
