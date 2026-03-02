import { describe, it, expect } from '@jest/globals';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { gerarToken } from '../../utils/tokenHelper';

describe('Utils: tokenHelper', () => {
  describe('gerarToken', () => {
    it('deve gerar um token JWT válido a partir de um payload', () => {
      const payload = { id: '123', email: 'teste@teste.com' };
      const token = gerarToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('deve incluir o payload correto no token gerado', () => {
      const payload = { id: 'user-id-123', nome: 'Usuário Teste' };
      const token = gerarToken(payload);
      
      // 'verify' checa a assinatura, 'decode' não. Usar 'verify' é mais seguro.
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

      expect(decoded.id).toBe(payload.id);
      expect(decoded.nome).toBe(payload.nome);
    });

    it('deve gerar um token com o tempo de expiração padrão (7 dias)', () => {
        const payload = { id: '123' };
        const token = gerarToken(payload);
        const decoded = jwt.decode(token) as JwtPayload;
  
        const expirationTime = decoded.exp!;
        const issuedAtTime = decoded.iat!;
        const durationInSeconds = expirationTime - issuedAtTime;
  
        // 7 dias em segundos = 7 * 24 * 60 * 60 = 604800
        expect(durationInSeconds).toBe(604800);
    });

    it('deve gerar tokens diferentes para payloads diferentes', () => {
        const payload1 = { id: '1' };
        const payload2 = { id: '2' };
        const token1 = gerarToken(payload1);
        const token2 = gerarToken(payload2);
        expect(token1).not.toBe(token2);
    });

    it('deve lançar um erro se JWT_SECRET não estiver definido', () => {
        const originalSecret = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET; // Força o erro

        expect(() => gerarToken({ id: '1' })).toThrow('A configuração do servidor está incompleta.');

        process.env.JWT_SECRET = originalSecret; // Restaura a variável
    });
  });
});
