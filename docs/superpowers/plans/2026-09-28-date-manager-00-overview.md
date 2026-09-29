# Manager de dateuri - overview plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inlocuirea aplicatiei vechi cu un manager de dateuri pentru doi (invitatii, raspunsuri, amintiri cu poze, idei, calendar, notificari) cu fundal 3D si hardening OWASP.

**Spec:** `docs/superpowers/specs/2026-09-28-date-manager-design.md`

**Architecture:** Next.js 16 App Router cu Server Actions subtiri care apeleaza servicii pure-ish (`lib/*/service.ts`) primind `db` ca parametru, ca sa fie testabile pe o baza TiDB de test. Auth cu 2 useri fixi din env si JWT in cookie; `proxy.ts` pune CSP cu nonce si redirectioneaza fara sesiune. Un singur canvas 3D persistent in layout, controlat printr-un store mic (tema + mod ambient / experienta).

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM + `@tidbcloud/serverless`, zod 4, bcryptjs, jose, Resend, Vercel Blob, three + R3F + drei + postprocessing, Vitest, Playwright.

## Faze (fiecare plan livreaza software functional)

| # | Plan | Rezultat la final |
|---|---|---|
| 1 | `2026-09-28-date-manager-01-foundation.md` | App veche stearsa, schema DB + migrari, login / logout cu rate limit, CSP + headere, layout de baza |
| 2 | `2026-09-28-date-manager-02-invitations.md` | Invitatii complete: creare, raspuns, reschedule, anulare, dashboard, notificari in app + email |
| 3 | `2026-09-28-date-manager-03-memories-ideas-calendar.md` | Amintiri cu poze private, lista de idei, calendar lunar |
| 4 | `2026-09-28-date-manager-04-3d-scene.md` | Fundal 3D ambient + experienta scroll-driven, reduced motion, fallback fara WebGL |
| 5 | `2026-09-28-date-manager-05-e2e-setup.md` | Teste Playwright (flux + OWASP), `SETUP.md`, checklist securitate, README, `vercel.json`, Dependabot |

Fazele se executa in ordine. Toate pe branch-ul `date-manager`.

## Abateri constiente de la spec (decise la scrierea planului)

1. **Upload poze prin server, nu client upload direct in Blob.** Browserul redimensioneaza poza (~300 KB webp), apoi o trimite la `POST /api/blob-upload`, care valideaza (sesiune, Origin, autor, magic bytes, marime, numar) si apeleaza `put()` cu pathname generat de server. Motiv: la client upload pathname-ul il alege clientul si callback-ul `onUploadCompleted` nu functioneaza pe localhost. Consecinta: limita pe server e **4 MB** (limita de body a functiilor Vercel e 4.5 MB), nu 8 MB; dupa redimensionare pozele au sub 1 MB. Bonus: redimensionarea prin canvas sterge metadatele EXIF (inclusiv GPS).
2. **Tabela `photos` are si `blob_url`** (folosit doar pe server, pentru stream si stergere; nu ajunge niciodata la client).
3. **`<img>` simplu in loc de `next/image` pentru poze**: optimizatorul Next cere imaginea fara cookie-uri, deci ar primi 401 de la `/api/photos/[id]`. Pastram `width` / `height` pentru zero layout shift.
4. **Experienta scroll-driven cu scroll nativ al paginii + canvas fix**, nu drei `ScrollControls`. Motiv: `ScrollControls` randeaza HTML-ul intr-un root separat (formularele cu Server Actions si contextul React devin fragile), iar scroll-ul nativ e mai accesibil si face `prefers-reduced-motion` trivial. Tot fara dependente noi.
5. **Hash-urile bcrypt se tin in env codate base64** (`npm run hash-password` le afiseaza direct asa). Motiv: Next expandeaza `$VAR` in fisierele `.env`, iar un hash bcrypt (`$2b$12$...`) ar fi corupt.
6. **Variabilele pentru teste de integrare stau in `.env.test.local`** (Vitest ruleaza cu `NODE_ENV=test`, iar Next incarca atunci `.env.test.local`, nu `.env.local`).
7. **Linkul din email** foloseste `APP_URL` daca e setat, altfel `VERCEL_PROJECT_PRODUCTION_URL` (setat automat de Vercel), altfel `http://localhost:3000`. Nicio variabila obligatorie noua.
8. **Hardening auth dupa review-ul de securitate (Faza 1, Task 3, 6, 7, 8):** rate limit atomic (`reserveAttempt` inainte de bcrypt, SQL brut ca `count` sa fie setat inaintea `window_start`), HMAC pentru IP, parola minim 12 caractere / maxim 72 bytes cu input ascuns, hash dummy precalculat, username-uri normalizate NFC, JWT cu `audience` si `requiredClaims`, hash-uri bcrypt acceptate doar cu cost >= 12. **Pentru aceste fisiere codul din repo e sursa de adevar**, nu blocurile de cod din plan (Task 8 si Task 12 au fost actualizate; Task 3, 6, 7 nu).
9. **RISC ACCEPTAT: pozele sunt in Blob cu `access: 'public'`.** URL-ul contine un sufix aleator (`addRandomSuffix: true`), nu ajunge niciodata la browser (clientul primeste doar `/api/photos/[id]`) si e citit doar de server, care il transmite mai departe (stream) dupa verificarea sesiunii. Riscul ramas: oricine obtine URL-ul brut (din baza de date, din loguri, dintr-un backup) poate citi poza respectiva fara autentificare. Mitigari: URL-urile Blob se trateaza ca secrete (nu se logheaza, nu se afiseaza), iar `isTrustedBlobUrl` accepta doar hostul Vercel Blob. Alternativa: `@vercel/blob` 2.8.0 are `put(..., { access: 'private' })` si `get(pathname, { access: 'private' })` (stream autentificat cu tokenul), deci un mod privat exista; nu am trecut la el la aceasta versiune (necesita un store creat ca privat si rescrierea `blob-store.ts` / a rutei foto), dar e pasul urmator daca vrem sa inchidem riscul.
