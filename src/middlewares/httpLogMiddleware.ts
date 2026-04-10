import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { appLogger } from '../logging/appLogger';
import { sanitizeBody, sanitizeHeaders } from '../logging/sanitizeForLog';

function clientIp(req: Request): string | undefined {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) {
    return xf.split(',')[0]?.trim();
  }
  if (Array.isArray(xf) && xf[0]) return xf[0];
  return req.socket?.remoteAddress;
}

/**
 * Registra cada requisição/resposta com metadados para o Better Stack (alertas de volume, status e duração).
 */
export function httpLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  req.requestId = requestId;
  const startedAt = Date.now();

  const origin = req.get('origin') ?? req.headers.origin;
  const referer = req.get('referer');

  void appLogger.info('http.request', {
    requestId,
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    query: sanitizeBody(req.query),
    params: sanitizeBody(req.params),
    body: sanitizeBody(req.body),
    origin,
    referer,
    ip: clientIp(req),
    userAgent: req.get('user-agent'),
    headers: sanitizeHeaders(req.headers as Record<string, unknown>),
  });

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    void appLogger.info('http.response', {
      requestId,
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      contentLength: res.get('content-length'),
    });
  });

  next();
}
