# Ghid de configurare, pas cu pas

Ghidul presupune ca pornesti de la zero si nu ai experienta cu terminalul. Fa pasii in ordine. Unde scrie "copiaza", pune valoarea intr-un fisier text temporar (Notepad; nu il salva in folderul proiectului) pana ajungi la pasul cu variabilele de mediu.

Timp estimat: 45-60 de minute prima data.

---

## 0. Ce iti trebuie, terminalul si regulile pentru secrete

### 0.1 Programe si conturi

- **Node.js 22**. Verifica in terminal: `node -v` trebuie sa arate `v22...`. Daca nu il ai: https://nodejs.org -> descarca versiunea LTS 22 -> instaleaza cu Next, Next, Finish (dupa instalare inchide si redeschide terminalul).
- **Git**. Verifica: `git --version`.
- Conturi (toate gratuite): **GitHub**, **Vercel**, **TiDB Cloud**, **Resend**.

### 0.2 Cum deschizi terminalul in folderul proiectului

Toate comenzile din ghid se ruleaza intr-un terminal deschis **in folderul proiectului** (`C:\Users\<tu>\Desktop\invitatie`). Cel mai simplu:

1. Deschide **Explorer** si intra in folderul `invitatie` (folderul unde vezi `package.json`, `app`, `lib`).
2. Click pe **bara de adresa** din partea de sus a ferestrei (unde scrie `Desktop > invitatie`), scrie `powershell` si apasa **Enter**.
3. Se deschide o fereastra albastra. Prima linie trebuie sa se termine cu `...\invitatie>`. Daca da, esti in locul potrivit.

(Alternativ, in VS Code: meniul **Terminal** -> **New Terminal**.)

**Care terminal folosesti?** Recomandat: **PowerShell** (cel de mai sus). Comenzile `npm ...` merg identic in PowerShell, cmd si Git Bash. Diferenta apare doar la copierea fisierelor si la introducerea parolelor:

| Ce faci | PowerShell | cmd | Git Bash |
|---|---|---|---|
| Copiezi un fisier | `Copy-Item sursa destinatie` | `copy sursa destinatie` | `cp sursa destinatie` |
| Generezi hash pentru parola | `npm run hash-password` | `npm run hash-password` | `winpty npm run hash-password` |

`Copy-Item` exista **doar in PowerShell**. Daca il rulezi in Git Bash sau cmd vezi `command not found` / `not recognized`: nu e o problema cu proiectul, ai deschis alt terminal. Foloseste `cp` (Git Bash) sau `copy` (cmd).

### 0.3 Reguli pentru secrete (citeste o data, important)

Parolele, cheile si connection string-urile sunt **secrete**. Regulile:

1. Valorile reale se scriu **doar** in `.env.local` si `.env.test.local`. Aceste doua fisiere sunt ignorate de git, deci nu ajung pe GitHub.
2. **Nu scrie niciodata valori reale in `.env.local.example` sau `.env.test.local.example`.** Fisierele `.example` SUNT urmarite de git: tot ce scrii in ele ajunge pe GitHub la primul commit. Ele raman goale, ca sabloane.
3. Dupa ce ai completat fisierele, ruleaza in terminal:
   ```bash
   git status
   ```
   Lista **nu trebuie** sa contina `.env.local`, `.env.test.local` si nici `.env.local.example` ca `modified`. Daca vezi `.env.local.example` modificat, ai scris secrete in el: muta valorile in `.env.local`, apoi ruleaza `git restore .env.local.example` ca sa-l readuci gol.
4. Nu trimite secrete in chat, email sau capturi de ecran (nici mie, nici altcuiva): parole, `DATABASE_URL`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `SESSION_SECRET`, hash-urile de parola. Daca ai trimis din greseala o valoare, considera-o compromisa: genereaza-o din nou (parola TiDB, cheia Resend, tokenul Blob, `npm run gen-secret`) si inlocuieste-o.

---

## 1. Baza de date (TiDB Cloud)

### 1.1 Cont si cluster

Numele de proiect si de cluster sunt doar etichete pentru tine: merge orice nume (de exemplu proiect `date-app`, cluster `DateApp`). Nu conteaza pentru aplicatie.

1. Intra pe https://tidbcloud.com si fa-ti cont (poti folosi "Sign in with Google").
2. Daca te intreaba de un "organization" sau "project", lasa numele implicite sau scrie ce vrei.
3. Pe pagina **Clusters**, apasa **Create Cluster**.
4. Alege planul **Starter** (gratuit; in unele versiuni ale interfetei apare ca "Serverless").
5. **Cloud Provider**: AWS. **Region**: **Frankfurt (eu-central-1)**. Regiunea conteaza: Vercel ruleaza tot in Frankfurt, deci aplicatia e rapida.
6. **Cluster Name**: orice (ex. `DateApp`). Apasa **Create**. Asteapta ~1 minut pana statusul devine "Available".

### 1.2 Datele de conectare

1. Deschide clusterul. Sus-dreapta apasa **Connect**.
2. **Connection Type**: `Public`. **Connect With**: `General`.
3. Apasa **Generate Password**. **Copiaza parola acum**: nu o mai poti vedea dupa ce inchizi fereastra (poti genera alta oricand, dar cea veche nu mai merge).
4. Copiaza si:
   - **HOST** (arata ca `gateway01.eu-central-1.prod.aws.tidbcloud.com`)
   - **PORT** (`4000`)
   - **USERNAME**: atentie, are un **prefix**, arata ca `2abcDEFgh.root`. Copiaza-l **intreg**, cu tot cu partea de dinaintea punctului. Daca il copiezi doar ca `root`, aplicatia da eroarea `Missing user name prefix`.

### 1.3 Cele doua baze de date

Aici numele **conteaza**: aplicatia si testele le cauta exact asa.

1. In meniul din stanga al clusterului, deschide **SQL Editor**.
2. Scrie si ruleaza (butonul **Run**):
   ```sql
   CREATE DATABASE dates;
   CREATE DATABASE dates_test;
   ```
   `dates` e baza reala. `dates_test` e folosita doar de teste, ca ele sa nu atinga niciodata datele voastre. Testele refuza sa ruleze pe o baza al carei nume nu se termina in `dates_test`.

### 1.4 Connection string-urile

Construieste doua randuri, inlocuind `USERNAME`, `PAROLA`, `HOST` (USERNAME cu prefix, vezi 1.2):

```
mysql://USERNAME:PAROLA@HOST:4000/dates?ssl={"rejectUnauthorized":true}
mysql://USERNAME:PAROLA@HOST:4000/dates_test?ssl={"rejectUnauthorized":true}
```

Primul e `DATABASE_URL`, al doilea e `TEST_DATABASE_URL`. Se scriu **exact** asa, fara ghilimele in jurul intregului rand si fara spatii. Partea `?ssl={"rejectUnauthorized":true}` e obligatorie (fara ea: `Connections using insecure transport are prohibited`).

> Daca parola contine vreunul dintre caracterele `@ : / ? # %`, genereaza alta parola (pasul 1.2). Parolele generate de TiDB sunt de obicei doar litere si cifre.

---

## 2. Emailuri (Resend)

1. Intra pe https://resend.com cu contul existent.
2. Meniul din stanga -> **API Keys** -> **Create API Key**.
3. **Name**: `dateuri`. **Permission**: `Sending access`. Apasa **Add**.
4. **Copiaza cheia** (incepe cu `re_`): se afiseaza o singura data. Asta e `RESEND_API_KEY`.
5. `EMAIL_EL` = adresa de email cu care e facut contul Resend (vezi Settings -> Team sau coltul din dreapta-sus).

> De ce doar la tine: fara un domeniu verificat, Resend trimite emailuri doar la adresa contului (expeditorul e `onboarding@resend.dev`, modul "sandbox"). Emailurile ajung deci numai la `EMAIL_EL`. Ea vede toate notificarile in aplicatie (badge-ul de la "Notificari"). Daca verifici mai tarziu un domeniu in Resend (Domains -> Add Domain), completeaza `EMAIL_EA` si cere o mica modificare in `lib/notifications/email.ts`.

---

## 3. Vercel: poze (Blob) si curatenie dupa aplicatia veche

### 3.1 Blob store pentru poze

1. Intra pe https://vercel.com -> deschide proiectul existent (`invitatie`).
2. Tab-ul **Storage** -> **Create Database** (sau **Create**) -> alege **Blob** -> **Continue**.
3. **Name**: `dateuri-poze`. Apasa **Create**.
4. Cand te intreaba de conectare la proiect, alege proiectul `invitatie` si bifeaza **toate mediile** (Production, Preview, Development) -> **Connect**.
5. Vercel adauga singur variabila `BLOB_READ_WRITE_TOKEN` in proiect (pentru deploy). Pentru rularea **locala** ai nevoie sa o copiezi tu:
   1. Proiect -> tab-ul **Storage** -> click pe store-ul `dateuri-poze`.
   2. In pagina store-ului cauta tab-ul **`.env.local`**: afiseaza un rand `BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."`. Apasa **Show secret** (sau **Copy Snippet**) si copiaza valoarea dintre ghilimele (incepe cu `vercel_blob_rw_`).
   3. Alternativa: proiect -> **Settings** -> **Environment Variables** -> `BLOB_READ_WRITE_TOKEN` -> iconita de ochi (**Reveal**) -> copiaza-o.
   4. Valoarea o pui in `.env.local` la pasul 4.2 (fara ghilimele).

> Despre confidentialitatea pozelor: fisierele sunt stocate in Blob cu acces "public", dar cu un URL cu sufix aleator care nu ajunge niciodata in browser; aplicatia le serveste doar prin `/api/photos/...`, dupa verificarea sesiunii. Risc acceptat: cine ajunge la URL-ul brut al unei poze (din baza de date sau din loguri) o poate deschide. De aceea tratam URL-urile Blob ca pe niste secrete: nu le copia in chat si nu le publica.

> Pana pui tokenul real, aplicatia porneste si totul merge, **cu exceptia pozelor**: incarcarea unei poze da eroare. Ca sa poti rula aplicatia inainte de acest pas, pune in `.env.local` la `BLOB_READ_WRITE_TOKEN` o valoare oarecare (ex. `deocamdata`); variabila nu poate lipsi.

### 3.2 Scoate ce nu mai folosim (important pentru securitate)

1. Proiect -> **Settings** -> **Environment Variables**: sterge `EDGE_CONFIG`, `EDGE_CONFIG_ID`, `VERCEL_API_TOKEN` (meniul cu trei puncte -> **Remove**).
2. Tab-ul **Storage** -> store-ul Edge Config vechi -> **Projects** -> **Disconnect**. (Poti sterge store-ul din Settings-ul lui.)
3. Avatarul tau (sus-dreapta) -> **Account Settings** -> **Tokens** -> sterge tokenul folosit pentru tema veche. Un token lasat activ da acces la contul tau Vercel.

---

## 4. Configurarea locala

Terminalul: PowerShell deschis in folderul proiectului (vezi 0.2).

### 4.1 Instalare
```bash
npm install
```

### 4.2 Fisierul `.env.local`

Creeaza-l copiind sablonul (o singura comanda, dupa terminalul tau):

```powershell
# PowerShell
Copy-Item .env.local.example .env.local
```
```bash
# Git Bash
cp .env.local.example .env.local
```
```bat
:: cmd
copy .env.local.example .env.local
```

Deschide-l ca sa-l editezi: `notepad .env.local` (se deschide in Notepad; salveaza cu Ctrl+S). **Completezi `.env.local`, NU `.env.local.example`** (vezi regula 0.3). Fiecare rand are forma `NUME=valoare`, fara spatii si fara ghilimele:

| Variabila | Ce pui |
|---|---|
| `DATABASE_URL` | primul connection string de la pasul 1.4 |
| `SESSION_SECRET` | rezultatul comenzii `npm run gen-secret` (minim 32 de caractere) |
| `USER_EL_NAME` | username-ul tau de login (ex. `catalin`) |
| `USER_EL_PASSWORD_HASH` | rezultatul `npm run hash-password` (vezi mai jos) |
| `USER_EA_NAME` | username-ul ei (ex. un nume de alint); trebuie sa difere de al tau |
| `USER_EA_PASSWORD_HASH` | rezultatul `npm run hash-password` pentru parola ei |
| `EMAIL_EL` | de la pasul 2 |
| `EMAIL_EA` | lasa gol |
| `RESEND_API_KEY` | de la pasul 2 |
| `BLOB_READ_WRITE_TOKEN` | de la pasul 3.1 (sau o valoare provizorie) |
| `APP_URL` | lasa gol local |

**`SESSION_SECRET`:** ruleaza `npm run gen-secret`, copiaza randul lung afisat.

**Hash-urile de parola.** Pentru fiecare parola ruleaza in **PowerShell** sau **cmd**:
```bash
npm run hash-password
```
In **Git Bash** ruleaza `winpty npm run hash-password`: numai asa parola tastata ramane ascunsa (fara `winpty` fie o vezi pe ecran cand o tastezi, fie comanda nu poate citi tastatura).

Parola trebuie sa aiba minim 12 caractere (ideal 3-4 cuvinte, ex. `elefant roz danseaza tango`), maxim 72. Scrie parola (nu se vede pe ecran cand tastezi, e normal), Enter, repeta-o, Enter. Comanda afiseaza un rand lung (base64): copiaza-l **intreg** in variabila `..._PASSWORD_HASH`. Parola in clar nu se salveaza nicaieri: tine-o minte sau in managerul tau de parole. Fa asta de doua ori (cate una pentru fiecare utilizator).

Username-urile nu tin cont de litere mari / mici. Parolele da.

Dupa ce ai salvat `.env.local`, ruleaza `git status` (regula 0.3): `.env.local.example` nu trebuie sa apara ca modificat.

### 4.3 Fisierul `.env.test.local` (pentru teste)

```powershell
# PowerShell
Copy-Item .env.test.local.example .env.test.local
```
(`cp` in Git Bash, `copy` in cmd, ca mai sus.) Deschide-l cu `notepad .env.test.local` si pune in `TEST_DATABASE_URL` al doilea connection string de la pasul 1.4 (cel cu `/dates_test`). Nu il pune pe cel cu `/dates`: testele sterg tot din baza pe care o primesc.

### 4.4 Tabelele

```bash
npm run db:migrate
```
Expected: mesaj de tip `migrations applied successfully`. Comanda foloseste `DATABASE_URL` din `.env.local`, deci creeaza tabelele in baza `dates`. Verifica in TiDB -> SQL Editor:
```sql
USE dates;
SHOW TABLES;
```
Trebuie sa vezi: `ideas`, `invitations`, `login_attempts`, `memories`, `notifications`, `photos` si `__drizzle_migrations`.

Daca `db:migrate` da eroare, cauta mesajul in tabelul de la sectiunea 9 (cel mai des: username fara prefix, lipseste `?ssl=...`, baza `dates` nu exista).

(Baza `dates_test` nu ai nevoie sa o migrezi tu: testele aplica singure migrarile pe ea.)

### 4.5 Porneste aplicatia

```bash
npm run dev
```

In terminal apare ceva de genul:
```
Next.js 16...
- Local:  http://localhost:3000
Ready in ...
```
Deschide in browser **adresa exacta afisata dupa `Local:`**. De obicei e http://localhost:3000, dar daca portul 3000 e ocupat de alta aplicatie, Next.js alege singur alt port (3001 etc.) si il scrie acolo. Poti alege tu portul cu:
```bash
npm run dev -- -p 3001
```

Ajungi la pagina de login ("Dateurile noastre"). Logheaza-te cu unul din cele doua username-uri (`USER_EL_NAME` sau `USER_EA_NAME`) si parola aleasa la pasul 4.2. Sesiunea tine 30 de zile.

**Important despre terminal:**
- `npm run dev` **trebuie sa ramana pornit** cat folosesti aplicatia. Fereastra terminalului ramane "ocupata"; nu o inchide si nu scrie in ea. Pentru alte comenzi deschide o a doua fereastra PowerShell (0.2).
- Ca sa opresti aplicatia: click in fereastra ei si apasa **Ctrl+C** (daca intreaba `Terminate batch job (Y/N)?` scrie `Y` si Enter).
- Daca vezi `Another next dev server is already running`, inseamna ca aplicatia ruleaza deja (poate intr-un alt terminal): foloseste adresa aratata in mesaj, sau opreste-o cu comanda `taskkill /PID <numar> /F` exact asa cum o afiseaza mesajul.

### 4.6 Ziua de zi cu zi

- **Pornesti:** deschizi PowerShell in folderul proiectului (0.2) -> `npm run dev` -> deschizi adresa din terminal.
- **Opresti:** Ctrl+C in fereastra respectiva.
- **Login:** pagina `/login` (te trimite acolo automat daca nu esti logat). Doua conturi: `USER_EL_NAME` si `USER_EA_NAME` din `.env.local`.
- Dupa ce modifici `.env.local`, opreste aplicatia (Ctrl+C) si porneste-o din nou.

### 4.7 Ruleaza testele

Testele unitare si de integrare (rapide, folosesc `dates_test`):
```bash
npm run verify
```
Face trei lucruri: verificarea tipurilor, toate testele si `npm audit`. Toate trebuie sa treaca.

Testele in browser (E2E), optional, dureaza ~2 minute:
```bash
npx playwright install chromium
npm run test:e2e
```
- `npx playwright install chromium` se face **o singura data** (descarca ~115 MB, browserul de test).
- `npm run test:e2e` construieste aplicatia (`npm run build`), o porneste pe portul **3100** (nu se ciocneste cu `npm run dev` de pe 3000) si ruleaza testele contra bazei `dates_test`. Nu atinge baza `dates`. Ai nevoie de `TEST_DATABASE_URL` in `.env.test.local`.
- Testul de upload real de poze e sarit automat (apare `skipped`). Ca sa-l rulezi, adauga in `.env.test.local` o linie noua `E2E_BLOB_READ_WRITE_TOKEN=<acelasi token Blob>`. Atentie: scrie poze mici de test in Blob-ul real.

---

## 5. Deploy: variabilele de mediu in Vercel

Proiect -> **Settings** -> **Environment Variables**. Pentru fiecare rand de mai jos: **Key** = numele, **Value** = valoarea, bifeaza **Production** (si **Preview** daca vrei ca si preview-urile din PR-uri sa mearga) -> **Save**.

| Key | Value | Obligatorie? |
|---|---|---|
| `DATABASE_URL` | la fel ca local (baza `dates`) | da |
| `SESSION_SECRET` | **unul nou**: ruleaza iar `npm run gen-secret` | da |
| `USER_EL_NAME`, `USER_EL_PASSWORD_HASH` | la fel ca local | da |
| `USER_EA_NAME`, `USER_EA_PASSWORD_HASH` | la fel ca local | da |
| `EMAIL_EL` | la fel ca local | da |
| `RESEND_API_KEY` | la fel ca local | da |
| `BLOB_READ_WRITE_TOKEN` | exista deja, pus de Vercel la pasul 3.1 | da |
| `EMAIL_EA` | lasa necompletata (vezi nota Resend, pasul 2) | nu |
| `APP_URL` | ex. `https://invitatie.vercel.app` (fara `/` la final); folosit in linkurile din emailuri | nu |

`APP_URL` e optionala: daca lipseste, aplicatia foloseste adresa proiectului din Vercel. Lipsa oricarei variabile obligatorii opreste aplicatia cu eroarea `Variabile de mediu lipsa sau invalide` (vezi sectiunea 9).

**Dupa orice modificare a variabilelor de mediu trebuie sa faci Redeploy** (Vercel citeste variabilele la build): **Deployments** -> ultimul deploy -> meniul cu trei puncte -> **Redeploy**.

Regiunea functiilor e setata in cod (`vercel.json` -> `fra1`, Frankfurt, aproape de baza TiDB). Verifica dupa primul deploy: **Settings** -> **Functions** -> **Function Region** arata Frankfurt.

Baza de date: productia foloseste aceeasi baza `dates` pe care ai migrat-o la pasul 4.4 (acelasi `DATABASE_URL`), deci tabelele exista deja. Daca vreodata pui o alta baza in Vercel, ruleaza `npm run db:migrate` cu `DATABASE_URL`-ul ei inainte de deploy.

---

## 6. Deploy

Checklist pentru prima data:
1. Pasul 3.2 facut (variabilele si tokenul vechi sterse).
2. Toate variabilele din pasul 5 exista in Vercel.
3. `npm run verify` trece local.

Apoi:
1. Pe GitHub, deschide repo-ul -> apare banner-ul pentru branch-ul `date-manager` -> **Compare & pull request** -> **Create pull request**.
2. Vercel face automat un **Preview** pentru PR (link in comentariile PR-ului). Poti testa acolo daca ai bifat Preview la pasul 5.
3. **Merge pull request** -> Vercel face deploy pe productie din `master` (tab-ul **Deployments**, ~2 minute).

---

## 7. Verificare pe productie

1. Deschide URL-ul aplicatiei -> ajungi la login.
2. Logheaza-te ca el -> creeaza o invitatie pentru maine.
3. Intr-o fereastra privata, logheaza-te ca ea -> badge "1" la Notificari -> deschide invitatia -> animatia cu inima -> deruleaza -> raspunde "Propun alta ora".
4. Verifica emailul (`EMAIL_EL`): a venit notificarea (uita-te si in Spam).
5. Ca el -> "Accept ora propusa" -> dashboard arata countdown.
6. Parcurge si `docs/security-checklist.md`.

---

## 8. Operatiuni uzuale

- **Schimb o parola:** `npm run hash-password` -> inlocuieste `USER_.._PASSWORD_HASH` in `.env.local` si in Vercel -> in Vercel, **Redeploy** (vezi pasul 5).
- **Delogheaza pe toata lumea:** genereaza un `SESSION_SECRET` nou in Vercel (`npm run gen-secret`) -> Redeploy.
- **Te-ai blocat din greseala la login (5 incercari gresite):** asteapta 15 minute, sau in TiDB SQL Editor:
  ```sql
  USE dates;
  DELETE FROM login_attempts;
  ```
  (Baza `dates` e folosita si local, si in productie, deci comanda deblocheaza ambele.)
- **Vezi erorile aplicatiei:** Vercel -> proiect -> **Logs** -> in caseta de cautare scrie `login_error` (sau `EnvError`, sau `"level":"error"`). Fiecare linie e un JSON, de exemplu:
  ```json
  {"level":"error","event":"login_error","time":"...","reason":"EnvError","detail":"Variabile de mediu lipsa sau invalide: SESSION_SECRET (Too small: expected string to have >=32 characters)"}
  ```
  `reason` e tipul erorii. Pentru o variabila de mediu gresita, `detail` spune care variabila (niciodata valoarea ei). Pentru o eroare de baza de date apar `dbCode` si `dbKind` (`access_denied` = user sau parola gresite, `unknown_database` = baza nu exista, `table_missing` = lipsesc migrarile, `db_error` = alta eroare). Textul mesajelor voastre nu se logheaza niciodata.

---

## 9. Probleme frecvente

| Ce vezi | Cauza | Solutie |
|---|---|---|
| `Copy-Item : command not found` / `not recognized` | ai deschis Git Bash sau cmd; `Copy-Item` exista doar in PowerShell | foloseste `cp` (Git Bash) sau `copy` (cmd), sau deschide PowerShell (pasul 0.2) |
| Parola apare pe ecran / `hash-password` nu merge in Git Bash | Git Bash nu ascunde parola | ruleaza in PowerShell sau cmd, sau `winpty npm run hash-password` |
| `Variabile de mediu lipsa sau invalide: SESSION_SECRET (...)` | variabila lipseste sau e prea scurta | `npm run gen-secret`, pune rezultatul in `.env.local` (fara spatii), reporneste aplicatia |
| `USER_EL_PASSWORD_HASH (trebuie generat cu npm run hash-password)` | ai pus parola sau hash-ul brut `$2b$...` | ruleaza `npm run hash-password` si pune randul base64 |
| `USER_EA_NAME (trebuie sa difere de USER_EL_NAME)` | acelasi username pentru amandoi | alege altul |
| `Access denied for user` | user sau parola gresite in `DATABASE_URL` | refa pasul 1.2 si 1.4 |
| `Missing user name prefix` | USERNAME din `DATABASE_URL` e fara prefix (ex. `root` in loc de `2abc....root`) | copiaza username-ul intreg din TiDB -> Connect (pasul 1.2) |
| `Connections using insecure transport are prohibited` | lipseste `?ssl={"rejectUnauthorized":true}` din URL | adauga-l la final |
| `Unknown database 'dates'` | baza nu exista | pasul 1.3 |
| `Another next dev server is already running` | aplicatia ruleaza deja | deschide adresa din mesaj, sau `taskkill /PID <numar> /F` (numarul e in mesaj), apoi `npm run dev` |
| Portul 3000 e ocupat de alta aplicatie | alt program foloseste portul | Next.js alege alt port si il afiseaza; sau `npm run dev -- -p 3001` |
| Testele pica imediat, cu o eroare din "global setup" / `TEST_DATABASE_URL trebuie sa pointeze la baza dates_test` | `.env.test.local` lipseste, are inca valoarea goala / de completat, sau pointeaza la baza reala | pune in `.env.test.local` connection string-ul complet care se termina in `/dates_test` (pasul 4.3) |
| Testele de integrare apar "skipped" | lipseste `.env.test.local` | pasul 4.3 |
| Login mereu "gresit" | username diferit de cel din env, parola gresita, sau blocat de rate limit | verifica `USER_.._NAME`; vezi mai jos |
| "Prea multe incercari, incearca din nou peste 15 minute" | 5 incercari gresite de pe acelasi IP | asteapta 15 minute sau `USE dates; DELETE FROM login_attempts;` in TiDB SQL Editor |
| Nu vine emailul | `EMAIL_EL` diferit de adresa contului Resend, sau Spam | Resend -> **Emails** arata fiecare trimitere si motivul erorii |
| Poza nu se incarca | `BLOB_READ_WRITE_TOKEN` provizoriu / gresit | pune tokenul real (pasul 3.1) |
| "Sunt acceptate doar poze JPEG, PNG sau WebP" | poza HEIC pe un browser desktop care nu o poate deschide | trimite-o de pe telefon sau converteste in JPG |
| Nu se vad frunzele / fulgii | WebGL dezactivat (accelerare hardware oprita in browser) | Chrome -> Settings -> System -> "Use graphics acceleration" pornit; aplicatia merge si fara |
| `.env.local.example` apare modificat in `git status` | ai scris valori reale in el | muta valorile in `.env.local`, apoi `git restore .env.local.example` (regula 0.3) |
| `npm audit` raporteaza vulnerabilitati | dependinte vechi | `npm audit fix` (fara `--force`), apoi `npm run verify` |
