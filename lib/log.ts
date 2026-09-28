type Level = 'info' | 'warn' | 'error';

/**
 * Log JSON pe stdout (apare in Vercel Logs).
 * Nu trimite aici parole, token-uri, hash-uri sau continutul mesajelor.
 */
export function log(level: Level, event: string, data: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...data });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function errorName(err: unknown): string {
  return err instanceof Error ? err.name : 'UnknownError';
}
