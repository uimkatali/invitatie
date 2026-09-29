# Checklist de securitate (inainte de fiecare deploy important)

## Automat
- [ ] `npm run verify` trece (typecheck, teste unit + integrare, `npm audit --audit-level=high`)
- [ ] `npm run test:e2e` trece (inclusiv `e2e/security.spec.ts`)
- [ ] `git status` nu arata `.env.local`, `.env.test.local` si NU arata `.env.local.example` ca modificat (fisierul exemplu e urmarit de git: nu pui niciodata valori reale in el)

## Configurare
- [ ] In Vercel exista toate variabilele din `.env.local.example` pentru Production (cu exceptia `EMAIL_EA` si `APP_URL`, care sunt optionale)
- [ ] `SESSION_SECRET` din productie e diferit de cel local si are minim 32 de caractere
- [ ] Nu mai exista variabilele vechi `EDGE_CONFIG`, `EDGE_CONFIG_ID`, `VERCEL_API_TOKEN`
- [ ] Tokenul vechi `VERCEL_API_TOKEN` e revocat (Vercel -> Account Settings -> Tokens)
- [ ] `.env.local` si `.env.test.local` NU apar in `git status` / pe GitHub
- [ ] Dependabot e activ (`.github/dependabot.yml` e in repo; GitHub -> repo -> Settings -> Code security -> Dependabot alerts: Enabled)
- [ ] Functiile ruleaza in `fra1` (setat in `vercel.json`; verifica Vercel -> Project -> Settings -> Functions)
- [ ] Baza `dates_test` e separata de `dates`; testele nu ating niciodata baza reala (au o garda pe numele bazei)

## Ce apara aplicatia (de stiut, nu de bifat)
- **Acces:** `proxy.ts` trimite la `/login` orice pagina fara sesiune valida si raspunde 401 la `/api/*`. Fiecare Server Action verifica singura sesiunea.
- **Sesiune:** cookie `session`, `httpOnly`, `SameSite=Lax`, `Secure` in productie, valabil 30 de zile. Semnat cu `SESSION_SECRET`.
- **Login:** maxim 5 incercari gresite per IP in 15 minute (dupa aceea se blocheaza chiar si parola corecta); IP-ul se stocheaza doar ca HMAC.
- **CSP:** nonce nou la fiecare cerere, `script-src 'self' 'nonce-...' 'strict-dynamic'`, fara `unsafe-eval` in productie, `frame-ancestors 'none'`, `object-src 'none'`.
- **Poze:** se servesc doar prin `/api/photos/<id>` dupa verificarea sesiunii, cu `Content-Security-Policy: default-src 'none'; sandbox`, `nosniff` si fara redirecturi (un URL din DB care nu e pe Vercel Blob nu se acceseaza niciodata).
- **Upload:** `/api/blob-upload` cere sesiune, acelasi origin, `Content-Length` (411 fara), maxim 4 MB (413) si accepta doar imagini reale (JPEG, PNG, WebP; verificate dupa continut, nu dupa tipul declarat). Un user nu poate incarca in amintirea celuilalt.
- **Headere:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Cross-Origin-Opener-Policy: same-origin`, `Permissions-Policy` restrictiv, HSTS in productie, fara `X-Powered-By`.
- **Continut utilizator:** afisat ca text (React), niciodata ca HTML; mesajele flash vin dintr-o lista fixa, nu din URL.
- **Dependente:** Dependabot saptamanal + `npm audit --audit-level=high` in `npm run verify`.

## Verificare pe productie
- [ ] Headere: https://securityheaders.com cu URL-ul aplicatiei -> nota A sau A+
- [ ] Fereastra privata -> `https://<app>/` -> redirect la `/login`
- [ ] Fereastra privata -> URL-ul unei poze (`/api/photos/...`, copiat dintr-o sesiune logata) -> 401
- [ ] 6 incercari gresite de login -> mesajul "Prea multe incercari"
- [ ] Vercel -> Logs: nu apar parole, token-uri sau continutul mesajelor
