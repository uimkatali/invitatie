# Stickere - Plan A: verificari inainte de constructie (spike)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inchidem branch-ul lightbox/meniu, apoi aflam doua lucruri de care depind planurile B-D: (1) cum scrie/citeste driverul `@tidbcloud/serverless` date binare, (2) ce primeste o pagina web pe iPhone (Safari) cand utilizatorul pune un sticker din tastatura, si daca Safari stie sa encodeze WebP din canvas.

**Architecture:** Un test de integrare temporar pe baza `dates_test` (tabel propriu `spike_binary`, creat si sters de test) care incearca patru moduri de a trimite si citi binare. O pagina temporara `/test-stickere` (dupa login, nu salveaza nimic) care inregistreaza evenimentele `beforeinput`/`paste`/`drop`/`input` ale unui camp `contenteditable`, inspecteaza imaginile inserate prin canvas si testeaza decodarea/encodarea unei imagini din galerie; raportul se copiaza si se trimite in chat.

**Tech Stack:** Next.js 16 App Router, React 19, Vitest 5, `@tidbcloud/serverless` 0.3, Playwright.

Spec: `docs/superpowers/specs/2026-10-02-stickers-drawings-photo-storage-design.md` (sectiunile 2.5 si 9).

Planuri urmatoare (scrise dupa rezultatele acestui plan): B - stocare (`media`, poze in doua trepte), C - editor cu stickere, D - desen + indicator de spatiu.

---

## Fisiere

| Fisier | Responsabilitate |
|---|---|
| `e2e/ui.spec.ts` (modificat, liniile 96-99) | test lightbox: zoom suficient inainte de pan cu sageata |
| `lib/db/binary.spike.int.test.ts` (nou, temporar) | patru variante de scriere/citire binare prin driverul HTTP |
| `app/(app)/test-stickere/page.tsx` (nou, temporar) | pagina server, cere sesiune, randeaza sonda |
| `app/(app)/test-stickere/StickerProbe.tsx` (nou, temporar) | componenta client: camp contenteditable, jurnal de evenimente, test galerie, test WebP, raport copiabil |
| `docs/superpowers/specs/2026-10-02-stickers-drawings-photo-storage-design.md` (modificat) | sectiunea "Rezultate spike" cu concluziile |

---

### Task 1: Inchiderea branch-ului lightbox + meniu mobil

Branch: `ui/photo-lightbox-mobile-nav`. Fisierele cu corecturile de review sunt deja in working tree (necomise). Un singur test E2E pica din cauza testului: la scala 1.25 poza 4:3 inca incape in scena de 1280px, deci pan-ul e corect 0.

**Files:**
- Modify: `e2e/ui.spec.ts:96-99`

- [ ] **Step 1: Repara testul**

Inlocuieste liniile 96-99:

```ts
    await page.keyboard.press('+');
    await expect.poll(() => scaleOf(page)).toBe(1.25);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await transformOf(page)).x).toBeGreaterThan(0);
```

cu:

```ts
    await page.keyboard.press('+');
    await expect.poll(() => scaleOf(page)).toBe(1.25);
    // La 1.25 poza inca incape in scena (pan corect 0); marim pana depaseste latimea scenei.
    for (let i = 0; i < 3; i++) await page.keyboard.press('+');
    await expect.poll(() => scaleOf(page)).toBeCloseTo(2.4414, 3);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await transformOf(page)).x).toBeGreaterThan(0);
```

- [ ] **Step 2: Ruleaza testele UI**

Run: `npx playwright test e2e/ui.spec.ts`
Expected: `14 passed`

- [ ] **Step 3: Verificare completa si build**

Run: `npm run verify`
Expected: typecheck fara erori, toate testele Vitest trec, `npm audit` fara vulnerabilitati high.

Run: `npm run build`
Expected: `Compiled successfully`, fara erori de tip.

Run: `npx playwright test`
Expected: toate testele E2E trec.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/invitatii/[id]/PhotoGrid.tsx" app/globals.css components/AppHeader.tsx components/PhotoLightbox.tsx components/nav.ts components/nav.test.ts e2e/ui.spec.ts lib/zoom/pinch-zoom.ts lib/zoom/pinch-zoom.test.ts
git commit -m "fix(ui): address review findings for the lightbox and the mobile menu"
```

(Mesajul se termina cu linia `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nu se adauga `.claude/`.)

- [ ] **Step 5: Intreaba utilizatorul inainte de push**

Push-ul si PR-ul sunt actiuni vizibile in afara: se cere acordul explicit in chat. Dupa "da", utilizatorul ruleaza in PowerShell:

```bash
git push -u origin ui/photo-lightbox-mobile-nav
```

si deschide PR-ul in browser (gh nu e instalat). Merge in `master` = deploy in productie. Utilizatorul verifica pe iPhone lista de verificari manuale (apasare lunga = salvare, pinch, meniu in landscape) inainte de merge.

---

### Task 2: Branch nou pentru stickere

- [ ] **Step 1: Dupa merge-ul PR-ului lightbox, porneste din master actualizat**

```bash
git checkout master
git pull
git checkout -b feat/stickers
```

Daca PR-ul nu e inca facut merge, branch-ul porneste din `ui/photo-lightbox-mobile-nav` (`git checkout -b feat/stickers` de pe el); se rebazeaza pe master dupa merge.

---

### Task 3: Test de integrare pentru binare in TiDB

**Files:**
- Create: `lib/db/binary.spike.int.test.ts`

Testul foloseste direct driverul (`connect` din `@tidbcloud/serverless`), fiindca drizzle doar paseaza parametrii mai departe; asa vedem exact comportamentul driverului. Se salveaza un buffer cu toti octetii 0-255 (prinde orice problema de encodare: octeti nuli, UTF-8 invalid) si unul de 500 KB (marimea maxima a unui desen).

- [ ] **Step 1: Scrie testul**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connect, type Connection } from '@tidbcloud/serverless';
import { hasTestDb } from '@/test/db';

// TEMPORAR (Plan A, spike): afla cum trec datele binare prin driverul HTTP TiDB.
// Se sterge in Plan B, dupa ce concluzia e scrisa in spec (sectiunea "Rezultate spike").

const TABLE = 'spike_binary';

function allBytes(): Uint8Array {
  return Uint8Array.from({ length: 256 }, (_, i) => i);
}

function bigBytes(size = 500 * 1024): Uint8Array {
  const out = new Uint8Array(size);
  for (let i = 0; i < size; i++) out[i] = (i * 31 + 7) % 256;
  return out;
}

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

function describeValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (value instanceof Uint8Array) return `${value.constructor.name}(${value.length})`;
  if (typeof value === 'string') return `string(${value.length}) ${JSON.stringify(value.slice(0, 16))}`;
  return `${typeof value} ${Object.prototype.toString.call(value)}`;
}

/** Normalizeaza ce intoarce driverul pentru o coloana binara, ca sa poata fi comparat. */
function asBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value;
  if (typeof value === 'string') return Uint8Array.from(Buffer.from(value, 'binary'));
  return null;
}

describe.skipIf(!hasTestDb)('spike: binare prin @tidbcloud/serverless', () => {
  let conn: Connection;

  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL as string);
    url.search = '';
    conn = connect({ url: url.toString() });
    await conn.execute(`DROP TABLE IF EXISTS ${TABLE}`);
    await conn.execute(`CREATE TABLE ${TABLE} (id INT PRIMARY KEY, data MEDIUMBLOB NOT NULL)`);
  });

  afterAll(async () => {
    await conn?.execute(`DROP TABLE IF EXISTS ${TABLE}`);
  });

  async function readRaw(id: number): Promise<unknown> {
    const rows = (await conn.execute(`SELECT data FROM ${TABLE} WHERE id = ?`, [id])) as { data: unknown }[];
    return rows[0]?.data;
  }

  async function readHex(id: number): Promise<string> {
    const rows = (await conn.execute(`SELECT HEX(data) AS h FROM ${TABLE} WHERE id = ?`, [id])) as { h: string }[];
    return rows[0].h.toLowerCase();
  }

  async function readBase64(id: number): Promise<Uint8Array> {
    const rows = (await conn.execute(`SELECT TO_BASE64(data) AS b FROM ${TABLE} WHERE id = ?`, [id])) as { b: string }[];
    // TO_BASE64 poate rupe randurile la 76 de caractere; Buffer ignora spatiile albe.
    return Uint8Array.from(Buffer.from(rows[0].b, 'base64'));
  }

  for (const [label, make] of [
    ['toti octetii 0-255', allBytes],
    ['500 KB', bigBytes],
  ] as const) {
    describe(label, () => {
      it('A: parametru Uint8Array, citire directa', async () => {
        const bytes = make();
        await conn.execute(`REPLACE INTO ${TABLE} (id, data) VALUES (?, ?)`, [1, bytes]);
        const raw = await readRaw(1);
        console.log(`[spike A ${label}] tip intors: ${describeValue(raw)}`);
        expect(await readHex(1)).toBe(toHex(bytes));
        expect(asBytes(raw)).toEqual(bytes);
      });

      it('B: parametru Buffer, citire directa', async () => {
        const bytes = make();
        await conn.execute(`REPLACE INTO ${TABLE} (id, data) VALUES (?, ?)`, [2, Buffer.from(bytes)]);
        const raw = await readRaw(2);
        console.log(`[spike B ${label}] tip intors: ${describeValue(raw)}`);
        expect(await readHex(2)).toBe(toHex(bytes));
        expect(asBytes(raw)).toEqual(bytes);
      });

      it('C: UNHEX(?) la scriere, HEX() la citire', async () => {
        const bytes = make();
        await conn.execute(`REPLACE INTO ${TABLE} (id, data) VALUES (?, UNHEX(?))`, [3, toHex(bytes)]);
        expect(await readHex(3)).toBe(toHex(bytes));
      });

      it('D: FROM_BASE64(?) la scriere, TO_BASE64() la citire', async () => {
        const bytes = make();
        await conn.execute(`REPLACE INTO ${TABLE} (id, data) VALUES (?, FROM_BASE64(?))`, [
          4,
          Buffer.from(bytes).toString('base64'),
        ]);
        expect(await readBase64(4)).toEqual(bytes);
      });
    });
  }
});
```

- [ ] **Step 2: Ruleaza testul**

Run: `npx vitest run lib/db/binary.spike.int.test.ts --reporter=verbose`
Expected: rezultatul nu e cunoscut dinainte (asta e scopul). Variantele C si D ar trebui sa treaca (folosesc doar text). Noteaza pentru fiecare varianta PASS/FAIL si liniile `[spike ...] tip intors: ...` din consola.

Daca `npx vitest` raporteaza testul ca "skipped": lipseste `TEST_DATABASE_URL` in `.env.test.local` - se opreste si se anunta utilizatorul (nu se creeaza alt fisier de env).

- [ ] **Step 3: Scrie concluzia in spec**

Adauga la finalul sectiunii 2.5 din `docs/superpowers/specs/2026-10-02-stickers-drawings-photo-storage-design.md`:

```markdown
#### Rezultate spike (2026-10-02)
| Varianta | 256 octeti | 500 KB | Tip intors la citire directa |
|---|---|---|---|
| A Uint8Array | <PASS/FAIL> | <PASS/FAIL> | <din consola> |
| B Buffer | <PASS/FAIL> | <PASS/FAIL> | <din consola> |
| C UNHEX/HEX | <PASS/FAIL> | <PASS/FAIL> | - |
| D FROM_BASE64/TO_BASE64 | <PASS/FAIL> | <PASS/FAIL> | - |

Concluzie: Plan B foloseste varianta <litera> (prima varianta care trece la ambele marimi, in ordinea A, B, D, C; D inaintea lui C fiindca base64 e cu ~33% mai mic decat hex pe fir).
```

Valorile intre `< >` se completeaza cu rezultatele reale din Step 2 (acesta e singurul loc din plan unde datele vin din rulare).

- [ ] **Step 4: Commit**

```bash
git add lib/db/binary.spike.int.test.ts docs/superpowers/specs/2026-10-02-stickers-drawings-photo-storage-design.md
git commit -m "test(spike): probe binary round-trips through the TiDB serverless driver"
```

---

### Task 4: Pagina de test `/test-stickere`

**Files:**
- Create: `app/(app)/test-stickere/page.tsx`
- Create: `app/(app)/test-stickere/StickerProbe.tsx`

Pagina e sub `(app)`, deci layout-ul cere deja sesiune; `requireSession()` e pus si explicit. Nu e legata in meniu. Nu trimite nimic la server. CSP-ul permite deja `img-src blob: data:`; nu se foloseste `fetch` pe URL-uri `blob:` (CSP `connect-src 'self'` le-ar bloca), imaginile se masoara prin canvas.

- [ ] **Step 1: Pagina server**

```tsx
import { requireSession } from '@/lib/auth/require-session';
import StickerProbe from './StickerProbe';

// TEMPORAR (Plan A, spike): se sterge in Plan C, dupa ce stim ce trimite tastatura iPhone.
export default async function StickerTestPage() {
  await requireSession();
  return (
    <div className="stack">
      <h1>Test stickere</h1>
      <p className="muted">
        Pagina de test. Nu salveaza nimic. Pune un sticker din tastatura in casuta de mai jos, apoi apasa
        &quot;Copiaza raportul&quot; si trimite-l in chat.
      </p>
      <StickerProbe />
    </div>
  );
}
```

- [ ] **Step 2: Componenta client**

```tsx
'use client';

import { useRef, useState, type ChangeEvent } from 'react';

interface Entry {
  at: string;
  text: string;
}

function describeFiles(list: FileList | null | undefined): string {
  if (!list || list.length === 0) return 'fara fisiere';
  return [...list].map((f) => `${f.type || '(tip gol)'} ${f.size} B "${f.name}"`).join('; ');
}

function describeTransfer(dt: DataTransfer | null | undefined): string {
  if (!dt) return 'fara dataTransfer';
  const types = [...dt.types].join(', ') || '(niciun tip)';
  const items = [...dt.items].map((item) => `${item.kind}:${item.type || '?'}`).join(', ') || '(niciun item)';
  return `tipuri [${types}] items [${items}] fisiere [${describeFiles(dt.files)}]`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.9));
}

/** Masoara o imagine prin canvas: marime, transparenta in colturi, marime ca PNG. */
async function inspectImage(img: HTMLImageElement): Promise<string> {
  const src = img.currentSrc || img.src;
  const scheme = src.slice(0, src.indexOf(':') + 1) || '(fara schema)';
  if (!img.complete) await new Promise((resolve) => img.addEventListener('load', resolve, { once: true }));
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return `img ${scheme} ${w}x${h}, canvas indisponibil`;
    ctx.drawImage(img, 0, 0);
    const corners = [
      [0, 0],
      [w - 1, 0],
      [0, h - 1],
      [w - 1, h - 1],
    ].map(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3]);
    const png = await canvasToBlob(canvas, 'image/png');
    return `img ${scheme} ${w}x${h}, alpha colturi [${corners.join(',')}], png ${png?.size ?? '?'} B`;
  } catch (err) {
    return `img ${scheme} ${w}x${h}, canvas a esuat: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export default function StickerProbe() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const seen = useRef(new WeakSet<HTMLImageElement>());

  function add(text: string) {
    const at = new Date().toISOString().slice(11, 23);
    setEntries((list) => [...list, { at, text }]);
  }

  async function scanImages() {
    const imgs = editorRef.current?.querySelectorAll('img') ?? [];
    for (const img of imgs) {
      if (seen.current.has(img)) continue;
      seen.current.add(img);
      add(`imagine noua in camp: ${await inspectImage(img)}`);
    }
  }

  async function onGalleryFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    add(`galerie: ${file.type || '(tip gol)'} ${file.size} B "${file.name}"`);
    try {
      const bitmap = await createImageBitmap(file);
      add(`galerie: createImageBitmap OK ${bitmap.width}x${bitmap.height}`);
      bitmap.close();
    } catch (err) {
      add(`galerie: createImageBitmap a esuat: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function testWebp() {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(255, 0, 128, 0.5)';
      ctx.fillRect(0, 0, 2, 2);
    }
    const blob = await canvasToBlob(canvas, 'image/webp');
    add(`webp: toBlob('image/webp') a intors ${blob ? `${blob.type} ${blob.size} B` : 'null'}`);
  }

  function report(): string {
    const header = [`userAgent: ${navigator.userAgent}`, `touch: ${navigator.maxTouchPoints}`];
    return [...header, ...entries.map((entry) => `${entry.at} ${entry.text}`)].join('\n');
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report());
      setCopied(true);
    } catch {
      setCopied(false);
      add('copiere: clipboard indisponibil, selecteaza textul din casuta de raport');
    }
  }

  return (
    <div className="stack">
      <div className="card stack">
        <label htmlFor="probe-editor" className="eyebrow">
          Casuta de test (scrie si pune stickere aici)
        </label>
        <div
          id="probe-editor"
          ref={editorRef}
          className="probe-editor"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          style={{ minHeight: 120, padding: 12, border: '1px solid #e3c6d6', borderRadius: 12, background: '#fff' }}
          onBeforeInput={(event) => {
            const native = event.nativeEvent as InputEvent;
            add(`beforeinput: ${native.inputType} data=${JSON.stringify(native.data)} ${describeTransfer(native.dataTransfer)}`);
          }}
          onPaste={(event) => add(`paste: ${describeTransfer(event.clipboardData)}`)}
          onDrop={(event) => add(`drop: ${describeTransfer(event.dataTransfer)}`)}
          onInput={(event) => {
            const native = event.nativeEvent as InputEvent;
            add(`input: ${native.inputType ?? '?'} html=${JSON.stringify(event.currentTarget.innerHTML.slice(0, 200))}`);
            void scanImages();
          }}
        />
        <div className="row">
          <label className="btn">
            Alege o imagine din galerie
            <input type="file" accept="image/*" hidden onChange={onGalleryFile} />
          </label>
          <button type="button" className="btn" onClick={testWebp}>
            Test WebP
          </button>
          <button type="button" className="btn" onClick={() => setEntries([])}>
            Goleste jurnalul
          </button>
        </div>
      </div>

      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Raport</h2>
          <button type="button" className="btn btn-primary" onClick={copyReport}>
            {copied ? 'Copiat!' : 'Copiaza raportul'}
          </button>
        </div>
        <textarea readOnly value={report()} rows={12} aria-label="Raport" style={{ width: '100%', fontSize: 12 }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck si build**

Run: `npm run typecheck`
Expected: fara erori.

Run: `npm run build`
Expected: `Compiled successfully`; ruta `/test-stickere` apare in lista de rute ca dinamica.

- [ ] **Step 4: Verificare locala in browser (Chrome pe PC)**

Run: `npm run dev`, login, deschide `http://localhost:3000/test-stickere`.
- copiaza o imagine (ex. clic dreapta pe o poza -> Copy image) si apasa Ctrl+V in casuta -> in jurnal apar linii `beforeinput`/`paste` cu `items [file:image/png]` si (daca Chrome o insereaza) `imagine noua in camp: ...`;
- "Test WebP" -> `webp: toBlob('image/webp') a intors image/webp ...`;
- "Copiaza raportul" -> butonul devine "Copiat!".
Aceste rezultate de pe PC se adauga in raportul final langa cele de pe iPhone.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/test-stickere/page.tsx" "app/(app)/test-stickere/StickerProbe.tsx"
git commit -m "feat(spike): temporary sticker probe page for the iPhone keyboard"
```

---

### Task 5: Testul pe iPhone (facut de utilizatori)

- [ ] **Step 1: Cere acordul pentru push**

Se cere acordul explicit in chat pentru `git push -u origin feat/stickers`. Push-ul creeaza un deployment de **Preview** pe Vercel (nu atinge productia). Dupa "da", utilizatorul ruleaza comanda in PowerShell.

- [ ] **Step 2: Ghid pentru utilizator (in romana, pas cu pas)**

1. Vercel -> proiect -> Deployments -> ultimul deployment cu branch-ul `feat/stickers` -> butonul "Visit" -> copiaza adresa.
2. Deschide adresa pe iPhone in Safari (daca Vercel cere login, te loghezi in contul Vercel; e protectia deployment-urilor de preview).
3. Login in aplicatie, apoi adauga la adresa `/test-stickere`.
4. Atinge casuta, deschide tastatura emoji, mergi la stickere (iconita cu sticker, langa emoji) si pune 1-2 stickere. Pune si un sticker facut de voi din poza (Live Sticker), daca aveti.
5. Apasa "Alege o imagine din galerie" si alege o poza (HEIC).
6. Apasa "Test WebP".
7. Apasa "Copiaza raportul" si lipeste-l in chat (pe iPhone: tine apasat in chat -> Lipeste).

- [ ] **Step 3: Scrie concluzia in spec**

Adauga in `docs/superpowers/specs/2026-10-02-stickers-drawings-photo-storage-design.md`, dupa sectiunea 3.4:

```markdown
#### Rezultate spike iPhone (2026-10-02)
- iOS <versiune din userAgent>: stickerul din tastatura ajunge ca <eveniment + tip: ex. "beforeinput insertFromPaste cu file:image/png" / "img blob: inserat in DOM" / "nimic">
- transparenta pastrata: <da/nu, din "alpha colturi">
- HEIC din galerie: createImageBitmap <OK/esuat>
- WebP din canvas pe Safari: <image/webp / image/png / null>
- Chrome pe PC (Ctrl+V): <rezumat>
Concluzie pentru Plan C: <cum prinde editorul stickerul; formatul de encodare: WebP daca Safari il suporta, altfel PNG>
```

Valorile intre `< >` vin din raportul trimis de utilizatori.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-10-02-stickers-drawings-photo-storage-design.md
git commit -m "docs(spec): record iPhone sticker keyboard spike results"
```

Dupa acest task se scriu planurile B (stocare) si C (editor), folosind concluziile.
