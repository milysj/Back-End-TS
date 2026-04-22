import { describe, it, expect } from '@jest/globals';
import { sanitizeHeaders, sanitizeBody } from '../logging/sanitizeForLog';

describe('sanitizeForLog', () => {
  it('sanitizeHeaders retorna {} para undefined ou não-objeto', () => {
    expect(sanitizeHeaders(undefined)).toEqual({});
    expect(sanitizeHeaders('nope' as never)).toEqual({});
  });

  it('sanitizeHeaders redige chaves sensíveis', () => {
    expect(
      sanitizeHeaders({
        Authorization: 'Bearer x',
        Cookie: 'a=b',
        'X-Api-Key': 'k',
        Accept: 'application/json',
      })
    ).toEqual({
      Authorization: '[redacted]',
      Cookie: '[redacted]',
      'X-Api-Key': '[redacted]',
      Accept: 'application/json',
    });
  });

  it('sanitizeBody preserva null e undefined', () => {
    expect(sanitizeBody(null)).toBeNull();
    expect(sanitizeBody(undefined)).toBeUndefined();
  });

  it('sanitizeBody percorre arrays recursivamente', () => {
    expect(sanitizeBody([{ senha: 's' }, { ok: 1 }])).toEqual([{ senha: '[redacted]' }, { ok: 1 }]);
  });

  it('sanitizeBody redige campos sensíveis e aprofunda objetos', () => {
    expect(
      sanitizeBody({
        nome: 'João',
        token: 't',
        nested: { novaSenha: 'n', keep: 'v' },
      })
    ).toEqual({
      nome: 'João',
      token: '[redacted]',
      nested: { novaSenha: '[redacted]', keep: 'v' },
    });
  });

  it('sanitizeBody retorna primitivos como estão', () => {
    expect(sanitizeBody('plain')).toBe('plain');
    expect(sanitizeBody(42)).toBe(42);
  });
});
