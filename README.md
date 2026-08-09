# Invitatie la date

Website + email pentru invitatia misterioasa. Continutul (mesajele, data/ora, tema 3D, pozele/video, trimiterea emailului) se administreaza acum live, dintr-un panou de admin la `/admin` — nu se mai editeaza `content.json` de mana pentru uz curent.

## Arhitectura

- **Next.js** (App Router) — site-ul public (`app/page.tsx`) e un Server Component care citeste setarile din baza de date la fiecare request (`export const dynamic = 'force-dynamic'`), asa ca nu exista continut static "inghetat" la build.
- **Vercel Postgres** — stocheaza randul de setari (texte, data evenimentului, tema activa, override-uri de culoare) si metadatele media (`admin_user`, `settings`, `media`, vezi `db/schema.sql`).
- **Vercel Blob** — stocheaza fisierele efective (poze/video) incarcate din tab-ul Media.
- **Resend** — trimite emailul de invitatie direct din panou (tab-ul Email).
- **Autentificare admin** — cookie de sesiune JWT (semnat cu `jose`), verificat in `middleware.ts` pentru tot ce e sub `/admin` si `/api/admin`. Un singur cont de admin, creat de scriptul de seed.

`content.json` ramane in repo doar ca **date initiale (seed)** — e citit o singura data de `npm run db:seed` ca sa populeze primul rand din `settings`. Dupa aceea, toate modificarile se fac din `/admin`, nu prin editarea fisierului.

## Development

```bash
npm install
npm run dev    # website la http://localhost:3000, admin la http://localhost:3000/admin
npm test       # ruleaza testele
npm run build  # build de productie
```

## Setup initial (o singura data)

### 1. Provizioneaza serviciile

1. **Vercel Postgres** — din dashboard-ul proiectului pe [vercel.com](https://vercel.com), creeaza o baza de date Postgres si conecteaz-o la proiect.
2. **Vercel Blob** — tot din dashboard, creeaza un Blob store si conecteaza-l la proiect.
3. **Resend** — creeaza un cont gratuit pe [resend.com](https://resend.com) si genereaza un API key.

Daca proiectul e deja linkuit la Vercel (`vercel link`), poti trage automat variabilele de mediu generate de Postgres/Blob cu `vercel env pull .env.local` in loc sa le copiezi manual.

### 2. Seteaza variabilele de mediu

Copiaza `.env.local.example` in `.env.local` si completeaza:

| Variabila | De unde vine |
|---|---|
| `POSTGRES_URL` | generata automat cand conectezi Vercel Postgres la proiect |
| `BLOB_READ_WRITE_TOKEN` | generata automat cand conectezi Vercel Blob la proiect |
| `SESSION_SECRET` | un string lung, random, generat o singura data (ex: `openssl rand -hex 32`) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | alese de tine — folosite **doar** de scriptul de seed, ca sa creeze contul de admin; nu sunt citite la runtime dupa aceea |
| `RESEND_API_KEY` | din contul Resend creat mai sus |

Seteaza aceleasi variabile si in Vercel (Project Settings -> Environment Variables) inainte de deploy, nu doar local.

### 3. Migreaza si populeaza baza de date

```bash
npm run db:migrate   # creeaza tabelele (admin_user, settings, media)
npm run db:seed       # creeaza contul de admin si populeaza settings din content.json
```

`db:seed` citeste `ADMIN_USERNAME`/`ADMIN_PASSWORD` din mediu, hash-uieste parola si creeaza randul de admin; daca tabelul `settings` e gol, il populeaza cu valorile din `content.json` (asta e singura data cand `content.json` mai conteaza).

### 4. Logheaza-te in admin

Porneste `npm run dev` (sau foloseste deploy-ul de pe Vercel), mergi la `/admin`, autentifica-te cu `ADMIN_USERNAME`/`ADMIN_PASSWORD` de mai sus. De acolo se editeaza totul:

- **Continut** — mesajele de reveal, textele de countdown, textele emailului, textele ecranului de login al destinatarei.
- **Data & ora** — data/ora evenimentului (afecteaza countdown-ul de pe site).
- **Tema 3D** — alegerea uneia din cele 15 teme (forme/materiale/miscare diferite) si override-uri de culoare.
- **Media** — incarcare poze/video in zonele `heroBackground`, `revealBackground`, `gallery`.
- **Email** — trimiterea invitatiei prin Resend, catre orice adresa.

Nu mai e nevoie de commit/push pentru schimbari de continut — se salveaza direct in baza de date si apar imediat pe site (pagina publica citeste live, `force-dynamic`).

## Fallback offline (optional)

`npm run build:email` regenereaza `email/invite-email.html` din `content.json`, la fel ca inainte — util doar daca vrei sa generezi un email static fara sa treci prin Resend/panoul de admin (ex: fara conexiune la baza de date). Pentru fluxul curent, folosirea tab-ului Email din `/admin` e suficienta si nu necesita acest script.

## Login-ul destinatarei

Ecranul de login public (cel pe care il vede persoana invitata, nu adminul) foloseste user/parola din setari (`login.expectedUsername`/`login.expectedPassword`, editabile din tab-ul Continut, implicit `fatamisterioasa` / `elefant123`). **Nu e securitate reala** — codul e vizibil oricui deschide devtools in browser, tine doar lumea din intamplare departe de link. E complet separat de contul de admin (`ADMIN_USERNAME`/`ADMIN_PASSWORD`), care protejeaza `/admin` cu autentificare reala pe server.

## Deploy (Vercel prin GitHub)

1. Creeaza un repo nou pe GitHub (gol, fara README).
2. Din acest folder:
   ```bash
   git remote add origin <url-ul-repo-ului-tau>
   git branch -M main
   git push -u origin main
   ```
3. Pe [vercel.com](https://vercel.com), "Add New Project" -> importa repo-ul din GitHub -> conecteaza Postgres si Blob (daca nu sunt deja) -> seteaza variabilele de mediu din sectiunea de mai sus -> Deploy.
4. Dupa primul deploy, ruleaza migrarea si seed-ul impotriva bazei de date de productie (fie local cu `POSTGRES_URL` de productie in mediu, fie printr-un shell/CLI conectat la Vercel).
5. Logheaza-te in `/admin` pe URL-ul de productie si completeaza `email.ctaUrl` din tab-ul Continut cu URL-ul dat de Vercel, apoi trimite invitatia din tab-ul Email.
