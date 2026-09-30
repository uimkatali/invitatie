import { randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
import { put, get, del } from '@vercel/blob';
import { tokenProblem, anonymousVerdict, redact } from './check-blob-helpers.mjs';

// Verifica ca store-ul Vercel Blob din .env.local e PRIVAT si ca aplicatia il poate folosi.
// Nu afiseaza niciodata tokenul sau URL-urile blob-urilor.

nextEnv.loadEnvConfig(process.cwd());
const token = process.env.BLOB_READ_WRITE_TOKEN;

// PNG valid de 1x1 pixeli.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const PASS = 'PASS';
const FAIL = 'FAIL';
const results = [];
const report = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? PASS : FAIL}  ${name}${detail ? `: ${detail}` : ''}`);
};
const message = (err) => redact(err instanceof Error ? `${err.name}: ${err.message}` : String(err), token);

const problem = tokenProblem(token);
if (problem) {
  console.log('');
  console.log(
    problem === 'missing'
      ? 'BLOB_READ_WRITE_TOKEN lipseste din .env.local (sau .env.local nu exista).'
      : 'BLOB_READ_WRITE_TOKEN pare o valoare provizorie: un token real incepe cu vercel_blob_rw_ si are trei parti.',
  );
  console.log('Pune tokenul real in .env.local, la randul BLOB_READ_WRITE_TOKEN=...');
  console.log('Unde il gasesti: vezi SETUP.md, pasul 3.1 (Vercel -> Storage -> store-ul tau -> tab-ul .env.local).');
  console.log('');
  process.exit(2);
}

console.log('Verific store-ul Vercel Blob (nu se afiseaza tokenul sau adresele)...');
console.log('');

const pathname = `healthcheck/${randomUUID()}.png`;
let uploaded = null;

try {
  // 1. Incarcare privata
  try {
    uploaded = await put(pathname, PNG, { access: 'private', contentType: 'image/png', addRandomSuffix: true, token });
    report('1. Incarcare privata', true);
  } catch (err) {
    report('1. Incarcare privata', false, message(err));
    console.log('   Motive posibile: tokenul e gresit sau vechi, sau store-ul a fost creat ca Public.');
    console.log('   Store-ul trebuie creat ca Private, iar tokenul copiat de la el (SETUP.md, pasul 3.1).');
  }

  if (uploaded) {
    // 2. Cererea anonima (fara token) trebuie refuzata
    try {
      const response = await fetch(uploaded.url, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
      const verdict = anonymousVerdict(response.status);
      if (verdict === 'pass') {
        report('2. Cerere anonima refuzata', true, `raspuns ${response.status}`);
      } else if (verdict === 'public') {
        report('2. Cerere anonima refuzata', false, `raspuns ${response.status}: poza s-a putut citi FARA autentificare`);
        console.log('   Store-ul este Public. Creeaza store-ul ca Private (SETUP.md, pasul 3.1) si pune noul token in .env.local.');
      } else {
        report('2. Cerere anonima refuzata', false, `raspuns neasteptat ${response.status}, nu pot confirma ca e privat`);
      }
    } catch (err) {
      report('2. Cerere anonima refuzata', false, message(err));
    }

    // 3. Citire autentificata cu SDK-ul, exact ca in aplicatie (dupa pathname)
    try {
      const result = await get(uploaded.pathname, { access: 'private', token, abortSignal: AbortSignal.timeout(15_000) });
      if (!result || result.statusCode !== 200) {
        report('3. Citire autentificata', false, 'blob-ul nu a fost gasit');
      } else {
        const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
        report('3. Citire autentificata', bytes.equals(PNG), bytes.equals(PNG) ? 'continutul coincide' : 'continutul difera');
      }
    } catch (err) {
      report('3. Citire autentificata', false, message(err));
    }
  }
} finally {
  // 4. Curatenie: sterge blob-ul de test, chiar daca pasii de mai sus au esuat
  if (uploaded) {
    try {
      await del(uploaded.pathname, { token });
      report('4. Stergere blob de test', true);
    } catch (err) {
      report('4. Stergere blob de test', false, message(err));
    }
  }
}

console.log('');
if (results.length > 0 && results.every(Boolean)) {
  console.log('REZULTAT: PASS. Store-ul este privat si functioneaza. Poti incarca poze.');
  process.exit(0);
}
console.log('REZULTAT: FAIL. Vezi pasii marcati FAIL de mai sus si SETUP.md, pasul 3.1.');
process.exit(1);
