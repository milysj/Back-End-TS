/**
 * URLs usadas em e-mails transacionais e redirects.
 * Em produção defina API_PUBLIC_URL (ou BACKEND_URL) e FRONTEND_URL com HTTPS e sem barra final.
 */
export function getPublicApiBaseUrl(): string {
  const raw = (process.env.API_PUBLIC_URL || process.env.BACKEND_URL || "").trim().replace(/\/+$/, "");
  if (raw) return raw;
  const port = process.env.PORT || "5000";
  return `http://localhost:${port}`;
}

export function getFrontendBaseUrl(): string {
  return (process.env.FRONTEND_URL || "http://localhost:3000").trim().replace(/\/+$/, "");
}
