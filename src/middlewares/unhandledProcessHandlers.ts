import { appLogger } from '../logging/appLogger';

/**
 * Captura rejeições e exceções não tratadas no processo Node (fora do pipeline Express).
 */
export function registerUnhandledProcessHandlers(): void {
  if (process.env.NODE_ENV === 'test') return;

  process.on('unhandledRejection', (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    void appLogger.error('process.unhandledRejection', {
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    });
  });

  process.on('uncaughtException', (err: Error) => {
    void appLogger.error('process.uncaughtException', {
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    });
  });
}
