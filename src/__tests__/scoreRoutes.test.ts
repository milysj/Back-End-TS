import request from "supertest";
import express from "express";
import scoreRoutes from "../routes/scoreRoutes";
import * as scoreController from "../controllers/scoreController";
import { verificarToken } from "../middlewares/authMiddleware";

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

const app = express();
app.use(express.json());
app.use("/api/score", scoreRoutes);

describe("Score Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST /api/score/adicionar-xp should add XP and return score", async () => {
    const res = await request(app).post("/api/score/adicionar-xp").send({ xpGanho: 100 });
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("XP adicionado com sucesso");
    expect(res.body.xpGanho).toBe(100);
  });

  it("GET /api/score/usuario should return user score", async () => {
    const res = await request(app).get("/api/score/usuario");
    
    expect(res.status).toBe(200);
    expect(res.body.nivel).toBeDefined();
  });

  it("POST /api/score/usuarios should return multiple user scores", async () => {
    const res = await request(app).post("/api/score/usuarios").send({ userIds: ["507f1f77bcf86cd799439011"] });
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("POST /api/score/calcular-xp should calculate XP based on percentage", async () => {
    const res = await request(app).post("/api/score/calcular-xp").send({ porcentagemAcertos: 80 });
    
    expect(res.status).toBe(200);
    expect(res.body.xpGanho).toBe(400); // 80% of 500
  });

  it("POST /api/score/calcular-xp should fail with invalid percentage", async () => {
    const res = await request(app).post("/api/score/calcular-xp").send({ porcentagemAcertos: 150 });
    
    expect(res.status).toBe(400);
  });
});
