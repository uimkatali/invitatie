# Manager de dateuri - design

Data: 2026-09-28
Status: aprobat in brainstorming, asteapta review pe spec

## 1. Scop

Aplicatia veche (invitatie misterioasa unidirectionala + formular de selectii) se inlocuieste cu un **manager de dateuri pentru doi**: "el" si "ea" isi trimit invitatii unul altuia, raspund la ele, tin un jurnal de amintiri cu poze si o lista comuna de idei.

### In scope (v1)
1. Invitatii la date (creare, raspuns Da / Nu / Propun alta ora, anulare)
2. Dashboard: Urmatoare, In asteptare (Primite / Trimise), Istoric
3. Amintiri dupa date: nota + rating 1-5 + poze, cate una per user per date
4. Poze pe amintiri (Vercel Blob, servite privat)
5. Lista de idei, transformabila in invitatie
6. Notificari in aplicatie (badge) + email prin Resend doar catre "el"
7. Calendar lunar cu dateurile marcate
8. Fundal 3D ambient + experienta 3D scroll-driven la deschiderea invitatiei
9. Hardening OWASP Top 10 (2025) si teste de securitate
10. Ghid de configurare pas cu pas (`SETUP.md`)

### Out of scope
- Inregistrare, reset parola, 2FA, mai mult de 2 useri
- Contra-propunere la reschedule (creatorul doar accepta ora propusa sau anuleaza)
- Editarea unei invitatii dupa trimitere (se anuleaza si se creeaza alta)
- Email catre "ea" (Resend sandbox; se activeaza cand exista domeniu verificat, `EMAIL_EA` e deja pregatit)

## 2. Ce se sterge si ce se pastreaza

**Se sterg:** `content.json`, `lib/content.ts`, `lib/auth.ts` (vechi), `lib/edge-config.ts`, `lib/reveal.ts`, `lib/selections.ts` + testele lor, `components/LoginGate.tsx`, `components/SelectionsForm.tsx`, `components/OptionIcon.tsx`, `components/HomeClient.tsx`, `app/tema/`, `app/api/theme/`, `app/api/send-selections/`, `email/`, `scripts/build-email.*`, dependenta `@vercel/edge-config`, env vars `EDGE_CONFIG`, `EDGE_CONFIG_ID`, `VERCEL_API_TOKEN`.

**Se pastreaza / adapteaza:** `lib/countdown.ts` (+ test), `components/Countdown.tsx`, ideile din `components/ParticleScene.tsx` (extrude, iridescenta, bloom) - scena se rescrie, `lib/themes.ts` - se rescrie cu 3 teme, setup-ul Vitest.

Istoricul ramane in git.

## 3. Stack

| Strat | Alegere |
|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Mutatii | Server Actions (fara API routes, exceptie: upload token + servire poze) |
| DB | TiDB Cloud Starter (serverless), regiunea AWS eu-central-1 (Frankfurt) |
| ORM / driver | Drizzle ORM cu `drizzle-orm/tidb-serverless` + `@tidbcloud/serverless` (HTTP, fara pool); `drizzle-kit` + `mysql2` doar ca devDependencies pentru migrari |
| Validare | `zod` |
| Auth | `bcryptjs` + `jose` (JWT HS256 in cookie) |
| Email | Resend (sandbox) |
| Fisiere | Vercel Blob |
| 3D | `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` |
| Fonturi | `next/font`: Fraunces (titluri), Inter (text) |
| Teste | Vitest (unit + integrare), Playwright (E2E + securitate) |
| Hosting | Vercel, functii in regiunea `fra1` (`vercel.json`) |

## 4. Autentificare

- Doi useri fixi, identificati intern ca `'el' | 'ea'`. Nu exista tabela de useri.
- Credentiale in env: `USER_EL_NAME`, `USER_EL_PASSWORD_HASH`, `USER_EA_NAME`, `USER_EA_PASSWORD_HASH`. Hash-urile se genereaza cu `npm run hash-password` (bcrypt, cost 12).
- Login: Server Action compara username-ul (trim + case-insensitive) si parola (`bcrypt.compare`). Mesaj generic "Utilizator sau parola gresite" in orice caz de esec.
- Sesiune: JWT HS256 semnat cu `SESSION_SECRET` (min 32 bytes, validat la pornire), payload `{ sub: 'el'|'ea', iat, exp }`, 30 zile. Cookie `session`: `httpOnly`, `secure` (in productie), `SameSite=Lax`, `path=/`.
- `proxy.ts` (middleware Next 16) redirectioneaza spre `/login` orice ruta fara sesiune valida, exceptand `/login` si asset-urile statice. Verificarea se repeta in fiecare Server Action si API route (`requireSession()`), proxy-ul nu e singura bariera.
- Logout: Server Action care sterge cookie-ul.
- Rate limit: 5 incercari gresite / 15 minute per IP (vezi tabela `login_attempts`). Peste limita: acelasi mesaj generic + "incearca mai tarziu", fara a verifica parola.
- Schimbarea `SESSION_SECRET` invalideaza toate sesiunile.

## 5. Variabile de mediu

```
DATABASE_URL=            # connection string TiDB (mysql://...@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/dates?ssl={"rejectUnauthorized":true})
SESSION_SECRET=          # min 32 caractere random
USER_EL_NAME=
USER_EL_PASSWORD_HASH=
USER_EA_NAME=
USER_EA_PASSWORD_HASH=
EMAIL_EL=
EMAIL_EA=                # nefolosit in v1 (Resend sandbox)
RESEND_API_KEY=
BLOB_READ_WRITE_TOKEN=   # generat automat de Vercel la conectarea Blob store
TEST_DATABASE_URL=       # optional, doar pentru testele de integrare (baza dates_test)
```

`lib/env.ts` valideaza cu zod toate variabilele obligatorii la primul acces si arunca eroare clara daca lipsesc (fail closed). `.env.local.example` se actualizeaza.

## 6. Model de date

Conventii:
- ID-uri: UUID v4, `char(36) CHARACTER SET ascii`. Random, deci fara hotspot de scriere in TiDB si greu de ghicit din URL.
- Text: `utf8mb4` (emoji).
- Datetime: `datetime` stocat in UTC; afisat in `Europe/Bucharest`.
- `user` = `enum('el','ea')`.

### `invitations`
| camp | tip | note |
|---|---|---|
| id | char(36) PK | |
| from_user | enum('el','ea') | creator |
| to_user | enum('el','ea') | destinatar, mereu celalalt user |
| title | varchar(120) | obligatoriu |
| message | text | max 2000 caractere |
| location | varchar(200) | obligatoriu |
| starts_at | datetime | obligatoriu, in viitor la creare |
| dress_code | varchar(120) null | |
| theme | enum('toamna','iarna','amandoua') | |
| status | enum('pending','accepted','declined','reschedule','cancelled') | default `pending` |
| proposed_at | datetime null | setat la reschedule, in viitor |
| response_note | varchar(500) null | |
| idea_id | char(36) null FK -> ideas.id (ON DELETE SET NULL) | |
| created_at, updated_at | datetime | |

Indexuri: `idx_status_starts (status, starts_at)`, `idx_idea (idea_id)`.

### `memories`
| camp | tip |
|---|---|
| id | char(36) PK |
| invitation_id | char(36) FK -> invitations.id (ON DELETE CASCADE) |
| author | enum('el','ea') |
| note | text, max 5000 |
| rating | tinyint, 1-5 |
| created_at, updated_at | datetime |

Indexuri: `UNIQUE uq_invitation_author (invitation_id, author)`.

### `photos`
| camp | tip |
|---|---|
| id | char(36) PK |
| memory_id | char(36) FK -> memories.id (ON DELETE CASCADE) |
| blob_pathname | varchar(500) | cheia in Blob, niciodata expusa clientului |
| content_type | varchar(50) |
| width, height | int null |
| created_at | datetime |

Indexuri: `idx_memory (memory_id, created_at)`.

### `ideas`
| camp | tip |
|---|---|
| id | char(36) PK |
| author | enum('el','ea') |
| title | varchar(120) |
| description | text null, max 1000 |
| created_at | datetime |

Indexuri: `idx_created (created_at)`. "Folosita" se deriva: exista `invitations.idea_id = ideas.id` cu status diferit de `cancelled`.

### `notifications`
| camp | tip |
|---|---|
| id | char(36) PK |
| recipient | enum('el','ea') |
| type | enum('invite_new','invite_response','reschedule_accepted','invite_cancelled','memory_added','idea_added') |
| invitation_id | char(36) null FK -> invitations.id (ON DELETE CASCADE) |
| read_at | datetime null |
| created_at | datetime |

Indexuri: `idx_recipient_unread (recipient, read_at, created_at)`.

### `login_attempts`
| camp | tip |
|---|---|
| ip_hash | char(64) ascii PK | SHA-256(IP + SESSION_SECRET), IP-ul brut nu se stocheaza |
| window_start | datetime |
| count | int |

La esec: daca `window_start` e mai vechi de 15 min se reseteaza fereastra, altfel `count++`. La succes: randul se sterge.

### Stergere
FK-urile cu cascade nu sterg fisierele din Blob. `deletePhotosFor(memoryIds)` sterge intai blob-urile, apoi randurile. Singurele stergeri expuse in UI sunt: poza proprie, idee proprie nefolosita. Anularea unei invitatii nu sterge nimic.

## 7. Performanta

- Driver HTTP TiDB: fara handshake TCP/TLS per cold start, fara epuizare de conexiuni.
- TiDB si functiile Vercel in aceeasi regiune (Frankfurt / `fra1`).
- Cu 2 useri, orice invitatie ii implica pe amandoi, deci nu se filtreaza dupa user. Dashboard-ul face **un singur query** (invitatiile ne-anulate + cele anulate din ultimele 30 zile pentru istoric, ordonate dupa `starts_at`) si le grupeaza in memorie cu `groupInvitations(invitations, me, now)` (functie pura, testata).
- Query-ul de dashboard si cel de badge (`COUNT(*) WHERE recipient=? AND read_at IS NULL`, servit din index) ruleaza in paralel cu `Promise.all`.
- Poze: redimensionare in browser inainte de upload (latura maxima 2000px, webp, calitate 0.85), `width`/`height` stocate pentru zero layout shift.

## 8. Pagini si fluxuri

| Ruta | Continut | 3D |
|---|---|---|
| `/login` | user + parola | ambient "amandoua" |
| `/` | Dashboard: hero cu urmatorul date + countdown, apoi Urmatoare, In asteptare (Primite / Trimise), Istoric | ambient "amandoua" |
| `/calendar` | vedere lunara, zilele cu dateuri marcate (culoare dupa status), click -> invitatia; navigare luna anterioara / urmatoare prin `?luna=YYYY-MM` | ambient "amandoua" |
| `/invitatii/noua` | formular: titlu, mesaj, loc, data + ora, dress code, tema (cu preview live). `?idee=<id>` precompleteaza titlul si descrierea | ambient, tema aleasa |
| `/invitatii/[id]` | detaliu, dupa rol si status (mai jos) | scroll-driven sau ambient |
| `/idei` | lista, adaugare, stergere (proprie + nefolosita), "Fa din asta o invitatie" | ambient "amandoua" |
| `/notificari` | lista cronologica (ultimele 100), "Marcheaza tot citit" | ambient "amandoua" |
| `/api/blob-upload` | emite token de upload client -> Blob (`handleUpload`) si inregistreaza poza | - |
| `/api/photos/[id]` | serveste poza prin stream din Blob, dupa verificarea sesiunii | - |

Header global: logo, badge notificari necitite, linkuri Calendar / Idei / Invitatie noua, logout.

### `/invitatii/[id]`
- **Destinatar + `pending`**: experienta scroll-driven completa, terminata cu 3 butoane: "Da" / "Nu" / "Propun alta ora" (datetime picker + nota optionala).
- **Destinatar dupa raspuns**: rezumat cu statusul + buton "Revezi invitatia" (reporneste experienta, fara butoane de raspuns).
- **Creator**: rezumat cu statusul. `reschedule` -> "Accept ora propusa" / "Anulez". `pending` sau `accepted` in viitor -> "Anulez".
- **`accepted` + `starts_at` in trecut**: sectiunea Amintiri, doua coloane (el / ea). Fiecare isi editeaza doar coloana proprie (nota, rating, pana la 10 poze); o vede pe a celuilalt read-only.
- Deschiderea paginii marcheaza ca citite notificarile userului curent legate de invitatie.
- ID inexistent sau invalid -> 404.

### State machine
```
pending    --(destinatar)--> accepted | declined | reschedule
reschedule --(creator)-----> accepted (starts_at = proposed_at, proposed_at = null) | cancelled
pending | accepted cu starts_at in viitor --(creator)--> cancelled
```
Implementata ca functie pura `transition(invitation, actor, action, now)` care intoarce noua stare sau o eroare. Orice alta tranzitie e respinsa. Actorul vine din sesiune.

### Notificari
Fiecare mutatie relevanta insereaza, in aceeasi tranzactie, o notificare pentru celalalt user:
| actiune | tip |
|---|---|
| invitatie creata | `invite_new` |
| accept / decline / reschedule | `invite_response` |
| creatorul accepta ora propusa | `reschedule_accepted` |
| anulare | `invite_cancelled` |
| amintire salvata prima data | `memory_added` |
| idee adaugata | `idea_added` |

Email: dupa commit, daca destinatarul notificarii e `el` si tipul e `invite_new`, `invite_response`, `reschedule_accepted` sau `invite_cancelled`, se trimite email prin Resend catre `EMAIL_EL` (`from: onboarding@resend.dev`). Continutul: titlul invitatiei, actiunea, link catre invitatie; toate valorile escape-uite. Esecul emailului se logheaza si nu afecteaza actiunea.

## 9. 3D si vizual

### Paleta
- Roz: `#FFC8DD`, `#FFAFCC`; baby blue: `#BDE0FE`, `#A2D2FF`; crem: `#FFF8FB`
- Text: `#3A2540` (contrast WCAG AA pe fundalurile pastel)
- Carduri: glass (alb 45%, `backdrop-filter: blur(16px)`, bordura alba subtire)

### Teme (`lib/themes.ts`)
| id | nume | particule | cer (gradient) |
|---|---|---|---|
| `toamna` | Toamna roz | frunze roz / piersica | roz -> crem |
| `iarna` | Iarna baby blue | fulgi hexagonali | baby blue -> alb |
| `amandoua` | Amandoua | frunze + fulgi | roz -> baby blue |

### Scena (`components/scene/`)
- `InstancedMesh` per tip de particula (un draw call per tip). Frunza: `ExtrudeGeometry` cu bevel; fulg: 6 brate unite intr-o geometrie. Culoare per instanta aleasa din paleta temei.
- Material `meshPhysicalMaterial` cu iridescence + sheen. Bloom moale, fog pentru adancime.
- Miscare: frunzele cad leganat si se rotesc; fulgii plutesc lent si se rotesc. Vant din viteza mouse-ului, parallax al camerei pe mouse.
- Geometriile si miscarea sunt functii pure testabile (pozitii initiale, update per frame).

### Mod ambient
Particulele cad in spatele cardurilor. Folosit pe toate paginile, exceptand experienta scroll-driven.

### Mod scroll-driven (`/invitatii/[id]`)
drei `ScrollControls` (fara dependente noi), 6 ecrane, camera pe o curba prin campul de particule:
1. Reveal: particulele se aduna intr-o inima, apoi se imprastie si apare titlul
2. Mesajul, rand cu rand
3. Locul; particulele orbiteaza lent in jurul textului
4. Data, cu countdown mare
5. Dress code (ecranul se sare daca lipseste)
6. Raspunsul: particulele se aseaza, apar butoanele; la "Da" rafala de frunze, fulgi si inimi

### Performanta si accesibilitate
- `Canvas` incarcat cu `next/dynamic({ ssr: false })`; continutul HTML apare imediat.
- ~80 particule pe mobil (latime < 768px), ~220 pe desktop; `dpr` limitat la `[1, 1.5]`; `frameloop` oprit cand tab-ul e ascuns.
- `prefers-reduced-motion`: gradient static + cateva particule lente; experienta de invitatie devine pagina cu scroll normal, fara animatii de camera.
- Fara WebGL: fallback pe gradient CSS, aplicatia functioneaza complet.
- Asset-urile 3D (daca exista HDR) sunt servite local, nu de pe CDN.

## 10. Securitate (OWASP Top 10:2025)

| # | Risc | Masuri |
|---|---|---|
| A01 | Broken Access Control | `requireSession()` in fiecare Server Action si API route; rolul (creator / destinatar / autor) se ia doar din sesiune; amintiri, poze si idei editabile doar de autor; token de upload emis doar pentru amintirea proprie a unui date `accepted` trecut, cu limita de 10 poze; Server Actions au verificarea Origin vs Host din Next (CSRF); cookie `SameSite=Lax`. |
| A02 | Security Misconfiguration | Headere setate in `proxy.ts` / `next.config.js`: CSP cu nonce (`default-src 'self'`, `img-src 'self' blob: data:`, `connect-src 'self'` + endpoint-ul de upload Vercel Blob, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`), HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy` restrictiva; `poweredByHeader: false`. |
| A03 | Software Supply Chain | Lockfile comis; dependente minime; `npm audit --audit-level=high` in `npm run verify`; Dependabot activat pe GitHub. |
| A04 | Cryptographic Failures | bcrypt cost 12; `SESSION_SECRET` >= 32 bytes; JWT HS256 cu algoritm fixat la verificare; TLS verificat catre TiDB; HTTPS + HSTS. |
| A05 | Injection | Doar query-uri Drizzle parametrizate, niciun `sql` cu interpolare de input; validare zod pe fiecare input (lungimi, enum-uri, date); zero `dangerouslySetInnerHTML`; HTML escape in emailuri. |
| A06 | Insecure Design | State machine strict; limite de lungime; max 10 poze / amintire; max 50 idei. |
| A07 | Authentication Failures | Mesaj generic; rate limit 5 / 15 min per IP; cookie `httpOnly` + `secure`; logout real; auth ramane intentionat simplu (fara 2FA / reset). |
| A08 | Software or Data Integrity Failures | Token-ul Blob impune pe server `allowedContentTypes` (jpeg, png, webp) si `maximumSizeInBytes` (8 MB); pathname generat de server (`photos/<memoryId>/<uuid>`), nu de client. |
| A09 | Logging and Alerting Failures | Loguri structurate (JSON pe stdout, vizibile in Vercel) pentru login esuat, rate limit atins, acces interzis, email esuat, eroare neasteptata; fara parole, token-uri, hash-uri sau continutul mesajelor. |
| A10 | Mishandling of Exceptional Conditions | Fail closed: env lipsa -> eroare; sesiune invalida -> redirect login; clientul primeste doar mesaje generice, detaliile raman in log; 404 in loc de 403 pentru resurse inexistente sau interzise. |

Pozele sunt private: URL-ul Blob nu ajunge niciodata la client. `/api/photos/[id]` verifica sesiunea, citeste blob-ul pe server si il trimite cu `Cache-Control: private, max-age=3600` si `Content-Type` din DB.

## 11. Erori

- Server Actions intorc `{ ok: true, data? } | { ok: false, error: string, fields?: Record<string, string> }`; formularele afiseaza erorile pe camp, in romana.
- `app/error.tsx` si `app/not-found.tsx` stilizate in tema.
- Erorile neasteptate: log + mesaj generic "Ceva n-a mers, incearca din nou".

## 12. Testare

- **Unit (Vitest)**: `transition` (toate tranzitiile valide si invalide), schemele zod, hash + verificare parola, semnare + verificare sesiune (inclusiv token expirat / alterat / alt algoritm), `groupInvitations`, logica de rate limit, teme, countdown, escape email, functiile de miscare 3D, logica de calendar.
- **Integrare (Vitest + TiDB)**: Server Actions pe baza `dates_test` (`TEST_DATABASE_URL`), cu migrari aplicate si date curatate intre teste; se sar automat daca variabila lipseste.
- **E2E + securitate (Playwright)**, pe `next start` local:
  - flux complet: login el -> creeaza invitatie -> logout -> login ea -> raspunde Da -> amintire cu poza
  - rute si API-uri fara sesiune -> redirect / 401
  - IDOR: editarea amintirii celuilalt, raspuns la propria invitatie, stergerea ideii celuilalt, cererea unei poze cu sesiune lipsa -> respinse
  - headerele de securitate prezente pe raspunsuri
  - rate limit la login dupa 5 incercari
  - upload cu tip sau marime nepermisa -> respins
- `npm run verify` = `tsc --noEmit` + teste unit + `npm audit --audit-level=high`; `npm run test:e2e` separat.
- `docs/security-checklist.md`: verificare manuala inainte de deploy (env vars in Vercel, Dependabot activ, headere pe productie, poza inaccesibila din fereastra privata).

## 13. Ghid de configurare (`SETUP.md`)

Scris pentru cineva fara experienta, cu fiecare click si fiecare comanda:
1. Conturi: GitHub, Vercel, TiDB Cloud, Resend
2. TiDB Cloud: cluster Starter in AWS Frankfurt (eu-central-1), baza `dates` (si `dates_test` optional), copierea connection string-ului
3. Local: `.env.local` din `.env.local.example`, generarea `SESSION_SECRET` cu o comanda, `npm run hash-password` pentru fiecare user
4. `npm install`, `npm run db:migrate`, `npm run dev`, primul login
5. Vercel: import din GitHub, regiunea `fra1`, creare si conectare Blob store, copierea env vars
6. Deploy + checklist de verificare pe productie (login ca el, invitatie, login ca ea, raspuns, email primit, poza)
7. Troubleshooting: erori frecvente cu mesajul exact si solutia
8. README-ul se rescrie scurt, cu trimitere la `SETUP.md`

## 14. Structura de cod (orientativa)

```
app/
  (auth)/login/page.tsx
  (app)/layout.tsx            # header + fundal ambient
  (app)/page.tsx              # dashboard
  (app)/calendar/page.tsx
  (app)/invitatii/noua/page.tsx
  (app)/invitatii/[id]/page.tsx
  (app)/idei/page.tsx
  (app)/notificari/page.tsx
  api/blob-upload/route.ts
  api/photos/[id]/route.ts
  error.tsx, not-found.tsx, layout.tsx, globals.css
proxy.ts
lib/
  env.ts
  auth/{password.ts,session.ts,rate-limit.ts,require-session.ts}
  db/{client.ts,schema.ts}
  invitations/{state-machine.ts,group.ts,actions.ts,queries.ts}
  memories/{actions.ts,queries.ts}
  photos/{storage.ts,resize.ts}
  ideas/{actions.ts,queries.ts}
  notifications/{create.ts,email.ts,queries.ts}
  calendar.ts, countdown.ts, themes.ts, validation.ts, log.ts
components/
  scene/{AmbientScene.tsx,InvitationExperience.tsx,particles.ts,geometry.ts}
  ui/...
drizzle/                       # migrari generate
scripts/hash-password.mjs
e2e/
SETUP.md
docs/security-checklist.md
```
