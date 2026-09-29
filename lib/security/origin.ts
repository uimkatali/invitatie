/**
 * Server Actions au verificarea Origin incorporata; route handlers nu.
 * O folosim pe orice route handler care modifica date.
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get('origin');
  const host = (headers.get('x-forwarded-host')?.split(',')[0] ?? headers.get('host'))?.trim();
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
