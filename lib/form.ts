import type { z } from 'zod';

export function pickStrings<K extends string>(formData: FormData, keys: readonly K[]): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of keys) {
    const value = formData.get(key);
    out[key] = typeof value === 'string' ? value : '';
  }
  return out;
}

export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!Object.hasOwn(out, key)) out[key] = issue.message;
  }
  return out;
}
