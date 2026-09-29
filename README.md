# Dateurile noastre

Manager de dateuri pentru doi: invitatii cu raspuns (Da / Nu / Propun alta ora), dashboard cu countdown, calendar, amintiri cu rating si poze private, idei comune, notificari. Fundal 3D cu frunze si fulgi pastel, iar destinatarul primeste invitatia ca o experienta care se deruleaza.

**Configurare de la zero, pas cu pas: vezi [SETUP.md](SETUP.md).**

## Stack

Next.js 16 (App Router, Server Actions) · TiDB Cloud (Drizzle, driver HTTP) · Resend · Vercel Blob · three.js / React Three Fiber · Vitest · Playwright

## Pagini

| Ruta | Ce este |
|---|---|
| `/login` | singura pagina publica; doi useri fixi |
| `/` | dashboard: urmatorul date cu countdown, invitatii care asteapta raspuns |
| `/invitatii/noua` | formular de invitatie (optional pornita dintr-o idee: `?idee=<id>`) |
| `/invitatii/[id]` | destinatarul vede experienta si raspunde; ceilalti vad rezumatul, actiunile creatorului si amintirile |
| `/calendar` | calendar lunar (`?luna=YYYY-MM`) |
| `/idei` | idei comune de dateuri |
| `/notificari` | notificarile din aplicatie |
| `/api/blob-upload` | incarcare poze (sesiune, acelasi origin, maxim 4 MB, doar JPEG / PNG / WebP) |
| `/api/photos/[id]` | serveste o poza doar dupa verificarea sesiunii |

## Comenzi

```bash
npm run dev            # aplicatia local, http://localhost:3000
npm run build          # build de productie
npm run start          # porneste build-ul de productie
npm run typecheck      # tsc --noEmit
npm test               # teste unitare + integrare (Vitest; integrarea foloseste baza dates_test)
npm run verify         # typecheck + teste + npm audit --audit-level=high
npm run test:e2e       # teste in browser (flux + securitate), ~2 min, port 3100, baza dates_test
npm run db:generate    # genereaza o migrare dupa ce modifici lib/db/schema.ts
npm run db:migrate     # aplica migrarile pe baza din DATABASE_URL
npm run hash-password  # hash pentru o parola noua (PowerShell / cmd; in Git Bash: winpty)
npm run gen-secret     # SESSION_SECRET nou
```

Testele E2E cer o data `npx playwright install chromium`. Detalii si variabilele de mediu: [SETUP.md](SETUP.md).

## Structura

- `app/`: pagini si Server Actions (subtiri: validare + apel de serviciu)
- `lib/`: logica. Serviciile primesc `db` si `now`, deci sunt testate pe o baza TiDB separata (`dates_test`)
- `lib/invitations/state-machine.ts`: singura sursa de adevar pentru ce se poate face cu o invitatie
- `lib/env.ts`: variabilele de mediu, validate la prima utilizare (nu la build: `npm run build` merge si fara ele; o variabila lipsa da `EnvError` la prima cerere care o foloseste, vizibil in Logs)
- `components/`: componente comune; `components/scene/` + `lib/scene/`: scena 3D (matematica in functii pure, testate)
- `proxy.ts`: CSP cu nonce si blocarea rutelor fara sesiune
- `drizzle/`: migrarile SQL; `test/`: helperi si fixtures pentru teste
- `e2e/`: testele Playwright (`flow.spec.ts`, `security.spec.ts`); `playwright.config.ts` le porneste pe un build de productie
- `scripts/`: `hash-password` si `gen-secret`
- `vercel.json`: regiunea functiilor (`fra1`); `.github/dependabot.yml`: update-uri de dependente

## Securitate

Doi useri fixi din env (parole bcrypt), sesiune JWT in cookie `httpOnly` / `SameSite=Lax` / `Secure` in productie, rate limit la login (5 incercari per 15 minute), CSP strict cu nonce, poze servite doar prin server dupa verificarea sesiunii (cu CSP propriu `default-src 'none'; sandbox`), upload cu verificare de origin, dimensiune si continut. Secretele traiesc doar in `.env.local` / `.env.test.local` (ignorate de git). Detalii si verificari inainte de deploy: [docs/security-checklist.md](docs/security-checklist.md).
