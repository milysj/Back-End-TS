// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

/**
 * Com NODE_ENV=test o appLogger retorna cedo em emit() e não cobre consoleLine/sink.
 * Este arquivo força NODE_ENV !== 'test' antes do import e mocka dependências.
 */
describe('appLogger fora do ambiente de teste (cobre emit + consoleLine)', () => {
  const origNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = origNodeEnv;
    jest.resetModules();
  });

  it('chama internalConsole por nível e envia ao sink', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    jest.doMock('../logging/BetterStackLogSink', () => ({
      BetterStackLogSink: class {
        send = send;
        isEnabled = () => false;
        formatEvent = jest.fn();
      },
    }));

    const log = jest.fn();
    const warn = jest.fn();
    const error = jest.fn();
    jest.doMock('../logging/internalConsole', () => ({
      internalConsole: {
        log,
        warn,
        error,
        info: log,
        debug: log,
      },
    }));

    process.env.NODE_ENV = 'development';

    const { appLogger, logHandledError } = await import('../logging/appLogger');

    appLogger.debug('d', { a: 1 });
    appLogger.info('i', {});
    appLogger.warn('w', {});
    appLogger.error('e', {});
    logHandledError('ctx', new Error('handled'));

    expect(log).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    expect(send).toHaveBeenCalled();
    expect(send.mock.calls.length).toBeGreaterThanOrEqual(5);
  });
});
