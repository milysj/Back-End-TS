// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('connectDB (caminho feliz + listeners)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('conecta, loga host e registra handlers error/disconnected', async () => {
    const mockInfo = jest.fn();
    const mockError = jest.fn();
    const mockWarn = jest.fn();
    jest.doMock('../logging/appLogger', () => ({
      appLogger: {
        info: mockInfo,
        error: mockError,
        warn: mockWarn,
      },
      logHandledError: jest.fn(),
    }));

    const handlers: Record<string, (arg?: unknown) => void> = {};
    const mockOn = jest.fn((ev: string, fn: (arg?: unknown) => void) => {
      handlers[ev] = fn;
    });

    jest.doMock('mongoose', () => ({
      __esModule: true,
      default: {
        connect: jest.fn().mockResolvedValue({
          connection: { host: 'mongo-host', name: 'dbname' },
        }),
        connection: { on: mockOn },
      },
    }));

    const uri = process.env.MONGO_URI;
    process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/jest-db';

    const { connectDB } = await import('../config/db');
    await connectDB();

    expect(mockInfo).toHaveBeenCalledWith(
      'db.connected',
      expect.objectContaining({ host: 'mongo-host', name: 'dbname' })
    );
    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('disconnected', expect.any(Function));

    handlers.error?.(new Error('conn fail'));
    handlers.disconnected?.();

    expect(mockError).toHaveBeenCalledWith('db.connection_error', { message: 'conn fail' });
    expect(mockWarn).toHaveBeenCalledWith('db.disconnected', {});

    if (uri) process.env.MONGO_URI = uri;
    else delete process.env.MONGO_URI;
  });
});
