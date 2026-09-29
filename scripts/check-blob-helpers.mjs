/** Functii pure pentru scripts/check-blob.mjs (testate in check-blob-helpers.test.ts). */

const TOKEN_SHAPE = /^vercel_blob_rw_[^_\s]+_\S+$/;

/** 'missing' | 'placeholder' | null (token cu forma unui token read-write Vercel Blob). */
export function tokenProblem(token) {
  const value = typeof token === 'string' ? token.trim() : '';
  if (value === '') return 'missing';
  return TOKEN_SHAPE.test(value) ? null : 'placeholder';
}

/**
 * Rezultatul cererii anonime catre URL-ul unui blob:
 * 'pass' = refuzata (4xx), 'public' = a raspuns cu succes (store Public), 'unclear' = altceva.
 */
export function anonymousVerdict(status) {
  if (status >= 200 && status < 300) return 'public';
  if (status >= 400 && status < 500) return 'pass';
  return 'unclear';
}

const MAX_LENGTH = 200;

/** Text sigur de afisat: fara tokenul folosit, fara nicio forma de token si fara URL-uri Blob; scurtat. */
export function redact(text, token) {
  let out = String(text);
  if (token) out = out.split(token).join('***');
  out = out.replace(/vercel_blob_rw_\S+/g, '***');
  out = out.replace(/https?:\/\/\S*blob\.vercel-storage\.com\S*/g, '[url ascuns]');
  return out.length > MAX_LENGTH ? `${out.slice(0, MAX_LENGTH - 3)}...` : out;
}
