import nextEnv from '@next/env';
import nodemailer from 'nodemailer';
import { gmailSmtpOptions, maskEmail, smtpErrorCode, smtpHint } from '../lib/notifications/smtp.mjs';

// Trimite un email de proba catre fiecare adresa configurata (EMAIL_EL, EMAIL_EA), cu aceleasi setari SMTP ca aplicatia.
// Nu afiseaza parola si nu afiseaza adresele intregi (a***@gmail.com).

nextEnv.loadEnvConfig(process.cwd());

const clean = (value) => (typeof value === 'string' ? value.trim() : '');
const user = clean(process.env.GMAIL_USER);
// Google afiseaza parola de aplicatie in grupuri de 4, cu spatii: le scoatem.
const pass = (process.env.GMAIL_APP_PASSWORD ?? '').replace(/\s+/g, '');

if (!user || !pass) {
  console.log('');
  console.log('Lipsesc GMAIL_USER si/sau GMAIL_APP_PASSWORD din .env.local (sau .env.local nu exista).');
  console.log('Fara ele aplicatia merge, dar nu trimite emailuri.');
  console.log('Cum le obtii: vezi SETUP.md, sectiunea 2 (Emailuri prin Gmail).');
  console.log('');
  process.exit(2);
}

const recipients = [
  { label: 'EMAIL_EL', address: clean(process.env.EMAIL_EL) },
  { label: 'EMAIL_EA', address: clean(process.env.EMAIL_EA) },
];
const configured = recipients.filter((r) => r.address);

if (configured.length === 0) {
  console.log('');
  console.log('Nu e setata nicio adresa de destinatar (EMAIL_EL, EMAIL_EA) in .env.local: nu am cui sa trimit.');
  console.log('');
  process.exit(2);
}

console.log(`Trimit un email de proba de la ${maskEmail(user)} (nu se afiseaza parola sau adresele intregi)...`);
console.log('');

const transport = nodemailer.createTransport(gmailSmtpOptions(user, pass));
const results = [];

for (const { label, address } of recipients) {
  if (!address) {
    console.log(`SKIP  ${label}: nu e setata, acest utilizator nu primeste emailuri`);
    continue;
  }
  try {
    await transport.sendMail({
      from: { name: 'Dateurile noastre', address: user },
      to: address,
      subject: 'Test notificari Dateurile noastre',
      text: 'Daca vezi acest email, notificarile prin Gmail functioneaza. Nu trebuie sa raspunzi.',
      html: '<p>Daca vezi acest email, notificarile prin Gmail functioneaza. Nu trebuie sa raspunzi.</p>',
    });
    results.push(true);
    console.log(`PASS  ${label} (${maskEmail(address)}): email trimis, verifica inbox-ul (si Spam)`);
  } catch (err) {
    results.push(false);
    const code = smtpErrorCode(err);
    const hint = smtpHint(code);
    console.log(`FAIL  ${label} (${maskEmail(address)}): ${code ?? 'eroare necunoscuta'}${hint ? `, ${hint}` : ''}`);
  }
}

transport.close();
console.log('');
if (results.every(Boolean)) {
  console.log('REZULTAT: PASS. Emailurile pornesc. Verifica si in Spam daca nu apar in inbox.');
  process.exit(0);
}
console.log('REZULTAT: FAIL. Vezi liniile FAIL de mai sus si SETUP.md, sectiunea 2.');
process.exit(1);
