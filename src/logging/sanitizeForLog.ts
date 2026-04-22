const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
]);

const SENSITIVE_BODY_KEYS = new Set([
  'senha',
  'password',
  'novasenha',
  'token',
  'temptoken',
  'codigo',
  'backupcodes',
]);

export function sanitizeHeaders(headers: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!headers || typeof headers !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(headers)) {
    const key = k.toLowerCase();
    if (SENSITIVE_HEADER_KEYS.has(key)) {
      out[k] = '[redacted]';
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function sanitizeBody(body: unknown): unknown {
  if (body === null || body === undefined) return body;
  if (Array.isArray(body)) {
    return body.map((item) => sanitizeBody(item));
  }
  if (typeof body === 'object') {
    const o = body as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      const key = k.toLowerCase();
      if (SENSITIVE_BODY_KEYS.has(key)) {
        out[k] = '[redacted]';
      } else if (typeof v === 'object' && v !== null) {
        out[k] = sanitizeBody(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return body;
}
