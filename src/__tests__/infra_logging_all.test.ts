// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { sanitizeHeaders, sanitizeBody } from '../logging/sanitizeForLog';
import { getPublicApiBaseUrl, getFrontendBaseUrl } from '../config/publicUrls';
import { errorHandler } from '../middlewares/errorHandler';
import { BetterStackLogSink } from '../logging/BetterStackLogSink';

describe('Infrastructure Domain', () => {
    
    describe('Config & URLs', () => {
        const backup = { ...process.env };
        afterEach(() => { Object.assign(process.env, backup); });

        it('getPublicApiBaseUrl prioriza API_PUBLIC_URL', () => {
            process.env.API_PUBLIC_URL = 'https://api.app.com/';
            expect(getPublicApiBaseUrl()).toBe('https://api.app.com');
        });

        it('getFrontendBaseUrl respeita FRONTEND_URL', () => {
            process.env.FRONTEND_URL = 'https://front.app/';
            expect(getFrontendBaseUrl()).toBe('https://front.app');
        });
        
        it('config/mail cria transporter', async () => {
            process.env.MAIL_HOST = 'smtp.test.com';
            jest.resetModules();
            const { getSmtpTransporter } = await import('../config/mail');
            expect(getSmtpTransporter()).toBeDefined();
        });
    });

    describe('Logging & Sanitization', () => {
        it('sanitizeHeaders e sanitizeBody redigem segredos', () => {
            expect(sanitizeHeaders({ Authorization: 's' })).toEqual({ Authorization: '[redacted]' });
            expect(sanitizeBody({ senha: 'p' })).toEqual({ senha: '[redacted]' });
        });

        it('sanitizeBody cobre arrays, objetos aninhados e primitivos', () => {
            const input = [{ senha: '123' }, { a: { token: 's' } }, 'normal', 123];
            const out = sanitizeBody(input);
            expect(out[0].senha).toBe('[redacted]');
            expect(out[1].a.token).toBe('[redacted]');
            expect(out[2]).toBe('normal');
            expect(out[3]).toBe(123);
        });

        it('BetterStackLogSink formata e envia (mocked)', async () => {
            process.env.BETTER_STACK_SOURCE_TOKEN = 't';
            const sink = new BetterStackLogSink();
            
            // formatEvent branches
            const ev = sink.formatEvent('info', 'msg', { body: { senha: '123' } });
            expect(ev.message).toBe('msg');
            expect(ev.body.senha).toBe('[redacted]');

            const ev2 = sink.formatEvent('warn', 'w', undefined);
            expect(ev2.dt).toBeDefined();
            
            // deepSanitizeContext
            const sanitized = sink['deepSanitizeContext']({ a: { token: 's' }, err: new Error('x') });
            expect(sanitized.a.token).toBe('[redacted]');
            expect(sanitized.err).toBeDefined();

            global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 202, text: async () => '' });
            await sink.send('info', 'msg');
            expect(global.fetch).toHaveBeenCalled();

            // Caminho de erro (fetch falha)
            global.fetch = jest.fn().mockRejectedValue(new Error('fail'));
            await sink.send('error', 'fail');

            // Caminho de erro (ingest falha - status não 202/200)
            global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'Internal Error' });
            await sink.send('info', 'retry');
            
            delete process.env.BETTER_STACK_SOURCE_TOKEN;
        });

        it('internalConsole fallback para info e debug', () => {
            const backupInfo = console.info;
            const backupDebug = console.debug;
            console.info = undefined;
            console.debug = undefined;
            jest.isolateModules(() => {
                const { internalConsole } = require('../logging/internalConsole');
                expect(internalConsole.info).toBeDefined();
                expect(internalConsole.debug).toBeDefined();
            });
            console.info = backupInfo;
            console.debug = backupDebug;
        });

        it('appLogger emite logs e trata NODE_ENV != test', () => {
            const backupEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});
            jest.isolateModules(() => {
                const { appLogger } = require('../logging/appLogger');
                appLogger.info('prod test', { meta: 1 });
                expect(mockLog).toHaveBeenCalled();
            });
            mockLog.mockRestore();
            process.env.NODE_ENV = backupEnv;
        });
    });

    describe('Config & URLs Extras', () => {
        it('getPublicApiBaseUrl usa localhost:PORT se faltar URLs env', () => {
            const b1 = process.env.API_PUBLIC_URL;
            const b2 = process.env.BACKEND_URL;
            delete process.env.API_PUBLIC_URL;
            delete process.env.BACKEND_URL;
            process.env.PORT = '8080';
            expect(getPublicApiBaseUrl()).toBe('http://localhost:8080');
            process.env.API_PUBLIC_URL = b1;
            process.env.BACKEND_URL = b2;
        });
    });

    describe('Database (Isolation)', () => {
        beforeEach(() => { jest.resetModules(); });
        afterEach(() => { jest.resetModules(); });

        it('connectDB conecta e registra listeners', async () => {
            const mockInfo = jest.fn();
            jest.doMock('../logging/appLogger', () => ({
                appLogger: { info: mockInfo, error: jest.fn(), warn: jest.fn() },
                logHandledError: jest.fn(),
            }));
            jest.doMock('mongoose', () => ({
                __esModule: true,
                default: {
                    connect: jest.fn().mockResolvedValue({ connection: { host: 'h', name: 'd' } }),
                    connection: { on: jest.fn() },
                },
            }));
            process.env.MONGO_URI = 'mongodb://localhost/test';
            const { connectDB } = await import('../config/db');
            await connectDB();
            expect(mockInfo).toHaveBeenCalled();
        });

        it('connectDB falha sem MONGO_URI', async () => {
            delete process.env.MONGO_URI;
            const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
            const { connectDB } = await import('../config/db');
            await expect(connectDB()).rejects.toThrow('exit');
            exitSpy.mockRestore();
        });
    });

    describe('Utils (tokenHelper)', () => {
        it('gerarToken cria um JWT válido e falha sem secret', async () => {
            const { gerarToken } = await import('../utils/tokenHelper');
            const token = gerarToken({ id: '123' });
            expect(token).toBeDefined();

            const old = process.env.JWT_SECRET;
            delete process.env.JWT_SECRET;
            expect(() => gerarToken({ id: '1' })).toThrow();
            process.env.JWT_SECRET = old;
        });
    });
});
