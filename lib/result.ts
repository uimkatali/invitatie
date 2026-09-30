export type FailureCode = 'invalid' | 'not_found' | 'forbidden';

export interface Failure {
  ok: false;
  code: FailureCode;
  error: string;
  fields?: Record<string, string>;
}

export type Result<T = void> = { ok: true; value: T } | Failure;

/** Starea intoarsa de Server Actions catre formulare (useActionState). */
export type ActionState =
  | null
  | { ok: true; message?: string }
  | { ok: false; error: string; fields?: Record<string, string>; values?: Record<string, string> };

export const GENERIC_ERROR = 'Ceva n-a mers, incearca din nou.';

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function failure(code: FailureCode, error: string, fields?: Record<string, string>): Failure {
  return fields ? { ok: false, code, error, fields } : { ok: false, code, error };
}

export function toActionState(result: Result<unknown>, successMessage?: string): ActionState {
  if (result.ok) return successMessage ? { ok: true, message: successMessage } : { ok: true };
  return result.fields
    ? { ok: false, error: result.error, fields: result.fields }
    : { ok: false, error: result.error };
}
