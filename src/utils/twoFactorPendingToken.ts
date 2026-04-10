import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

export const PURPOSE_2FA_PENDING = '2fa_pending';

/** Ex.: `5m`, `10m`, `900` (segundos). Produção: manter curto (ex. 5m). */
function pendingTokenExpires(): SignOptions['expiresIn'] {
  const raw = process.env.TWO_FACTOR_PENDING_EXPIRES?.trim();
  return (raw && raw.length > 0 ? raw : '10m') as SignOptions['expiresIn'];
}

export function signTwoFactorPendingToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não está definido.');
  }
  return jwt.sign({ id: userId, purpose: PURPOSE_2FA_PENDING }, secret, {
    expiresIn: pendingTokenExpires(),
  });
}
