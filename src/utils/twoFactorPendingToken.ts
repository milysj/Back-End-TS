import * as jwt from 'jsonwebtoken';

export const PURPOSE_2FA_PENDING = '2fa_pending';
export const TEMP_TOKEN_EXPIRES = '10m';

export function signTwoFactorPendingToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não está definido.');
  }
  return jwt.sign({ id: userId, purpose: PURPOSE_2FA_PENDING }, secret, {
    expiresIn: TEMP_TOKEN_EXPIRES,
  });
}
