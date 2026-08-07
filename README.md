# Invitatie la date

Website + email pentru invitatia misterioasa. Continutul (mesajele, data/ora, linkuri) e in `content.json` — editeaza-l acolo, nu in cod.

## Development

```bash
npm install
npm run dev        # website la http://localhost:3000
npm test            # ruleaza testele
npm run build:email # regenereaza email/invite-email.html din content.json
```

## Editare continut

Deschide `content.json`:
- `website.revealSteps` — mesajele care apar pe rand cand ea da tap pe ecran
- `website.countdownLabel` / `countdownCompleteLabel` — textul de langa countdown
- `eventDateISO` — data si ora tinta (format ISO, cu offset de timezone, ex `2026-07-25T13:00:00+03:00`)
- `email.*` — subiect, paragrafe, text buton, link catre website
- `login.expectedUsername` / `login.expectedPassword` — user/parola de pe ecranul de login (implicit `fatamisterioasa` / `elefant123`). **Nu e securitate reala** — codul e vizibil oricui deschide devtools in browser, tine doar lumea din intamplare departe de link.

## Tematica lunara

Site-ul isi alege automat una din 12 palete de culori, in functie de luna curenta (`lib/theme.ts`, `THEMES`). Iulie foloseste paleta pastel deja aprobata; celelalte 11 luni au fiecare o paleta diferita, gata pregatita. Daca refolosesti site-ul pentru o alta data intr-o alta luna, culorile se schimba singure — tu doar editezi textul din `content.json` (recomandat cu ~2 saptamani inainte de data respectiva). Daca vrei sa schimbi o paleta anume, editeaza intrarea corespunzatoare din `lib/theme.ts`.

Dupa orice modificare in `content.json`, ruleaza `npm run build:email` din nou ca sa regenerezi `email/invite-email.html`.

## Deploy (Vercel prin GitHub)

1. Creeaza un repo nou pe GitHub (gol, fara README).
2. Din acest folder:
   ```bash
   git remote add origin <url-ul-repo-ului-tau>
   git push -u origin main
   ```
3. Pe [vercel.com](https://vercel.com), "Add New Project" -> importa repo-ul din GitHub -> Deploy (Vercel detecteaza Next.js automat, nu trebuie configurat nimic).
4. Dupa deploy, ia URL-ul dat de Vercel si pune-l in `content.json` la `email.ctaUrl`, apoi ruleaza `npm run build:email` din nou ca sa regenerezi emailul cu linkul corect.
5. Trimite `email/invite-email.html` (deschide-l, copiaza continutul in clientul tau de email, sau atașează-l) catre destinatara.
