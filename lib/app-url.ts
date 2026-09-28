export function appUrl(source: Record<string, string | undefined> = process.env): string {
  const explicit = source.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = source.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}
