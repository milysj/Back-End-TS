import { sanitizeBody, sanitizeHeaders } from './sanitizeForLog';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

/**
 * Formata e envia eventos de log para o Better Stack (ingestão HTTP).
 * Documentação: https://betterstack.com/docs/logs/ingesting-data/http/logs/
 */
export class BetterStackLogSink {
  private readonly sourceToken: string | undefined;

  private readonly ingestUrl: string;

  constructor() {
    this.sourceToken = process.env.BETTER_STACK_SOURCE_TOKEN;
    this.ingestUrl =
      process.env.BETTER_STACK_INGEST_URL?.replace(/\/$/, '') ||
      'https://in.logs.betterstack.com';
  }

  isEnabled(): boolean {
    return Boolean(this.sourceToken && this.sourceToken.length > 0);
  }

  /**
   * Monta o payload JSON enviado ao Better Stack (message + campos estruturados para buscas/alertas).
   */
  formatEvent(level: LogLevel, message: string, context: LogContext = {}): Record<string, unknown> {
    const dt = new Date().toISOString();
    const service = process.env.BETTER_STACK_SERVICE_NAME || 'estudemy-backend';
    const environment = process.env.NODE_ENV || 'development';

    return {
      dt,
      message,
      level,
      service,
      environment,
      ...this.deepSanitizeContext(context),
    };
  }

  async send(level: LogLevel, message: string, context: LogContext = {}): Promise<void> {
    if (!this.isEnabled()) return;

    const payload = this.formatEvent(level, message, context);
    const body = JSON.stringify([payload]);

    try {
      const res = await fetch(this.ingestUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.sourceToken}`,
          'Content-Type': 'application/json',
        },
        body,
      });
      if (!res.ok && res.status !== 202) {
        console.error(`[BetterStackLogSink] ingest falhou: ${res.status} ${await res.text()}`);
      }
    } catch (e) {
      console.error('[BetterStackLogSink] erro ao enviar log:', e);
    }
  }

  private deepSanitizeContext(ctx: LogContext): LogContext {
    const out: LogContext = {};
    for (const [k, v] of Object.entries(ctx)) {
      if (k === 'headers' && v && typeof v === 'object') {
        out[k] = sanitizeHeaders(v as Record<string, unknown>);
      } else if (k === 'body' || k === 'query' || k === 'params') {
        out[k] = sanitizeBody(v);
      } else if (v instanceof Error) {
        out[k] = { name: v.name, message: v.message, stack: v.stack };
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = this.deepSanitizeContext(v as LogContext);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
}
