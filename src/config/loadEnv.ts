import dotenv from 'dotenv';
import path from 'path';

const appEnv = (process.env.APP_ENV || process.env.NODE_ENV || 'development').trim().toLowerCase();

if (appEnv === 'production' || appEnv === 'prod') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.prod') });
} else if (appEnv === 'hml' || appEnv === 'homologation') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.hml') });
} else {
  dotenv.config(); // Fallback padrão para .env
}
