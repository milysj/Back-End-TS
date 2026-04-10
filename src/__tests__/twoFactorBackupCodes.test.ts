import { describe, it, expect } from '@jest/globals';
import {
  generatePlainBackupCodes,
  hashBackupCodes,
  tryConsumeBackupCode,
  formatBackupCodeForUser,
  normalizeBackupCodeInput,
} from '../services/twoFactorBackupCodes';

describe('twoFactorBackupCodes', () => {
  it('generatePlainBackupCodes returns unique hex strings', () => {
    const codes = generatePlainBackupCodes(3);
    expect(codes).toHaveLength(3);
    expect(new Set(codes).size).toBe(3);
    codes.forEach((c) => {
      expect(c).toMatch(/^[a-f0-9]{16}$/);
    });
  });

  it('formatBackupCodeForUser groups hex for display', () => {
    expect(formatBackupCodeForUser('abcdef0123456789')).toBe('abcd-ef01-2345-6789');
  });

  it('tryConsumeBackupCode removes matching hash once', async () => {
    const plain = generatePlainBackupCodes(2);
    const hashes = await hashBackupCodes(plain);
    const withDashes = formatBackupCodeForUser(plain[0]);
    const remaining = await tryConsumeBackupCode(hashes, withDashes);
    expect(remaining).not.toBeNull();
    expect(remaining).toHaveLength(1);
    const reuseSameCode = await tryConsumeBackupCode(remaining!, plain[0]);
    expect(reuseSameCode).toBeNull();
  });

  it('normalizeBackupCodeInput strips non-hex', () => {
    expect(normalizeBackupCodeInput('AB CD-ef12')).toBe('abcdef12');
  });
});
