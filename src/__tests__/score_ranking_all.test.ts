// @ts-nocheck
import request from "supertest";
import express from "express";
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import scoreRoutes from "../routes/scoreRoutes";
import { calcularXP, calcularNivel } from "../controllers/scoreController";
import * as rankingController from "../controllers/rankingController";
import Progresso from "../models/progresso";
import User from "../models/user";
import mongoose from "mongoose";

// Mocks
jest.mock("../middlewares/authMiddleware", () => ({
  verificarToken: (req: any, res: any, next: any) => {
    req.userId = "507f1f77bcf86cd799439011";
    next();
  },
}));

jest.mock("../models/score", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      userId: "507f1f77bcf86cd799439011",
      xpTotal: 100,
      save: jest.fn().mockResolvedValue(true),
    }),
    find: jest.fn().mockResolvedValue([{
      userId: "507f1f77bcf86cd799439011",
      xpTotal: 100,
      save: jest.fn().mockResolvedValue(true),
    }]),
  },
}));

jest.mock("../models/progresso", () => ({
    aggregate: jest.fn(),
    findOne: jest.fn(),
}));

jest.mock("../models/user", () => ({
    find: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use("/api/score", scoreRoutes);

const oid = '507f1f77bcf86cd799439011';

describe("Score & Ranking Domain", () => {
  describe("Score Utils (Unit)", () => {
    it("calcula XP baseado em porcentagem", () => {
      expect(calcularXP(100)).toBe(500);
      expect(calcularXP(50)).toBe(250);
      expect(calcularXP(0)).toBe(0);
    });

    it("calcula nível baseado em XP", () => {
      expect(calcularNivel(0).nivel).toBe(1);
      expect(calcularNivel(100).nivel).toBe(2);
      expect(calcularNivel(310).nivel).toBe(3);
      expect(calcularNivel(-10).nivel).toBe(1); // XP negativo
    });
  });

  describe("Score Routes (Integration)", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("POST /api/score/adicionar-xp deve adicionar XP", async () => {
      const res = await request(app).post("/api/score/adicionar-xp").send({ xpGanho: 100 });
      expect(res.status).toBe(200);
      expect(res.body.xpGanho).toBe(100);
    });

    it("GET /api/score/usuario deve retornar score", async () => {
      const res = await request(app).get("/api/score/usuario");
      expect(res.status).toBe(200);
      expect(res.body.nivel).toBeDefined();
    });

    it("POST /api/score/calcular-xp valida porcentagem", async () => {
      const resOk = await request(app).post("/api/score/calcular-xp").send({ porcentagemAcertos: 80 });
      expect(resOk.body.xpGanho).toBe(400);

      const resFail = await request(app).post("/api/score/calcular-xp").send({ porcentagemAcertos: 150 });
      expect(resFail.status).toBe(400);

      const resNeg = await request(app).post("/api/score/calcular-xp").send({ porcentagemAcertos: -1 });
      expect(resNeg.status).toBe(400);
    });

    it("POST /api/score/adicionar-xp valida XP positivo", async () => {
      const res = await request(app).post("/api/score/adicionar-xp").send({ xpGanho: -100 });
      expect(res.status).toBe(400);
    });

    it("GET /api/score/usuario trata erro inesperado", async () => {
        const { default: Score } = await import("../models/score");
        jest.spyOn(Score, 'findOne').mockRejectedValue(new Error('DB Fail'));
        const res = await request(app).get("/api/score/usuario");
        expect(res.status).toBe(500);
    });
  });

  describe("Ranking Controller (Unit)", () => {
    it("obterRanking retorna lista formatada", async () => {
        Progresso.aggregate.mockResolvedValue([{ _id: "u1", nome: "N", totalFases: 1, totalAcertos: 1, totalPerguntas: 1, mediaAcertos: 50 }]);
        const res = { json: jest.fn() };
        await rankingController.obterRanking({}, res);
        expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ position: 1, name: "N" })]));
    });

    it("obterRankingNivel retorna ranking por nível", async () => {
        User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: "u1", username: "U" }]) });
        const { default: Score } = await import("../models/score");
        Score.find.mockResolvedValue([{ userId: "u1", xpTotal: 500, nivel: 3 }]);
        
        const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        await rankingController.obterRankingNivel({ headers: {} }, res);
        expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ nivel: 3 })]));
    });

    it("obterRankingNivel trata AbortError no fetch", async () => {
        jest.useFakeTimers();
        User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: "u1", username: "U" }]) });
        global.fetch = jest.fn().mockImplementation((_url, init) => {
            return new Promise((_resolve, reject) => {
                init?.signal?.addEventListener('abort', () => {
                    const err = new Error('Aborted');
                    err.name = 'AbortError';
                    reject(err);
                });
            });
        });
        const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        const p = rankingController.obterRankingNivel({ headers: {} }, res);
        await jest.advanceTimersByTimeAsync(5001);
        await p;
        expect(res.json).toHaveBeenCalled();
        jest.useRealTimers();
    });

    it("obterRanking trata erro no aggregate", async () => {
        Progresso.aggregate.mockRejectedValue(new Error('Agg fail'));
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await rankingController.obterRanking({}, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    describe("Score & Ranking Extra Branches", () => {
        it("adicionarXPInterno cria score se não existir", async () => {
            const { adicionarXPInterno } = require("../controllers/scoreController");
            const { default: Score } = require("../models/score");
            Score.findOne.mockResolvedValue(null);
            Score.create.mockResolvedValue({ userId: oid, xpTotal: 50, save: jest.fn() });
            
            const res = await adicionarXPInterno(oid, 50);
            expect(res.xpTotal).toBe(50);
        });

        it("obterRankingNivel retorna vazio se não houver usuários", async () => {
            User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            await rankingController.obterRankingNivel({}, res);
            expect(res.json).toHaveBeenCalledWith([]);
        });

        it("obterRanking formata nomes padrões corretamente", async () => {
            const userOid = new mongoose.Types.ObjectId(oid);
            Progresso.aggregate.mockResolvedValue([{ 
                _id: userOid, 
                totalFases: 1, 
                totalAcertos: 1, 
                totalPerguntas: 1,
                username: "User1"
            }]);
            const res = { json: jest.fn() };
            await rankingController.obterRanking({}, res);
            expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ name: "User1" })]));
        });

        it("obterScoreUsuarioInterno sincroniza nível out-of-sync", async () => {
            const { obterScoreUsuarioInterno } = require("../controllers/scoreController");
            const { default: Score } = require("../models/score");
            const mockScore = { userId: oid, xpTotal: 300, nivel: 1, save: jest.fn() };
            Score.findOne.mockResolvedValue(mockScore);
            const res = await obterScoreUsuarioInterno(oid);
            expect(res.nivel).toBe(2);
            expect(mockScore.save).toHaveBeenCalled();
        });

        it("obterScoreUsuarios valida input array", async () => {
            const { obterScoreUsuarios } = require("../controllers/scoreController");
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            await obterScoreUsuarios({ body: { userIds: "not-array" } }, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("obterRankingNivel lida com erro no score interno", async () => {
            User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: oid }]) });
            const { default: Score } = require("../models/score");
            Score.find.mockRejectedValue(new Error('Fail'));
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            await rankingController.obterRankingNivel({ headers: {} }, res);
            // Continua como vazio ou erro interno mas não deve explodir
            expect(res.json).toHaveBeenCalled();
        });
    });
  });
});
