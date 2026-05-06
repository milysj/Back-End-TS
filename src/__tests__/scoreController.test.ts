import { calcularXP, calcularNivel } from "../controllers/scoreController";

describe("Score Controller Utils", () => {
  describe("calcularXP", () => {
    it("should calculate correct XP for 100% hits", () => {
      expect(calcularXP(100)).toBe(500);
    });

    it("should calculate correct XP for 50% hits", () => {
      expect(calcularXP(50)).toBe(250);
    });

    it("should calculate correct XP for 0% hits", () => {
      expect(calcularXP(0)).toBe(0);
    });
  });

  describe("calcularNivel", () => {
    it("should return level 1 for 0 XP", () => {
      const result = calcularNivel(0);
      expect(result.nivel).toBe(1);
      expect(result.xpAtual).toBe(0);
      expect(result.xpNecessario).toBe(100);
      expect(result.xpAcumulado).toBe(0);
    });

    it("should return level 2 for 100 XP", () => {
      const result = calcularNivel(100);
      expect(result.nivel).toBe(2);
      expect(result.xpAtual).toBe(0);
      expect(result.xpNecessario).toBe(210);
      expect(result.xpAcumulado).toBe(100);
    });

    it("should return level 3 for 310 XP", () => {
      const result = calcularNivel(310);
      expect(result.nivel).toBe(3);
      expect(result.xpAtual).toBe(0);
      expect(result.xpNecessario).toBe(331); // 100 + 210 * 1.1 = 100 + 231 = 331
      expect(result.xpAcumulado).toBe(310);
    });

    it("should calculate correct current XP within a level", () => {
      const result = calcularNivel(150);
      expect(result.nivel).toBe(2);
      expect(result.xpAtual).toBe(50);
      expect(result.xpNecessario).toBe(210);
      expect(result.xpAcumulado).toBe(100);
    });
  });
});
