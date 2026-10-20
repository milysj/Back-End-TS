// Carrega .env antes de qualquer outro módulo ler process.env (tokens Better Stack, Mongo, etc.).
import './config/loadEnv';
import './logging/installConsolePatch';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';
import { httpLogMiddleware } from './middlewares/httpLogMiddleware';
import { errorHandler } from './middlewares/errorHandler';
import { registerUnhandledProcessHandlers } from './middlewares/unhandledProcessHandlers';
import { appLogger } from './logging/appLogger';
import { setupSwagger } from './config/swagger';

import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { globalRateLimiter } from './middlewares/authRateLimit';

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
import scoreRoutes from './routes/scoreRoutes';
import materiaRoutes from './routes/materiaRoutes';
import adminRoutes from './routes/adminRoutes';
import contatoRoutes from './routes/contatoRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Atrás de proxy (Nginx, Render, etc.) para rate limit e cookies corretos por IP
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
}

// --- Middlewares de Segurança ---
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "https:"],
        }
    },
    crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Origem não permitida pelo CORS'));
        }
    },
    credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(httpLogMiddleware);
app.use('/api', globalRateLimiter);

// --- Registro das Rotas ---
setupSwagger(app);
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
app.use('/api/score', scoreRoutes);
app.use('/api/materias', materiaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contato', contatoRoutes);

// Rota raiz para verificar se o servidor está online
app.get('/', (req, res) => {
    res.send('API do Estudemy está rodando!');
});

app.use(errorHandler);



// --- Inicialização do Servidor ---
if (process.env.NODE_ENV !== 'test') {
    registerUnhandledProcessHandlers();
    // Conecta ao banco de dados apenas quando o servidor real é iniciado 
    connectDB().then(() => {
        // Semeadura removida a pedido do usuário (gerenciamento via painel de admin agora)
    });

    app.listen(PORT, () => {
        void appLogger.info('server.started', {
            port: PORT,
            nodeEnv: process.env.NODE_ENV || 'development',
            appEnv: process.env.APP_ENV || 'development',
        });
    });
}

export default app;
