# Stickere in text, desene si poze in doua trepte - design

Data: 2026-10-02
Status: aprobat de utilizator in brainstorming (sectiunile 1-4)

## 1. Scop

Trei lucruri, livrate in acelasi proiect pentru ca toate schimba stocarea imaginilor:

1. **Stickere in text.** Stickerele pe care cei doi le au deja pe iPhone (tastatura de stickere iOS) ajung direct in text, in acelasi mesaj, intre cuvinte (nu separat ca pe WhatsApp). Stickerele intra intr-o colectie comuna "Stickerele noastre", refolosibila.
2. **Desen cu stiloul.** Buton separat (nu e sticker): panza pe tot ecranul, desenul intra in text la cursor, pe randul lui. Nu intra in colectie.
3. **Poze in doua trepte.** Pozele merg in Vercel Blob pana la un plafon, apoi (sau cand Blob refuza) in TiDB. Locul fiecarei poze se noteaza in baza de date; citirea merge direct acolo.

Campuri cu editorul nou: mesajul invitatiei, mesajul din raspuns, textul amintirii ("Cum a fost?"), descrierea ideii.

Dispozitive: iPhone cu Safari, Chrome pe PC.

### Nu face parte din lucrare
- stickere animate (se pastreaza primul cadru)
- editarea unui desen dupa ce a fost pus in text (se sterge si se deseneaza altul)
- set de stickere facut de noi / livrat cu aplicatia
- desen peste o poza
- stergerea automata a fundalului (model AI)
- formatare de text (bold, liste etc.); lipirea pastreaza doar textul
- stickere/desene in emailuri (emailurile nu contin textul mesajelor, doar link; raman neschimbate)
- cautarea "intai in Blob, apoi in TiDB" la citire (inlocuita de coloana `storage`)

## 2. Stocare

### 2.1 Tabel nou `media` (stickere si desene, in TiDB)
| Coloana | Tip | Note |
|---|---|---|
| `id` | char(36) ascii | PK |
| `kind` | enum('sticker','drawing') | |
| `author` | enum(USERS) | cine l-a creat |
| `content_type` | varchar(50) | doar `image/png` sau `image/webp` |
| `width`, `height` | int | din antetul fisierului, verificate pe server |
| `bytes` | int | marimea datelor |
| `sha256` | char(64) ascii null | amprenta, doar pentru stickere (deduplicare); null la desene |
| `data` | mediumblob | imaginea |
| `hidden_at` | datetime null | sticker scos din colectie: nu mai apare in panou, ramane vizibil in mesajele vechi |
| `created_at` | datetime | |

Indexuri: `uq_kind_sha (kind, sha256)` unic (desenele au `sha256` null, deci nu se lovesc intre ele), `idx_kind_created (kind, hidden_at, created_at)`. Doua uploaduri simultane ale aceluiasi sticker: al doilea primeste eroarea de duplicat, care se trateaza prin citirea id-ului existent.

Coloana `data` nu se selecteaza niciodata in listari; doar in ruta care serveste imaginea.

### 2.2 Poze in doua trepte
- `photos` primeste: `storage enum('blob','db') not null default 'blob'`, `bytes int null`. `blob_url` si `blob_pathname` devin nullable (nule cand `storage='db'`).
- Tabel nou `photo_data (photo_id char(36) PK FK -> photos.id on delete cascade, data mediumblob not null)`.
- **Salvare** (`addPhoto`):
  1. daca `sum(bytes) where storage='blob'` + marimea noua <= plafonul Blob, se incearca `blob.put`;
  2. daca plafonul e depasit **sau** `blob.put` arunca (spatiu plin, limita lunara de operatii, pana Vercel), poza merge in `photo_data` cu `storage='db'`, daca plafonul TiDB permite;
  3. daca ambele plafoane sunt pline: refuz politicos "Spatiul pentru poze e plin."
  4. esecul Blob se logheaza (`photo_blob_put_failed_fallback_db`), fara detalii catre client.
- **Citire** (`/api/photos/[id]`): `storage='blob'` -> stream din Blob ca acum; `storage='db'` -> bytes din `photo_data`. Un singur drum, fara cautare de proba.
- **Stergere**: `blob` -> `blob.del` apoi randul; `db` -> randul (cascada sterge `photo_data`).
- **Poze existente**: script one-off `scripts/backfill-photo-bytes.ts` care citeste marimea fiecarui blob (`head`) si completeaza `bytes`. Pana la rulare, randurile cu `bytes` null se numara cu o estimare de 800 KB fiecare (conservator).

### 2.3 Plafoane (in `LIMITS`)
| Ce | Unde | Plafon |
|---|---|---|
| poze | Vercel Blob | 800 MB (din 1 GB Hobby; peste limita Vercel poate bloca tot store-ul) |
| poze | TiDB (`photo_data`) | 1.5 GB |
| stickere + desene | TiDB (`media`) | 500 MB |
| stickere in colectie (vizibile) | | 300 |
| marime sticker | | <= 300 KB, <= 512 px latura mare |
| marime desen | | <= 500 KB, <= 1200 px latura mare |
| poza | | <= 4 MB (neschimbat) |

TiDB ajunge cel mult la ~2 GB de imagini din 5 GiB. Verificarea plafonului (`sum(bytes)`) nu e atomica: doua incarcari simultane pot depasi cu o imagine; marja plafoanelor acopera asta.

### 2.4 Limita de incarcari
Stickere + desene: maxim 60 pe ora per utilizator (numarat din `media.created_at`, fara tabel nou). Peste: "Prea multe incarcari, mai incearca peste putin."

### 2.5 Driverul TiDB si binarele
`@tidbcloud/serverless` trimite parametrii prin HTTP. Primul pas de implementare e o verificare (test de integrare pe `dates_test`): un buffer cu toti octetii 0-255 si unul de ~500 KB se scriu si se citesc identic. Daca driverul nu intoarce `Uint8Array`, se foloseste un `customType` cu conversie (ex. `HEX()`/`UNHEX()` sau base64) - decizia se ia pe baza testului, nu inainte.

#### Rezultate spike (2026-10-02, `lib/db/binary.spike.int.test.ts`)
| Varianta | 256 octeti | 500 KB | Scriere 500 KB | Citire 500 KB |
|---|---|---|---|---|
| A parametru Uint8Array / citire directa | PASS | PASS | 429 ms | 109 ms, intoarce `Uint8Array` |
| B parametru Buffer / citire directa | PASS | PASS | similar A | intoarce `Uint8Array` |
| C UNHEX(?) / HEX() | PASS | PASS | 162 ms | 73 ms (dar hex = 2x pe fir) |
| D FROM_BASE64(?) / TO_BASE64() | PASS | PASS | 130 ms | 75 ms |

Concluzie pentru Plan B: **scriere cu `FROM_BASE64(?)`** (parametru string base64; de ~3x mai rapida decat parametrul binar, pe care driverul il serializeaza ineficient) si **citire directa a coloanei** (driverul intoarce deja `Uint8Array`, fara conversie). Verificat si la 4 MB (marimea maxima a unei poze): scriere `FROM_BASE64` 1096 ms, citire directa 588 ms, octeti identici - limita de 4 MB ramane valabila si pentru pozele din TiDB.

## 3. Text cu stickere

### 3.1 Format salvat
Text simplu, fara HTML. Randurile noi sunt `\n`. Marcaje:
- sticker: `[[s:<uuid>]]`
- desen: `[[d:<uuid>]]`

Modul `lib/rich-text/tokens.ts` (functii pure):
- `parseRichText(text) -> Segment[]` cu `Segment = {type:'text', value} | {type:'sticker', id} | {type:'drawing', id}`; regex strict `\[\[(s|d):([0-9a-f-]{36})\]\]` cu uuid validat; orice altceva ramane text.
- `serializeRichText(segments) -> string`
- `visibleLength(text)` = lungimea textului fara marcaje (limitele 500/2000/5000/1000 se aplica doar textului scris).
- `mediaRefs(text) -> {stickers: string[], drawings: string[]}`

### 3.2 Validare pe server (zod, in `lib/validation.ts`)
Campurile `message`, `note` (raspuns), `note` (amintire), `description` (idee) folosesc un `richText(label, max, required)`:
- `visibleLength <= max`; obligatoriu = cel putin un caracter vizibil **sau** un sticker/desen
- maxim 20 de stickere si 3 desene per camp
- lungime totala bruta <= max + 20*42 + 3*42 (protectie)
- dupa zod, serviciul verifica in `media` ca fiecare id exista si are `kind` potrivit; altfel eroare de camp "Un sticker nu mai exista." Stickerele ascunse (`hidden_at`) sunt acceptate.

Migrare: `invitations.response_note` varchar(500) -> text.

### 3.3 Editorul (client)
- Componenta `components/rich-text/RichTextField.tsx`, incarcata dinamic (`next/dynamic`, `ssr:false`) doar pe paginile cu formulare; pana se incarca, un schelet de aceeasi inaltime.
- Biblioteca: **Tiptap** (ProseMirror) minimal: Document, Paragraph, Text, HardBreak, History + doua noduri proprii:
  - `sticker` - inline, atom, `<img>` ~2.5em inaltime
  - `drawing` - inline, atom, afisat pe randul lui (display block), latime max 100%
- Valoarea serializata sta intr-un `<input type="hidden" name="...">`, deci server actions si `FormData` raman la fel. `defaultValue` (si valorile intoarse la eroare) se parseaza inapoi in editor.
- Contor vizual de caractere cand te apropii de limita.
- Lipire: text -> doar text simplu; imagini (clipboard, drag&drop, sticker din tastatura iOS) -> flux "sticker nou" (3.4). HTML lipit nu ajunge niciodata in document.
- Accesibilitate: editorul are `role="textbox"`, `aria-multiline`, eticheta campului; stickerele au `alt="sticker"`, desenele `alt="desen"`.

### 3.4 Sticker nou (din tastatura iOS, Ctrl+V, drag&drop, "Incarca din galerie")
1. client: decodeaza imaginea (inclusiv HEIC pe iPhone, prin `createImageBitmap`/`<img>`), redimensioneaza la <= 512 px, reencodeaza **cu transparenta**: WebP daca browserul il suporta, altfel PNG (niciodata JPEG pentru stickere);
2. upload (server action `uploadStickerAction`) -> server: sesiune, limita pe ora, marime, sniff PNG/WebP, dimensiuni din antet, plafon, sha256 -> daca exista deja un sticker cu aceeasi amprenta, intoarce id-ul existent (si il scoate din `hidden`), altfel insereaza;
3. editorul pune nodul `sticker` la cursor.
In timpul incarcarii, la cursor apare un sticker "fantoma" cu indicator; la eroare dispare si apare mesajul "Nu s-a putut salva stickerul, incearca din nou."; textul ramane neatins.

### 3.5 Panoul "Stickerele noastre"
- Buton **😊 Stickere** sub camp; panou cu grila, cele folosite recent primele (ordinea dupa `created_at` desc in prima versiune), plus **＋ Incarca din galerie**.
- Tap pe sticker -> inserat la cursor; panoul ramane deschis pentru mai multe.
- Apasare lunga / clic dreapta pe un sticker din panou -> "Scoate din colectie" (seteaza `hidden_at`).
- Lista vine dintr-o ruta GET `/api/media/stickers` (doar id, width, height), cu sesiune.

### 3.6 Afisare
Componenta server `components/rich-text/RichText.tsx`: `parseRichText` -> text (React il escapeaza) si `<img src="/api/media/<id>" class="sticker|drawing" alt=... loading="lazy">`. `\n` -> `<br>` / paragrafe ca acum. Folosita in `InvitationDetails` (mesaj, raspuns), `MemoriesSection`, lista de idei si `InvitationExperience` (randurile din experienta 3D, impartite pe `\n` ca acum, fiecare rand randat cu `RichText`).
Imagine care nu se incarca -> placeholder mic "🖼️" (`onError` intr-o componenta client mica).

### 3.7 Ruta `/api/media/[id]`
- sesiune obligatorie (401), id invalid/inexistent -> 404
- headere: `Content-Type` din rand, `Cache-Control: private, max-age=31536000, immutable` (continutul unui id nu se schimba niciodata), `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`, `Content-Security-Policy: default-src 'none'; sandbox`
- `proxy.ts`: aceeasi tratare ca `/api/photos` (CSP stricta).

## 4. Desen

- Buton **🖊️ Desen** sub camp -> `<dialog>` pe tot ecranul cu `<canvas>` alb.
- Pointer Events (deget, Apple Pencil, mouse), `touch-action:none`, pagina nu se misca; liniile netezite (curbe quadratice intre puncte).
- Unelte: 8 culori (roz, baby blue, lila, menta, piersica, galben pal, negru, alb), 3 grosimi, radiera, ↶ anuleaza (stiva de trasee vectoriale, redesenate), 🗑️ sterge tot (cu confirmare).
- **Gata** -> export <= 1200 px (WebP, altfel PNG) -> `uploadDrawingAction` (aceleasi verificari ca stickerul, `kind='drawing'`, fara deduplicare) -> nod `drawing` la cursor.
- **Renunta** cu ceva desenat -> confirmare "Renunti la desen?".
- Logica pura (stiva de trasee, netezire, scalare la export) in `lib/drawing/*.ts`, testata unitar.

### Curatenie desene orfane
La fiecare desen nou, serverul sterge desenele **autorului curent** mai vechi de 24 de ore care nu apar in niciun text (`invitations.message`, `invitations.response_note`, `memories.note`, `ideas.description` cautate cu `LIKE '%[[d:<id>]]%'`). Volumul e mic (doi utilizatori), deci scanarea e ieftina. Fara cron.

## 5. Indicator de spatiu

- Functie `getStorageUsage(db)` -> pentru fiecare treapta: folosit, plafon, procent.
- Afisat discret pe pagina de amintiri / in panoul de stickere; la >= 80% intr-o treapta apare un banner "Spatiul pentru poze se apropie de limita (X%)."; la 100% incarcarile din acea treapta sunt refuzate, restul aplicatiei merge normal.

## 6. Erori

| Situatie | Comportament |
|---|---|
| upload sticker/desen esuat | mesaj in panou/dialog, textul ramane, se poate reincerca |
| plafon atins | mesaj clar ("Spatiul pentru stickere e plin."), restul aplicatiei merge |
| Blob refuza o poza | poza merge in TiDB, log intern, utilizatorul nu observa |
| imagine lipsa la afisare | placeholder "🖼️", textul intact |
| marcaj catre id inexistent la salvare | eroare de camp, formularul pastreaza valorile |
| editorul nu s-a incarcat inca | schelet; trimiterea e blocata pana e gata |

## 7. Securitate
- Toate uploadurile cer sesiune; verificare de marime, sniff magic bytes (PNG/WebP pentru media; JPEG/PNG/WebP pentru poze, ca acum) si dimensiuni din antet.
- Imaginile se servesc doar dupa sesiune, cu `nosniff`, `sandbox`, `inline`.
- Nicio bucata de HTML salvata sau randata din input; marcajele sunt parsate strict, restul e text escapat de React.
- Limita de incarcari pe ora; plafoane de spatiu.
- `data` nu se trimite niciodata in listari sau in props catre client.

## 8. Teste
- **Unitare:** `tokens.ts` (parse/serialize/visibleLength/mediaRefs, marcaje invalide raman text), validarea `richText`, alegerea treptei pentru poze (plafon, fallback la exceptie, ambele pline), plafoane, logica de desen (anulare, netezire, scalare).
- **Integrare (TiDB `dates_test`):** binare identice dupa scriere/citire; `addPhoto` cu Blob fals care arunca -> `storage='db'`; deduplicare sticker; curatenie desene orfane; stergere poza din ambele trepte.
- **E2E (Playwright):** sticker din panou in mesajul invitatiei -> apare pe pagina invitatiei si in experienta 3D; lipire imagine (Ctrl+V) -> sticker nou in colectie; desen -> Gata -> apare in amintire; "Scoate din colectie" -> dispare din panou, ramane in mesaj; ruta `/api/media` fara sesiune -> 401.
- **Manual (utilizatorii, pe iPhone):** sticker din tastatura iOS in fiecare camp; desen cu degetul; pagina nu se misca la desen.

## 9. Ordinea lucrului
0. Terminarea branch-ului `ui/photo-lightbox-mobile-nav` (lightbox + meniu mobil) si PR.
1. **Pagina de test** `/test-stickere` (dupa login, nu salveaza nimic): un editor minimal care afiseaza ce primeste la lipirea unui sticker din tastatura (tipuri MIME, marime, previzualizare). Utilizatorii o incearca pe iPhone pe un deployment de preview. Plus testul de integrare pentru binare in TiDB (2.5). Pagina se sterge dupa.
2. Stocare: migrare (`media`, `photo_data`, coloane noi in `photos`, `response_note` -> text), poze in doua trepte, script de backfill, ruta `/api/media/[id]`.
3. Editorul cu stickere (tokens, validare, RichTextField, panou, afisare).
4. Desenul.
5. Indicatorul de spatiu.

Daca la pasul 1 se vede ca iOS nu trimite stickerul catre pagina, stickerele se adauga doar prin "Incarca din galerie" / lipire, iar restul designului ramane neschimbat.
