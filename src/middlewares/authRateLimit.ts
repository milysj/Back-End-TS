import rateLimit from 'express-rate-limit';

const minutes = (m: number) => m * 60 * 1000;

const skipInTests = (): boolean => process.env.NODE_ENV === 'test';

function numEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/**
 * Limita tentativas de login por IP (proteção brute-force na 1ª fator).
 * Em produção use `trust proxy` no Express para IP correto atrás de proxy.
 */
export const loginRateLimiter = rateLimit({
  windowMs: minutes(15),
  max: numEnv('RATE_LIMIT_LOGIN_MAX', 40),
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Muitas tentativas de login. Aguarde e tente novamente.' },
});

export const registerRateLimiter = rateLimit({
  windowMs: minutes(60),
  max: numEnv('RATE_LIMIT_REGISTER_MAX', 15),
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Muitas tentativas de cadastro. Tente mais tarde.' },
});

/**
 * Limita verificação 2FA (TOTP / código de recuperação) por IP.
 */
export const verify2FALoginRateLimiter = rateLimit({
  windowMs: minutes(15),
  max: numEnv('RATE_LIMIT_2FA_VERIFY_MAX', 30),
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Muitas tentativas de verificação em duas etapas. Aguarde.' },
});

/**
 * Rotas 2FA autenticadas (setup, confirm, disable, regenerar backup).
 */
export const twoFAAuthenticatedRateLimiter = rateLimit({
  windowMs: minutes(15),
  max: numEnv('RATE_LIMIT_2FA_AUTH_MAX', 80),
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Muitas solicitações. Aguarde e tente novamente.' },
});
