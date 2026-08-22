# Invitatie la date

Website + email pentru invitatia misterioasa, plus un formular unde ea alege ce isi doreste pentru urmatorul date.

## Arhitectura

- **Next.js** (App Router). Textele site-ului (mesaje reveal, countdown, login) vin din `content.json`, editat direct de mana — nu exista baza de date pentru continut.
- **Tema 3D activa** e singura stare partajata: o cheie (`activeTheme`) intr-un **Vercel Edge Config** store, citita de site-ul public la fiecare request si scrisa din pagina `/tema` (protejata cu parola ta, nu login real).
- **Selectiile ei** (loc, ora, ce sa pregatim) se salveaza in `localStorage`-ul browser-ului ei cat timp completeaza formularul (draft, nu se pierde la refresh), apoi la apasarea butonului "Trimite" sunt trimise printr-un API route catre **Resend**, care iti trimite tie un email la `miu.catalinm@gmail.com`.

## Development

```bash
npm install
npm run dev    # site public la http://localhost:3000, tema la http://localhost:3000/tema
npm test       # ruleaza testele
npm run build  # build de productie
```

## Setup initial (o singura data)

### 1. Resend (pentru emailul cu selectiile ei)

Creeaza un cont gratuit pe [resend.com](https://resend.com) si genereaza un API key.

### 2. Vercel Edge Config (pentru tema live)

1. Din dashboard-ul proiectului pe [vercel.com](https://vercel.com), Storage -> Create -> Edge Config. Conecteaza-l la acest proiect — asta injecteaza automat variabila `EDGE_CONFIG` (citirea temei foloseste asta, nu trebuie copiata de mana).
2. Noteaza ID-ul Edge Config-ului (vizibil in URL-ul paginii lui din dashboard, sau in Settings ale store-ului) — asta e `EDGE_CONFIG_ID`.
3. Genereaza un token personal Vercel: Account Settings -> Tokens -> Create Token. Asta e `VERCEL_API_TOKEN` — e folosit doar de pagina `/tema` ca sa poata scrie in Edge Config (citirea publica nu are nevoie de el).

### 3. Variabile de mediu

Copiaza `.env.local.example` in `.env.local` si completeaza:

| Variabila | De unde vine |
|---|---|
| `RESEND_API_KEY` | din contul Resend creat mai sus |
| `EDGE_CONFIG` | generata automat cand conectezi Edge Config la proiect (Vercel) — local, copiaz-o din Project Settings -> Environment Variables dupa ce ai conectat store-ul |
| `EDGE_CONFIG_ID` | ID-ul store-ului, din dashboard |
| `VERCEL_API_TOKEN` | tokenul personal creat mai sus |

Seteaza aceleasi variabile si in Vercel (Project Settings -> Environment Variables) inainte de deploy, nu doar local.

### 4. Parola paginii de tema

In `content.json`, sub `themeLogin`, schimba `expectedPassword` (si `expectedUsername` daca vrei) din valoarea placeholder pusa initial.

## Login-ul destinatarei

Ecranul de login public (cel pe care il vede persoana invitata) foloseste `login.expectedUsername`/`expectedPassword` din `content.json`, implicit `fatamisterioasa` / `elefant123`. **Nu e securitate reala** — codul e vizibil oricui deschide devtools in browser, tine doar lumea din intamplare departe de link.

Pagina `/tema` foloseste acelasi mecanism (nu e securitate reala), cu `themeLogin` in `content.json` — e doar ca tu sa nu trebuiasca sa umbli in cod ca sa schimbi tema cand te plictisesti de ea.

## Fallback offline (optional)

`npm run build:email` regenereaza `email/invite-email.html` din `content.json`, la fel ca inainte — util daca vrei sa generezi manual emailul de invitatie initial fara sa treci prin niciun API.

## Deploy (Vercel prin GitHub)

1. Creeaza un repo nou pe GitHub (gol, fara README).
2. Din acest folder:
   ```bash
   git remote add origin <url-ul-repo-ului-tau>
   git branch -M main
   git push -u origin main
   ```
3. Pe [vercel.com](https://vercel.com), "Add New Project" -> importa repo-ul din GitHub -> conecteaza Edge Config (daca nu e deja) -> seteaza variabilele de mediu din sectiunea de mai sus -> Deploy.
