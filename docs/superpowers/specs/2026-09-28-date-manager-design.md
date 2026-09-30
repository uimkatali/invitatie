# Manager de dateuri - design

Data: 2026-09-28
Status: aprobat si implementat (documentul descrie codul final; abaterile de la planul initial sunt in `docs/superpowers/plans/2026-09-28-date-manager-00-overview.md`)

## 1. Scop

Aplicatia veche (invitatie misterioasa unidirectionala + formular de selectii) se inlocuieste cu un **manager de dateuri pentru doi**: "el" si "ea" isi trimit invitatii unul altuia, raspund la ele, tin un jurnal de amintiri cu poze si o lista comuna de idei.

### In scope (v1)
1. Invitatii la date (creare, raspuns Da / Nu / Propun alta ora, anulare)
2. Dashboard: Urmatoare, In asteptare (Asteapta raspunsul tau / Asteapta raspuns de la celalalt), Istoric
3. Amintiri dupa date: nota + rating 1-5 + poze, cate una per user per date
4. Poze pe amintiri (Vercel Blob, servite doar prin server dupa verificarea sesiunii)
5. Lista de idei, transformabila in invitatie
6. Notificari in aplicatie (badge) + email catre ambii parteneri prin Gmail SMTP
7. Calendar lunar cu dateurile marcate
8. Fundal 3D ambient + experienta 3D scroll-driven la deschiderea invitatiei
9. Hardening OWASP Top 10 (2025) si teste de securitate
10. Ghid de configurare pas cu pas (`SETUP.md`)

### Out of scope
- Inregistrare, reset parola, 2FA, mai mult de 2 useri
- Contra-propunere la reschedule (creatorul doar accepta ora propusa sau anuleaza)
- Editarea unei invitatii dupa trimitere (se anuleaza si se creeaza alta)

## 2. Ce se sterge si ce se pastreaza

**Se sterg:** `content.json`, `lib/content.ts`, `lib/auth.ts` (vechi), `lib/edge-config.ts`, `lib/reveal.ts`, `lib/selections.ts` + testele lor, `components/LoginGate.tsx`, `components/SelectionsForm.tsx`, `components/OptionIcon.tsx`, `components/HomeClient.tsx`, `app/tema/`, `app/api/theme/`, `app/api/send-selections/`, `email/`, `scripts/build-email.*`, dependenta `@vercel/edge-config`, env vars `EDGE_CONFIG`, `EDGE_CONFIG_ID`, `VERCEL_API_TOKEN`.

**Se pastreaza / adapteaza:** `lib/countdown.ts` (+ test), `components/Countdown.tsx`, ideile din `components/ParticleScene.tsx` (extrude, iridescenta, bloom) - scena se rescrie, `lib/themes.ts` - se inlocuieste cu `lib/scene/themes.ts` (3 teme), setup-ul Vitest.

Istoricul ramane in git.

## 3. Stack

| Strat | Alegere |
|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Mutatii | Server Actions (fara API routes, exceptie: upload poze si servire poze) |
| DB | TiDB Cloud Starter (serverless), regiunea AWS eu-central-1 (Frankfurt) |
| ORM / driver | Drizzle ORM cu `drizzle-orm/tidb-serverless` + `@tidbcloud/serverless` (HTTP, fara pool); `drizzle-kit` + `mysql2` doar ca devDependencies pentru migrari |
| Validare | `zod` |
| Auth | `bcryptjs` + `jose` (JWT HS256 in cookie) |
| Email | Gmail SMTP (`nodemailer`, `smtp.gmail.com:465`, parola de aplicatie Google) |
| Fisiere | Vercel Blob, store privat (`put` / `get` / `del` cu `access: 'private'`) |
| 3D | `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` |
| Fonturi | `next/font`: Fraunces (titluri), Inter (text) |
| Teste | Vitest (unit + integrare), Playwright (E2E + securitate) |
| Hosting | Vercel, functii in regiunea `fra1` (`vercel.json`) |

## 4. Autentificare

- Doi useri fixi, identificati intern ca `'el' | 'ea'`. Nu exista tabela de useri.
- Credentiale in env: `USER_EL_NAME`, `USER_EL_PASSWORD_HASH`, `USER_EA_NAME`, `USER_EA_PASSWORD_HASH`. Hash-urile se genereaza cu `npm run hash-password` (bcrypt, cost 12; parola minim 12 caractere, maxim 72 bytes, citita cu input ascuns) si se pun in env **codate base64** (Next expandeaza `$VAR` in fisierele `.env`, deci un hash `$2b$12$...` brut ar fi corupt). La citirea env-ului se accepta doar hash-uri bcrypt cu cost >= 12.
- Login: Server Action compara username-ul (trim, case-insensitive, normalizat NFC) si parola (`bcrypt.compare`, cu un hash dummy precalculat cand userul nu exista, ca timpul sa nu dea userul de gol). Mesaj generic "Utilizator sau parola gresite" in orice caz de esec.
- Sesiune: JWT HS256 semnat cu `SESSION_SECRET` (min 32 bytes, validat la pornire), payload `{ sub: 'el'|'ea', aud: 'session', iat, exp }` (audience verificata, claim-uri obligatorii), 30 zile. Cookie `session`: `httpOnly`, `secure` (in productie), `SameSite=Lax`, `path=/`.
- `proxy.ts` (middleware Next 16) redirectioneaza spre `/login` orice ruta fara sesiune valida, exceptand `/login` si asset-urile statice. Verificarea se repeta in fiecare Server Action si API route (`requireSession()`), proxy-ul nu e singura bariera.
- Logout: Server Action care sterge cookie-ul.
- Rate limit: 5 incercari gresite / 15 minute per IP (IPv6 grupat pe /64; vezi tabela `login_attempts`). Incercarea se rezerva atomic INAINTE de bcrypt. Peste limita: mesaj generic + "incearca din nou peste 15 minute", fara a verifica parola.
- Schimbarea `SESSION_SECRET` invalideaza toate sesiunile.

## 5. Variabile de mediu

```
DATABASE_URL=            # connection string TiDB (mysql://...@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/dates?ssl={"rejectUnauthorized":true})
SESSION_SECRET=          # min 32 caractere random
USER_EL_NAME=
USER_EL_PASSWORD_HASH=
USER_EA_NAME=
USER_EA_PASSWORD_HASH=
GMAIL_USER=              # optional: contul Gmail care trimite notificarile
GMAIL_APP_PASSWORD=      # optional: parola de aplicatie Google (16 caractere, spatiile se ignora)
EMAIL_EL=                # optional: adresa lui
EMAIL_EA=                # optional: adresa ei
BLOB_READ_WRITE_TOKEN=   # tokenul store-ului Blob PRIVAT (Vercel il adauga la conectarea store-ului; local se copiaza in .env.local)
TEST_DATABASE_URL=       # optional, doar pentru testele de integrare si E2E (baza dates_test), in .env.test.local
APP_URL=                 # optional, baza linkurilor din emailuri; altfel VERCEL_PROJECT_PRODUCTION_URL, altfel http://localhost:3000
```

`lib/env.ts` valideaza cu zod toate variabilele obligatorii **la prima utilizare** (nu la build) si arunca `EnvError` (mesaj cu numele variabilelor, niciodata valorile) daca lipsesc sau sunt invalide (fail closed). `.env.local.example` e un sablon gol, urmarit de git; valorile reale stau doar in `.env.local` / `.env.test.local`.

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
| blob_url | varchar(500) | URL-ul intors de Blob la incarcare; doar informativ (pentru un blob privat nu se poate citi anonim), niciodata trimis clientului |
| blob_pathname | varchar(500) | cheia in Blob (`photos/<memoryId>/<uuid>.<ext>`, plus sufix aleator adaugat de Blob); cu ea se citeste (`get`) si se sterge (`del`) blob-ul |
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
| invitation_status | enum(statusurile invitatiei) null | statusul invitatiei in momentul notificarii (nu cel curent) |
| invitation_id | char(36) null FK -> invitations.id (ON DELETE CASCADE) |
| read_at | datetime null |
| created_at | datetime |

Indexuri: `idx_recipient_unread (recipient, read_at, created_at)`.

### `login_attempts`
| camp | tip |
|---|---|
| ip_hash | char(64) ascii PK | HMAC-SHA256 cu `SESSION_SECRET` peste `login-ip:` + IP (IPv6 grupat pe /64); IP-ul brut nu se stocheaza |
| window_start | datetime |
| count | int |

Rezervarea unei incercari e un singur `INSERT ... ON DUPLICATE KEY UPDATE` atomic, facut inainte de verificarea parolei: daca `window_start` e mai vechi de 15 min fereastra se reseteaza, altfel `count++` (`count` se atribuie inaintea lui `window_start`). La succes: randul se sterge.

### Stergere
FK-urile cu cascade nu sterg fisierele din Blob, dar singurele stergeri expuse in UI sunt poza proprie (`deletePhoto`: sterge intai blob-ul, apoi randul; un esec la blob lasa randul) si ideea proprie nefolosita. Nu se sterg amintiri sau invitatii, deci nu exista blob-uri orfane prin cascade. Anularea unei invitatii nu sterge nimic.

## 7. Performanta

- Driver HTTP TiDB: fara handshake TCP/TLS per cold start, fara epuizare de conexiuni.
- TiDB si functiile Vercel in aceeasi regiune (Frankfurt / `fra1`).
- Cu 2 useri, orice invitatie ii implica pe amandoi, deci nu se filtreaza dupa user. Dashboard-ul face **un singur query** (invitatiile ne-anulate + cele anulate din ultimele 30 zile pentru istoric, ordonate dupa `starts_at`) si le grupeaza in memorie cu `groupInvitations(invitations, me, now)` (functie pura, testata).
- Query-ul de dashboard si cel de badge (`COUNT(*) WHERE recipient=? AND read_at IS NULL`, servit din index) ruleaza in paralel: layout-ul si pagina sunt segmente separate pe care Next le randeaza in paralel. Pe pagina invitatiei, marcarea notificarilor si citirea amintirilor merg in `Promise.all`.
- Poze: redimensionare in browser inainte de upload (latura maxima 2000px, webp, calitate 0.85), `width`/`height` stocate pentru zero layout shift.

## 8. Pagini si fluxuri

| Ruta | Continut | 3D |
|---|---|---|
| `/login` | user + parola | ambient "amandoua" |
| `/` | Dashboard: hero cu urmatorul date + countdown, apoi Urmatoare, In asteptare (Asteapta raspunsul tau / Asteapta raspuns de la celalalt), Istoric | ambient "amandoua" |
| `/calendar` | vedere lunara, zilele cu dateuri marcate (culoare dupa status), click -> invitatia; navigare luna anterioara / urmatoare prin `?luna=YYYY-MM` | ambient "amandoua" |
| `/invitatii/noua` | formular: titlu, mesaj, loc, data + ora, dress code, tema (cu preview live). `?idee=<id>` precompleteaza titlul si descrierea | ambient, tema aleasa |
| `/invitatii/[id]` | detaliu, dupa rol si status (mai jos) | scroll-driven sau ambient |
| `/idei` | lista, adaugare, stergere (proprie + nefolosita), "Fa din asta o invitatie" | ambient "amandoua" |
| `/notificari` | lista cronologica (ultimele 100), "Marcheaza tot citit" | ambient "amandoua" |
| `/api/blob-upload` | `POST` multipart: sesiune, acelasi origin, `Content-Length` obligatoriu (411), maxim 4 MB (413), tipul real verificat dupa magic bytes; incarca in Blob (privat) pe server si inregistreaza poza | - |
| `/api/photos/[id]` | serveste poza prin stream din Blob privat (`get` autentificat), dupa verificarea sesiunii, cu CSP strict propriu | - |

Header global: logo, badge notificari necitite, linkuri Calendar / Idei / Invitatie noua, logout.

### `/invitatii/[id]`
- **Destinatar + `pending`**: experienta scroll-driven completa, terminata cu formularul de raspuns: "Da" / "Nu" / "Propun alta ora" (datetime picker + nota optionala).
- **Destinatar dupa raspuns**: rezumat cu statusul + buton "Revezi invitatia" (reporneste experienta, fara butoane de raspuns).
- **Creator**: rezumat cu statusul. `reschedule` -> "Accept ora propusa" / "Anulez". `pending` sau `accepted` in viitor -> "Anulez".
- **`accepted` + `starts_at` in trecut**: sectiunea Amintiri, doua coloane (el / ea). Fiecare isi editeaza doar coloana proprie (nota, rating, pana la 10 poze); o vede pe a celuilalt read-only.
- Deschiderea paginii marcheaza ca citite notificarile userului curent legate de invitatie; deschiderea `/idei` marcheaza `idea_added`. Layout-ul nu se re-randeaza la navigarea client, deci pagina cere un refresh (`RefreshOnMount`) cand a marcat ceva, ca badge-ul sa se actualizeze.
- Dupa raspuns / accept / anulare, actiunea redirectioneaza la `/invitatii/<id>?mesaj=raspuns|ora-acceptata|anulata` si pagina arata un mesaj (`role=status`) dintr-o lista fixa (parametrul nu se reflecta niciodata direct).
- ID inexistent sau invalid -> 404.

### State machine
```
pending    --(destinatar)--> accepted | declined | reschedule
reschedule --(creator)-----> accepted (starts_at = proposed_at, proposed_at = null) | cancelled
pending (starts_at viitor) | reschedule (ora propusa viitoare) | accepted (starts_at viitor) --(creator)--> cancelled
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

Email: dupa commit, pentru tipurile `invite_new`, `invite_response`, `reschedule_accepted` sau `invite_cancelled`, destinatarul notificarii (oricare dintre cei doi) primeste un email la adresa lui (`EMAIL_EL` / `EMAIL_EA`), trimis prin Gmail SMTP (`nodemailer`, port 465, `from: "Dateurile noastre" <GMAIL_USER>`). Fara `GMAIL_USER` + `GMAIL_APP_PASSWORD` emailurile sunt dezactivate (se logheaza o data `email_disabled`), iar un utilizator fara adresa nu primeste email. Continutul: titlul invitatiei, actiunea, link catre invitatie; toate valorile escape-uite, subiectul pe un singur rand. Esecul emailului se logheaza (doar tipul si un cod scurt precum `EAUTH`, fara adrese, parola sau continut) si nu afecteaza actiunea.

## 9. 3D si vizual

### Paleta
- Roz: `#FFC8DD`, `#FFAFCC`; baby blue: `#BDE0FE`, `#A2D2FF`; crem: `#FFF8FB`
- Text: `#3A2540` (contrast WCAG AA pe fundalurile pastel)
- Carduri: glass (alb 45%, `backdrop-filter: blur(16px)`, bordura alba subtire)

### Teme (`lib/scene/themes.ts`)
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
Scroll nativ al paginii cu canvas `fixed` in spate (nu drei `ScrollControls`: acesta randeaza HTML-ul intr-un root separat, fragil pentru formulare cu Server Actions, si e mai putin accesibil; fara dependente noi). Sectiunile (`data-section`) primesc clasa `is-visible` de la un `IntersectionObserver`, iar camera si particulele reactioneaza la sectiunea curenta printr-un store mic (`lib/scene/store.ts`):
1. Reveal: particulele se aduna intr-o inima, apoi se imprastie si apare titlul (titlul apare imediat fara WebGL sau cu reduced motion, altfel dupa primul cadru al canvas-ului, cu un fallback de timp)
2. Mesajul, rand cu rand
3. Locul; particulele orbiteaza lent in jurul textului
4. Data, cu countdown mare
5. Dress code (sectiunea lipseste daca nu e completat)
6. Raspunsul: particulele se aseaza, apare formularul; la "Da" rafala de frunze, fulgi si inimi, ancorata la camera

### Performanta si accesibilitate
- `Canvas` incarcat cu `next/dynamic({ ssr: false })`; continutul HTML apare imediat.
- ~80 particule pe mobil (latime < 768px), ~220 pe desktop; `dpr` limitat la `[1, 1.5]`; `frameloop` oprit cand tab-ul e ascuns.
- `prefers-reduced-motion`: gradient static + cateva particule lente; experienta de invitatie devine pagina cu scroll normal, fara animatii de camera.
- Fara WebGL: fallback pe gradient CSS, aplicatia functioneaza complet.
- Asset-urile 3D (daca exista HDR) sunt servite local, nu de pe CDN.

## 10. Securitate (OWASP Top 10:2025)

| # | Risc | Masuri |
|---|---|---|
| A01 | Broken Access Control | `requireSession()` in fiecare Server Action si API route; rolul (creator / destinatar / autor) se ia doar din sesiune; amintiri, poze si idei editabile doar de autor; upload de poze doar in amintirea proprie a unui date `accepted` trecut, cu limita de 10 poze; `proxy.ts` lasa sa treaca fara sesiune doar POST-urile de Server Actions (header `next-action`), care isi verifica singure sesiunea; Server Actions au verificarea Origin vs Host din Next (CSRF); cookie `SameSite=Lax`. |
| A02 | Security Misconfiguration | Headere setate in `proxy.ts` / `next.config.js`: CSP cu nonce (`default-src 'self'`, `img-src 'self' blob: data:`, `connect-src 'self'` (uploadul trece prin serverul propriu, deci nu se deschide nicio origine Blob), `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`), `/api/photos/*` primeste `default-src 'none'; sandbox`, HSTS (productie), `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy` restrictiva; `poweredByHeader: false`. |
| A03 | Software Supply Chain | Lockfile comis; dependente minime; `npm audit --audit-level=high` in `npm run verify`; Dependabot activat pe GitHub. |
| A04 | Cryptographic Failures | bcrypt cost 12; `SESSION_SECRET` >= 32 bytes; JWT HS256 cu algoritm fixat la verificare; TLS verificat catre TiDB; HTTPS + HSTS. |
| A05 | Injection | Doar query-uri Drizzle parametrizate, niciun `sql` cu interpolare de input; validare zod pe fiecare input (lungimi, enum-uri, date); zero `dangerouslySetInnerHTML`; HTML escape in emailuri. |
| A06 | Insecure Design | State machine strict; limite de lungime; max 10 poze / amintire; max 50 idei. |
| A07 | Authentication Failures | Mesaj generic; rate limit 5 / 15 min per IP; cookie `httpOnly` + `secure`; logout real; auth ramane intentionat simplu (fara 2FA / reset). |
| A08 | Software or Data Integrity Failures | Upload pe server (`POST /api/blob-upload`): sesiune, verificare Origin (route handler-ele nu o au incorporata), `Content-Length` obligatoriu, maxim 4 MB, tip determinat din magic bytes (jpeg, png, webp; `Content-Type`-ul clientului e ignorat), autor si numar de poze verificate; pathname generat de server (`photos/<memoryId>/<uuid>.<ext>`) si sufix aleator adaugat de Blob. Redimensionarea in browser (canvas) sterge metadatele EXIF. |
| A09 | Logging and Alerting Failures | Loguri structurate (JSON pe stdout, vizibile in Vercel) pentru login esuat, rate limit atins, acces interzis, email esuat, eroare neasteptata. Erorile se logheaza prin `errorInfo`: numele erorii, `detail` doar pentru `EnvError` (nume de variabile), `dbCode` / `dbKind` pentru erori de baza de date; niciodata mesajele drizzle (cu parametri), parole, token-uri, hash-uri, URL-uri Blob sau continutul mesajelor. |
| A10 | Mishandling of Exceptional Conditions | Fail closed: env lipsa -> eroare; sesiune invalida -> redirect login; clientul primeste doar mesaje generice, detaliile raman in log; 404 in loc de 403 pentru resurse inexistente sau interzise. |

Pozele stau intr-un store Vercel Blob **privat** (acces ales la crearea store-ului, imposibil de schimbat dupa) si sunt servite doar prin server: nici URL-ul, nici pathname-ul Blob nu ajung la client. `/api/photos/[id]` verifica sesiunea, citeste blob-ul pe server cu `get(pathname, { access: 'private', token })` din SDK (stream, cu timeout; nu se face `fetch` pe URL-uri din baza de date, deci nu exista SSRF) si il trimite cu `Cache-Control: private, max-age=300`, `Content-Type` din DB, `nosniff` si `Content-Security-Policy: default-src 'none'; sandbox`.

Un URL de blob privat (`https://<store>.private.blob.vercel-storage.com/...`) nu se poate citi fara token; tokenul `BLOB_READ_WRITE_TOKEN` ramane doar pe server si nu se logheaza. `npm run check:blob` verifica un store real: incarcare privata, cerere anonima refuzata, citire autentificata, stergere (vezi abaterea 9 din planul overview).

## 11. Erori

- Server Actions intorc `ActionState`: `null | { ok: true, message? } | { ok: false, error, fields?, values? }`; `values` reda in formular ce a scris utilizatorul dupa o eroare, iar formularele afiseaza erorile pe camp, in romana.
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
1. Conturi: GitHub, Vercel, TiDB Cloud, un cont Google pentru Gmail SMTP
2. TiDB Cloud: cluster Starter in AWS Frankfurt (eu-central-1), baza `dates` (si `dates_test` optional), copierea connection string-ului
3. Local: `.env.local` din `.env.local.example`, generarea `SESSION_SECRET` cu o comanda, `npm run hash-password` pentru fiecare user
4. `npm install`, `npm run db:migrate`, `npm run dev`, primul login
5. Vercel: import din GitHub, regiunea `fra1`, creare si conectare Blob store PRIVAT, copierea env vars, `npm run check:blob`
6. Deploy + checklist de verificare pe productie (login ca el, invitatie, login ca ea, raspuns, email primit, poza)
7. Troubleshooting: erori frecvente cu mesajul exact si solutia
8. README-ul se rescrie scurt, cu trimitere la `SETUP.md`

## 14. Structura de cod (starea finala)

```
app/
  (auth)/login/{page.tsx,LoginForm.tsx}, (auth)/actions.ts
  (app)/layout.tsx            # header + fundal ambient
  (app)/page.tsx              # dashboard
  (app)/calendar/page.tsx
  (app)/invitatii/noua/{page.tsx,InvitationForm.tsx,actions.ts}
  (app)/invitatii/[id]/{page.tsx,page-view.ts,actions.ts,memory-actions.ts,ResponsePanel.tsx,MemoriesSection.tsx,MemoryEditor.tsx,PhotoGrid.tsx,PhotoUploader.tsx,flash.ts,...}
  (app)/idei/{page.tsx,IdeaForm.tsx,actions.ts}
  (app)/notificari/{page.tsx,actions.ts}
  api/blob-upload/route.ts
  api/photos/[id]/route.ts
  error.tsx, not-found.tsx, layout.tsx, globals.css
proxy.ts
lib/
  env.ts, domain.ts, validation.ts, result.ts, form.ts, log.ts, time.ts, countdown.ts, calendar.ts, app-url.ts, ids.ts, escape.ts
  auth/{credentials.ts,password.ts,session.ts,rate-limit.ts,client-ip.ts,require-session.ts,display-names.ts}
  db/{client.ts,schema.ts,errors.ts}
  invitations/{state-machine.ts,group.ts,service.ts,queries.ts}
  memories/{service.ts,queries.ts}
  photos/{service.ts,blob-store.ts,validate.ts,resize.ts}
  ideas/{service.ts,queries.ts}
  notifications/{create.ts,describe.ts,email.ts,queries.ts}
  security/{csp.ts,origin.ts}
  scene/{themes.ts,particles.ts,camera.ts,reveal.ts,store.ts,random.ts}
components/
  scene/{SceneRoot.tsx,SceneCanvas.tsx,SceneController.tsx,InvitationExperience.tsx,ParticleField.tsx,HeartBurst.tsx,CameraRig.tsx,GradientBackground.tsx,geometry.ts,input.ts,useSceneState.ts}
  ui/{Field.tsx,SubmitButton.tsx,ActionButtonForm.tsx}, AppHeader.tsx, Countdown.tsx, InvitationCard.tsx, StatusPill.tsx, RefreshOnMount.tsx
drizzle/                       # migrari generate
scripts/{hash-password.mjs,gen-secret.mjs}
test/                          # helperi si fixtures pentru teste de integrare
e2e/                           # Playwright: flow.spec.ts, security.spec.ts
playwright.config.ts, vercel.json, .github/dependabot.yml
SETUP.md
docs/security-checklist.md
```

Actiunile sunt `actions.ts` langa pagina careia ii apartin (subtiri: validare zod + apel de serviciu), iar logica sta in `lib/*/service.ts`, care primeste `db` si `now`.
