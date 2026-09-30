/** Setari si utilitare SMTP comune pentru aplicatie (email.ts) si scripts/check-email.mjs (testate in smtp.test.ts). */

const TIMEOUT_MS = 10_000;

/** Optiunile transportului nodemailer pentru Gmail SMTP (port 465, TLS direct). */
export function gmailSmtpOptions(user, pass) {
  return {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  };
}

/** a***@gmail.com: destul pentru ca omul sa recunoasca adresa, fara sa o afisam intreaga. */
export function maskEmail(address) {
  const value = typeof address === 'string' ? address.trim() : '';
  const at = value.lastIndexOf('@');
  if (at < 1) return '***';
  return `${value[0]}***${value.slice(at)}`;
}

const CODE_SHAPE = /^[A-Z][A-Z0-9_]{2,24}$/;

/**
 * Codul scurt al unei erori nodemailer / de retea (EAUTH, ECONNECTION, ETIMEDOUT, ESOCKET, EENVELOPE...),
 * sau null. Nu se citeste niciodata mesajul erorii: poate contine adrese sau raspunsul serverului.
 */
export function smtpErrorCode(err) {
  const code = err && typeof err === 'object' ? err.code : undefined;
  return typeof code === 'string' && CODE_SHAPE.test(code) ? code : null;
}

/** Indiciu in romana pentru un cod de eroare, sau null. */
export function smtpHint(code) {
  switch (code) {
    case 'EAUTH':
      return 'parola de aplicatie gresita sau verificarea in 2 pasi nu e activa pe contul Google';
    case 'ECONNECTION':
    case 'ETIMEDOUT':
    case 'ESOCKET':
    case 'ECONNREFUSED':
    case 'ENOTFOUND':
      return 'nu ma pot conecta la smtp.gmail.com: verifica internetul si ca portul 465 nu e blocat';
    case 'EENVELOPE':
      return 'adresa destinatarului pare invalida';
    default:
      return null;
  }
}
