import util from 'node:util';
import { appLogger } from './appLogger';
import { internalConsole } from './internalConsole';

const PATCH_KEY = '__estudemyConsolePatched__';

function shouldSkipPatch(): boolean {
  return process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);
}

function formatConsoleArgs(args: unknown[]): string {
  if (args.length === 0) return '';
  return args
    .map((a) => {
      if (a === undefined) return 'undefined';
      if (a === null) return 'null';
      if (typeof a === 'string') return a;
      if (typeof a === 'number' || typeof a === 'boolean' || typeof a === 'bigint') return String(a);
      if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack ?? ''}`;
      try {
        return util.inspect(a, { depth: 4, maxArrayLength: 30, breakLength: 120 });
      } catch {
        return '[uninspectable]';
      }
    })
    .join(' ');
}

/**
 * Encaminha console.* para o mesmo pipeline do appLogger (stdout + Better Stack quando configurado).
 */
export function installConsolePatch(): void {
  if (shouldSkipPatch()) return;
  const g = globalThis as Record<string, unknown>;
  if (g[PATCH_KEY]) return;
  g[PATCH_KEY] = true;

  console.log = (...args: unknown[]) => {
    internalConsole.log(...(args as []));
    const message = formatConsoleArgs(args);
    void appLogger.info('console.log', { message });
  };

  console.info = (...args: unknown[]) => {
    internalConsole.info(...(args as []));
    const message = formatConsoleArgs(args);
    void appLogger.info('console.info', { message });
  };

  console.warn = (...args: unknown[]) => {
    internalConsole.warn(...(args as []));
    const message = formatConsoleArgs(args);
    void appLogger.warn('console.warn', { message });
  };

  console.error = (...args: unknown[]) => {
    internalConsole.error(...(args as []));
    const message = formatConsoleArgs(args);
    void appLogger.error('console.error', { message });
  };

  console.debug = (...args: unknown[]) => {
    internalConsole.debug(...(args as []));
    const message = formatConsoleArgs(args);
    void appLogger.debug('console.debug', { message });
  };
}

installConsolePatch();
