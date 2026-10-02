'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';

const noSubscribe = () => () => {};
// Pe server nu exista browser: antetul raportului apare doar dupa hidratare, fara nepotrivire.
const deviceInfo = () => `userAgent: ${navigator.userAgent}\ntouch: ${navigator.maxTouchPoints}`;
const serverDeviceInfo = () => '';

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

  // onBeforeInput din React e un eveniment sintetic (textInput), nu `beforeinput` nativ: pe acesta il trimite
  // tastatura iOS cand insereaza un sticker, deci il ascultam direct pe element.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const onNativeBeforeInput = (event: InputEvent) => {
      const at = new Date().toISOString().slice(11, 23);
      const text = `beforeinput: ${event.inputType} data=${JSON.stringify(event.data)} ${describeTransfer(event.dataTransfer)}`;
      setEntries((list) => [...list, { at, text }]);
    };
    editor.addEventListener('beforeinput', onNativeBeforeInput);
    return () => editor.removeEventListener('beforeinput', onNativeBeforeInput);
  }, []);

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

  const device = useSyncExternalStore(noSubscribe, deviceInfo, serverDeviceInfo);

  function report(): string {
    return [device, ...entries.map((entry) => `${entry.at} ${entry.text}`)].join('\n');
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
        {/* <label for> nu eticheteaza un div contenteditable; aria-labelledby da numele campului. */}
        <span id="probe-editor-label" className="eyebrow">
          Casuta de test (scrie si pune stickere aici)
        </span>
        <div
          id="probe-editor"
          ref={editorRef}
          className="probe-editor"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-labelledby="probe-editor-label"
          style={{ minHeight: 120, padding: 12, border: '1px solid #e3c6d6', borderRadius: 12, background: '#fff' }}
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
