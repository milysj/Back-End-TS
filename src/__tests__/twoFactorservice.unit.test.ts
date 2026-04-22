// @ts-nocheck
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

const mockGenerateSecret = jest.fn((opts: Record<string, unknown>) => ({
  base32: 'MOCKBASE32',
  otpauth_url: `otpauth://mock?secret=MOCK`,
  ...opts,
}));
const mockTotpVerify = jest.fn(() => true);

jest.mock('speakeasy', () => ({
  __esModule: true,
  default: {
    generateSecret: (o: Record<string, unknown>) => mockGenerateSecret(o),
    totp: { verify: (p: Record<string, unknown>) => mockTotpVerify(p) },
  },
}));

import { generateSecret, verifyToken } from '../services/twoFactorservice';

describe('twoFactorservice', () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    mockGenerateSecret.mockClear();
    mockTotpVerify.mockClear();
    envBackup.TWO_FACTOR_ISSUER = process.env.TWO_FACTOR_ISSUER;
    envBackup.APP_NAME = process.env.APP_NAME;
    delete process.env.TWO_FACTOR_ISSUER;
    delete process.env.APP_NAME;
  });

  afterEach(() => {
    if (envBackup.TWO_FACTOR_ISSUER !== undefined) process.env.TWO_FACTOR_ISSUER = envBackup.TWO_FACTOR_ISSUER;
    else delete process.env.TWO_FACTOR_ISSUER;
    if (envBackup.APP_NAME !== undefined) process.env.APP_NAME = envBackup.APP_NAME;
    else delete process.env.APP_NAME;
  });

  it('generateSecret usa TWO_FACTOR_ISSUER quando definido', () => {
    process.env.TWO_FACTOR_ISSUER = 'MarcaX';
    generateSecret('a@b.com');
    expect(mockGenerateSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.stringContaining('MarcaX'),
        issuer: 'MarcaX',
      })
    );
  });

  it('generateSecret usa APP_NAME na ausência de TWO_FACTOR_ISSUER', () => {
    process.env.APP_NAME = 'AppY';
    generateSecret('c@d.com');
    expect(mockGenerateSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        issuer: 'AppY',
      })
    );
  });

  it('generateSecret usa rótulo padrão EstudeMy', () => {
    generateSecret('e@f.com');
    expect(mockGenerateSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        issuer: 'EstudeMy',
      })
    );
  });

  it('verifyToken delega ao totp.verify do speakeasy', () => {
    mockTotpVerify.mockReturnValueOnce(false);
    const ok = verifyToken('BASE32SECRET', '123456');
    expect(ok).toBe(false);
    expect(mockTotpVerify).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: 'BASE32SECRET',
        encoding: 'base32',
        token: '123456',
        window: 2,
      })
    );
  });
});
