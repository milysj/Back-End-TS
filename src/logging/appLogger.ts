import { BetterStackLogSink, LogContext, LogLevel } from './BetterStackLogSink';
import { internalConsole } from './internalConsole';

const sink = new BetterStackLogSink();

function consoleLine(level: LogLevel, message: string, context: LogContext): void {
  const line = `[${level.toUpperCase()}] ${message} ${Object.keys(context).length ? JSON.stringify(context) : ''}`;
  if (level === 'error') internalConsole.error(line);
  else if (level === 'warn') internalConsole.warn(line);
  else internalConsole.log(line);
}

function emit(level: LogLevel, message: string, context: LogContext = {}): void {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  consoleLine(level, message, context);
  void sink.send(level, message, context);
}

export const appLogger = {
  debug: (message: string, context: LogContext = {}): void => emit('debug', message, context),
  info: (message: string, context: LogContext = {}): void => emit('info', message, context),
  warn: (message: string, context: LogContext = {}): void => emit('warn', message, context),
  error: (message: string, context: LogContext = {}): void => emit('error', message, context),
};

/**
 * Para uso em blocos catch (erros já tratados e respondidos ao cliente).
 */
export function logHandledError(where: string, error: unknown, extra: LogContext = {}): void {
  const err = error instanceof Error ? error : new Error(String(error));
  void appLogger.error('handled_error', {
    where,
    errorName: err.name,
    errorMessage: err.message,
    stack: err.stack,
    ...extra,
  });
}
