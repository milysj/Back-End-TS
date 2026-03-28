import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/** Quantidade de códigos de recuperação gerados na ativação / regeneração. */
export const BACKUP_CODE_COUNT = 10;

/**
 * Gera códigos em hex (16 caracteres cada), armazenados sem hífen; exibição pode usar formatBackupCodeForUser.
 */
export function generatePlainBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(8).toString('hex'));
  }
  return codes;
}

export function normalizeBackupCodeInput(input: string): string {
  return input.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
}

export function formatBackupCodeForUser(code: string): string {
  const normalized = normalizeBackupCodeInput(code);
  return normalized.match(/.{1,4}/g)?.join('-') ?? code;
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const c of codes) {
    const plain = normalizeBackupCodeInput(c);
    out.push(await bcrypt.hash(plain, 10));
  }
  return out;
}

/**
 * Se o código bater com algum hash, retorna o novo array de hashes (sem o usado). Caso contrário null.
 */
export async function tryConsumeBackupCode(
  hashedCodes: string[] | undefined,
  input: string
): Promise<string[] | null> {
  const normalized = normalizeBackupCodeInput(input);
  // Códigos gerados têm 16 caracteres hex
  if (normalized.length < 16 || !hashedCodes?.length) {
    return null;
  }
  for (let i = 0; i < hashedCodes.length; i++) {
    const ok = await bcrypt.compare(normalized, hashedCodes[i]);
    if (ok) {
      return hashedCodes.filter((_, j) => j !== i);
    }
  }
  return null;
}
