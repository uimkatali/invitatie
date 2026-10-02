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
  if (value instanceof Uint8Array) return Uint8Array.from(value);
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
        let t = performance.now();
        await conn.execute(`REPLACE INTO ${TABLE} (id, data) VALUES (?, ?)`, [1, bytes]);
        const writeMs = performance.now() - t;
        t = performance.now();
        const raw = await readRaw(1);
        const readMs = performance.now() - t;
        t = performance.now();
        await readHex(1);
        const hexMs = performance.now() - t;
        t = performance.now();
        await readBase64(1);
        const b64Ms = performance.now() - t;
        console.log(
          `[spike A ${label}] tip intors: ${describeValue(raw)}; scriere ${writeMs.toFixed(0)} ms, ` +
            `citire directa ${readMs.toFixed(0)} ms, HEX ${hexMs.toFixed(0)} ms, TO_BASE64 ${b64Ms.toFixed(0)} ms`,
        );
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
        const t = performance.now();
        await conn.execute(`REPLACE INTO ${TABLE} (id, data) VALUES (?, UNHEX(?))`, [3, toHex(bytes)]);
        console.log(`[spike C ${label}] scriere ${(performance.now() - t).toFixed(0)} ms`);
        expect(await readHex(3)).toBe(toHex(bytes));
      });

      it('D: FROM_BASE64(?) la scriere, TO_BASE64() la citire', async () => {
        const bytes = make();
        const t = performance.now();
        await conn.execute(`REPLACE INTO ${TABLE} (id, data) VALUES (?, FROM_BASE64(?))`, [
          4,
          Buffer.from(bytes).toString('base64'),
        ]);
        console.log(`[spike D ${label}] scriere ${(performance.now() - t).toFixed(0)} ms`);
        expect(await readBase64(4)).toEqual(bytes);
      });
    });
  }

  it('D + citire directa la 4 MB (marimea maxima a unei poze)', async () => {
    const bytes = bigBytes(4 * 1024 * 1024);
    let t = performance.now();
    await conn.execute(`REPLACE INTO ${TABLE} (id, data) VALUES (?, FROM_BASE64(?))`, [
      5,
      Buffer.from(bytes).toString('base64'),
    ]);
    const writeMs = performance.now() - t;
    t = performance.now();
    const raw = await readRaw(5);
    const readMs = performance.now() - t;
    console.log(`[spike D 4 MB] scriere ${writeMs.toFixed(0)} ms, citire directa ${readMs.toFixed(0)} ms, ${describeValue(raw)}`);
    expect(Buffer.from(raw as Uint8Array).equals(Buffer.from(bytes))).toBe(true);
  });
});
