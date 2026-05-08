// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mocks
jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(),
    sign: jest.fn().mockReturnValue('mocked_token'),
}));
import * as jwt from 'jsonwebtoken';

jest.mock('../models/user');
import User from '../models/user';

import { verificarToken, verificarProfessor, verificarAdministrador, verificarTokenOpcional } from '../middlewares/authMiddleware';
import { errorHandler } from '../middlewares/errorHandler';
import { httpLogMiddleware } from '../middlewares/httpLogMiddleware';

describe('Middleware Coverage Boost', () => {
    let app;
    
    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use((req, res, next) => {
            req.cookies = {};
            const cookieHeader = req.headers.cookie;
            if (cookieHeader) {
                const parts = cookieHeader.split('=');
                if (parts[0] === 'token') req.cookies.token = parts[1];
            }
            next();
        });
        process.env.JWT_SECRET = 'test-secret';
    });

    it('verificarToken extrai de Cookies e anexa user', async () => {
        app.get('/auth', verificarToken, (req, res) => res.json({ user: req.user }));
        
        jwt.verify.mockReturnValue({ id: 'u1' });
        User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'u1', tipoUsuario: 'ALUNO' }) });
        
        const res = await request(app).get('/auth').set('Cookie', 'token=tk123');
        expect(res.status).toBe(200);
        expect(res.body.user).toBeDefined();
    });

    it('verificarToken retorna 401 para token expirado', async () => {
        app.get('/auth', verificarToken, (req, res) => res.json({ ok: true }));
        
        const err = new Error('Expired');
        err.name = 'TokenExpiredError';
        jwt.verify.mockImplementation(() => { throw err; });
        
        const res = await request(app).get('/auth').set('Authorization', 'Bearer tk');
        expect(res.status).toBe(401);
        expect(res.body.message).toContain('expirado');
    });

    it('verificarToken retorna 401 se user não existir no BD', async () => {
        app.get('/auth', verificarToken, (req, res) => res.json({ ok: true }));
        jwt.verify.mockReturnValue({ id: 'u_missing' });
        User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
        
        const res = await request(app).get('/auth').set('Authorization', 'Bearer tk');
        expect(res.status).toBe(401);
        expect(res.body.message).toContain('não encontrado');
    });

    it('verificarToken retorna 401 para erro genérico (não JWT)', async () => {
        app.get('/auth', verificarToken, (req, res) => res.json({ ok: true }));
        jwt.verify.mockImplementation(() => { throw new Error('Other Error'); });
        
        const res = await request(app).get('/auth').set('Authorization', 'Bearer tk');
        expect(res.status).toBe(401);
        expect(res.body.message).toContain('inválido');
    });

    it('verificarProfessor e verificarAdministrador negam se req.user ausente', async () => {
        app.get('/prof', verificarProfessor, (req, res) => res.json({ ok: true }));
        app.get('/adm', verificarAdministrador, (req, res) => res.json({ ok: true }));
        
        const resP = await request(app).get('/prof');
        const resA = await request(app).get('/adm');
        expect(resP.status).toBe(401);
        expect(resA.status).toBe(401);
    });

    it('verificarProfessor permite PROFESSOR ou ADMINISTRADOR', async () => {
        app.get('/prof-check', (req, res, next) => { req.user = { tipoUsuario: 'PROFESSOR' }; next(); }, verificarProfessor, (req, res) => res.json({ ok: true }));
        const res = await request(app).get('/prof-check');
        expect(res.status).toBe(200);
    });

    it('verificarToken retorna 401 se token ausente', async () => {
        app.get('/no-token', verificarToken, (req, res) => res.json({ ok: true }));
        const res = await request(app).get('/no-token');
        expect(res.status).toBe(401);
    });

    it('verificarAdministrador nega ALUNO', async () => {
        app.get('/admin', (req, res, next) => { req.user = { tipoUsuario: 'ALUNO' }; next(); }, verificarAdministrador, (req, res) => res.json({ ok: true }));
        const res = await request(app).get('/admin');
        expect(res.status).toBe(403);
    });

    it('verificarAdministrador nega se tipoUsuario ausente', async () => {
        app.get('/admin-null', (req, res, next) => { req.user = {}; next(); }, verificarAdministrador, (req, res) => res.json({ ok: true }));
        const res = await request(app).get('/admin-null');
        expect(res.status).toBe(403);
    });

    it('verificarTokenOpcional funciona com token válido', async () => {
        app.get('/opt', verificarTokenOpcional, (req, res) => res.json({ user: req.user }));
        
        jwt.verify.mockReturnValue({ id: 'u1' });
        User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'u1' }) });
        
        const res = await request(app).get('/opt').set('Authorization', 'Bearer tk');
        expect(res.body.user).toBeDefined();
    });

    it('verificarTokenOpcional ignora token inválido', async () => {
        app.get('/opt', verificarTokenOpcional, (req, res) => res.json({ user: req.user }));
        jwt.verify.mockImplementation(() => { throw new Error('fail'); });
        
        const res = await request(app).get('/opt').set('Authorization', 'Bearer tk');
        expect(res.body.user).toBeUndefined();
    });

    it('errorHandler trata erros comuns', () => {
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        errorHandler({ name: 'TokenExpiredError' }, { headers: {} } as any, res as any, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
        
        errorHandler({ name: 'ValidationError', message: 'fail' }, { headers: {} } as any, res as any, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('httpLogMiddleware chama next', () => {
        const req = { method: 'GET', path: '/', get: jest.fn(), headers: {} };
        const res = { on: jest.fn() };
        const next = jest.fn();
        httpLogMiddleware(req as any, res as any, next);
        expect(next).toHaveBeenCalled();
    });

    it('loginRateLimiter chama next quando habilitado', (done) => {
        jest.isolateModules(() => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';
            const { loginRateLimiter } = require('../middlewares/authRateLimit');
            const req = { ip: '1.2.3.4' };
            const res = { set: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
            loginRateLimiter(req as any, res as any, () => {
                process.env.NODE_ENV = originalEnv;
                done();
            });
        });
    });
});
