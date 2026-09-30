# Faza 1: Fundatie - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Nota (actualizare ulterioara):** stratul de email din acest plan (Resend) a fost inlocuit cu Gmail SMTP prin `nodemailer`, pentru ca sandbox-ul Resend trimite doar la proprietarul contului. Codul din repo (`lib/notifications/email.ts`, `lib/env.ts`, `SETUP.md`) este sursa de adevar; blocurile de cod despre email de mai jos sunt istorice si nu se mai aplica. Vezi abaterea 10 din `2026-09-28-date-manager-00-overview.md`.

**Goal:** Stergerea aplicatiei vechi si punerea fundatiei: env validat, schema TiDB + migrari, login / logout cu rate limit, CSP + headere de securitate, layout de baza.

**Architecture:** Constante de domeniu in `lib/domain.ts` (fara dependente), schema Drizzle in `lib/db/schema.ts`, client HTTP TiDB in `lib/db/client.ts`. Auth impartit in functii pure (`password`, `credentials`, `session`, `rate-limit`) + un strat subtire server (`require-session`). `proxy.ts` genereaza nonce CSP si blocheaza rutele fara sesiune.

**Tech Stack:** Next.js 16, React 19, TypeScript, drizzle-orm, @tidbcloud/serverless, drizzle-kit, mysql2 (dev), zod 4, bcryptjs, jose, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-28-date-manager-design.md` (sectiunile 2-7, 10). Citeste si `2026-09-28-date-manager-00-overview.md` pentru abaterile decise.

---

## File map (Faza 1)

| Fisier | Responsabilitate |
|---|---|
| `package.json` | dependente + scripturi |
| `vitest.config.ts` | alias `@`, incarcare env, global setup DB |
| `.env.local.example`, `.env.test.local.example` | sabloane env |
| `next.config.js` | headere statice de securitate, `poweredByHeader: false` |
| `drizzle.config.ts` | config drizzle-kit |
| `lib/domain.ts` | useri, teme, statusuri, tipuri notificari, limite |
| `lib/ids.ts` | generare / validare UUID |
| `lib/result.ts` | tipurile `Result` (servicii) si `ActionState` (formulare) |
| `lib/form.ts` | citire sigura a campurilor din `FormData` + erori zod pe camp |
| `lib/log.ts` | log JSON structurat |
| `lib/env.ts` | validare env cu zod |
| `lib/db/schema.ts` | tabelele |
| `lib/db/client.ts` | client Drizzle peste TiDB serverless |
| `drizzle/*.sql` | migrari generate |
| `test/db.ts`, `test/global-setup.ts` | harness pentru testele de integrare |
| `lib/auth/password.ts` | bcrypt hash / verify |
| `lib/auth/credentials.ts` | autentificare user + parola, timp constant pe user inexistent |
| `lib/auth/session.ts` | semnare / verificare JWT |
| `lib/auth/rate-limit.ts` | logica pura + persistenta rate limit |
| `lib/auth/client-ip.ts` | IP-ul clientului din headere |
| `lib/auth/require-session.ts` | `getSessionUser()`, `requireSession()` |
| `lib/auth/display-names.ts` | numele afisate din env |
| `lib/security/csp.ts` | construire CSP |
| `proxy.ts` | nonce + CSP + redirect fara sesiune |
| `scripts/hash-password.mjs`, `scripts/gen-secret.mjs` | utilitare setup |
| `app/layout.tsx`, `app/globals.css` | root layout, fonturi, stiluri |
| `app/error.tsx`, `app/not-found.tsx` | pagini de eroare |
| `app/(auth)/login/page.tsx`, `app/(auth)/login/LoginForm.tsx`, `app/(auth)/actions.ts` | login / logout |
| `app/(app)/layout.tsx`, `app/(app)/page.tsx`, `components/AppHeader.tsx`, `components/SkyBackground.tsx` | shell aplicatie |
| `components/ui/Field.tsx`, `components/ui/SubmitButton.tsx` | componente de formular |

---

### Task 1: Stergerea aplicatiei vechi si dependentele noi

**Files:**
- Delete: `content.json`, `lib/content.ts`, `lib/auth.ts`, `lib/auth.test.ts`, `lib/edge-config.ts`, `lib/edge-config.test.ts`, `lib/reveal.ts`, `lib/reveal.test.ts`, `lib/selections.ts`, `lib/selections.test.ts`, `lib/themes.ts`, `lib/themes.test.ts`, `components/LoginGate.tsx`, `components/SelectionsForm.tsx`, `components/OptionIcon.tsx`, `components/HomeClient.tsx`, `components/ParticleScene.tsx`, `components/RevealMessage.tsx`, `app/tema/`, `app/api/`, `app/page.tsx`, `app/error.tsx`, `email/`, `scripts/build-email.mjs`, `scripts/build-email.test.mjs`
- Keep: `lib/countdown.ts`, `lib/countdown.test.ts`, `components/Countdown.tsx`
- Modify: `package.json`, `vitest.config.ts`, `.env.local.example`, `next.config.js`
- Create: `.env.test.local.example`

- [ ] **Step 1: Sterge fisierele vechi**

```bash
git rm -r -q content.json lib/content.ts lib/auth.ts lib/auth.test.ts lib/edge-config.ts lib/edge-config.test.ts lib/reveal.ts lib/reveal.test.ts lib/selections.ts lib/selections.test.ts lib/themes.ts lib/themes.test.ts components/LoginGate.tsx components/SelectionsForm.tsx components/OptionIcon.tsx components/HomeClient.tsx components/ParticleScene.tsx components/RevealMessage.tsx app/tema app/api app/page.tsx app/error.tsx email scripts/build-email.mjs scripts/build-email.test.mjs
```

Daca exista in `public/` asset-uri folosite doar de aplicatia veche (modele `.glb`, iconite mascote), sterge-le si pe ele: `git ls-files public` ca sa le vezi, apoi `git rm` pe cele nefolosite.

- [ ] **Step 2: Scoate dependenta veche, instaleaza cele noi**

```bash
npm uninstall @vercel/edge-config
npm install drizzle-orm @tidbcloud/serverless zod bcryptjs jose @vercel/blob
npm install -D drizzle-kit mysql2 @playwright/test
```

Expected: fara erori; `package.json` contine noile pachete. (`resend`, `three`, `@react-three/*`, `next`, `react` raman.)

- [ ] **Step 3: Rescrie sectiunea `scripts` din `package.json`**

Inlocuieste obiectul `"scripts"` cu:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit",
    "verify": "npm run typecheck && npm run test && npm audit --audit-level=high",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "hash-password": "node scripts/hash-password.mjs",
    "gen-secret": "node scripts/gen-secret.mjs"
  },
```

Si schimba `"description": ""` in `"description": "Manager de dateuri pentru doi"`.

- [ ] **Step 4: Rescrie `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { loadEnvConfig } from '@next/env';

// Vitest ruleaza cu NODE_ENV=test, deci Next incarca .env.test.local (nu .env.local).
loadEnvConfig(process.cwd());

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**'],
    globalSetup: ['./test/global-setup.ts'],
    // Testele de integrare impart aceeasi baza de test.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
```

- [ ] **Step 5: Rescrie `.env.local.example`**

```
# Connection string TiDB (vezi SETUP.md)
DATABASE_URL=mysql://USER:PAROLA@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/dates?ssl={"rejectUnauthorized":true}

# Genereaza cu: npm run gen-secret
SESSION_SECRET=

# Username-uri de login si hash-uri generate cu: npm run hash-password
USER_EL_NAME=
USER_EL_PASSWORD_HASH=
USER_EA_NAME=
USER_EA_PASSWORD_HASH=

# Emailul contului Resend (sandbox-ul trimite doar aici)
EMAIL_EL=
# Nefolosit acum; se activeaza cand exista domeniu verificat in Resend
EMAIL_EA=

RESEND_API_KEY=

# Generat automat de Vercel cand conectezi Blob store-ul
BLOB_READ_WRITE_TOKEN=

# Optional: URL-ul public al aplicatiei (pentru linkurile din email)
APP_URL=
```

- [ ] **Step 6: Creeaza `.env.test.local.example`**

```
# Baza separata pentru teste (NU baza reala). Vezi SETUP.md, pasul "Baza de test".
TEST_DATABASE_URL=mysql://USER:PAROLA@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/dates_test?ssl={"rejectUnauthorized":true}
```

- [ ] **Step 7: Rescrie `next.config.js` cu headerele statice**

```js
const isProd = process.env.NODE_ENV === 'production';

// CSP-ul are nevoie de nonce per request, deci e setat in proxy.ts.
// Aici sunt headerele care nu depind de request.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'same-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
```

- [ ] **Step 8: Verifica ca testul pastrat inca trece**

Creeaza temporar `test/global-setup.ts` gol ca sa nu pice config-ul:

```ts
export default async function setup() {}
```

Run: `npx vitest run lib/countdown.test.ts`
Expected: PASS, 5 teste.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: remove old invitation app, add date manager dependencies"
```

---

### Task 2: Constante de domeniu, ID-uri, Result, log

**Files:**
- Create: `lib/domain.ts`, `lib/ids.ts`, `lib/result.ts`, `lib/log.ts`
- Test: `lib/domain.test.ts`, `lib/ids.test.ts`, `lib/result.test.ts`

- [ ] **Step 1: Scrie testele**

`lib/domain.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isUserId, otherUser, THEMES, THEME_LABELS } from './domain';

describe('otherUser', () => {
  it('returns the other person', () => {
    expect(otherUser('el')).toBe('ea');
    expect(otherUser('ea')).toBe('el');
  });
});

describe('isUserId', () => {
  it('accepts only el and ea', () => {
    expect(isUserId('el')).toBe(true);
    expect(isUserId('ea')).toBe(true);
    expect(isUserId('admin')).toBe(false);
    expect(isUserId(undefined)).toBe(false);
  });
});

describe('THEME_LABELS', () => {
  it('has a label for every theme', () => {
    for (const theme of THEMES) expect(THEME_LABELS[theme]).toBeTruthy();
  });
});
```

`lib/ids.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { newId, isUuid } from './ids';

describe('ids', () => {
  it('generates valid uuids', () => {
    const id = newId();
    expect(isUuid(id)).toBe(true);
    expect(newId()).not.toBe(id);
  });

  it('rejects non-uuids', () => {
    expect(isUuid('123')).toBe(false);
    expect(isUuid("1' OR '1'='1")).toBe(false);
    expect(isUuid('')).toBe(false);
  });
});
```

`lib/result.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ok, failure, toActionState } from './result';

describe('toActionState', () => {
  it('maps ok to ok state with message', () => {
    expect(toActionState(ok(1), 'Gata')).toEqual({ ok: true, message: 'Gata' });
  });

  it('maps failure without the internal code', () => {
    const state = toActionState(failure('invalid', 'Gresit', { title: 'Obligatoriu' }));
    expect(state).toEqual({ ok: false, error: 'Gresit', fields: { title: 'Obligatoriu' } });
  });
});
```

- [ ] **Step 2: Ruleaza testele, verifica ca pica**

Run: `npx vitest run lib/domain.test.ts lib/ids.test.ts lib/result.test.ts`
Expected: FAIL (module inexistente).

- [ ] **Step 3: Implementeaza**

`lib/domain.ts`:

```ts
export const USERS = ['el', 'ea'] as const;
export type UserId = (typeof USERS)[number];

export function isUserId(value: unknown): value is UserId {
  return value === 'el' || value === 'ea';
}

export function otherUser(user: UserId): UserId {
  return user === 'el' ? 'ea' : 'el';
}

export const THEMES = ['toamna', 'iarna', 'amandoua'] as const;
export type ThemeId = (typeof THEMES)[number];

export const THEME_LABELS: Record<ThemeId, string> = {
  toamna: 'Toamna roz',
  iarna: 'Iarna baby blue',
  amandoua: 'Amandoua',
};

export const INVITATION_STATUSES = ['pending', 'accepted', 'declined', 'reschedule', 'cancelled'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: 'In asteptare',
  accepted: 'Acceptata',
  declined: 'Refuzata',
  reschedule: 'Alta ora propusa',
  cancelled: 'Anulata',
};

export const NOTIFICATION_TYPES = [
  'invite_new',
  'invite_response',
  'reschedule_accepted',
  'invite_cancelled',
  'memory_added',
  'idea_added',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const LIMITS = {
  titleMax: 120,
  messageMax: 2000,
  locationMax: 200,
  dressCodeMax: 120,
  responseNoteMax: 500,
  memoryNoteMax: 5000,
  ideaTitleMax: 120,
  ideaDescriptionMax: 1000,
  photosPerMemory: 10,
  maxIdeas: 50,
  photoMaxBytes: 4 * 1024 * 1024,
} as const;
```

`lib/ids.ts`:

```ts
import { randomUUID } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function newId(): string {
  return randomUUID();
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
```

`lib/result.ts`:

```ts
export type FailureCode = 'invalid' | 'not_found' | 'forbidden';

export interface Failure {
  ok: false;
  code: FailureCode;
  error: string;
  fields?: Record<string, string>;
}

export type Result<T = void> = { ok: true; value: T } | Failure;

/** Starea intoarsa de Server Actions catre formulare (useActionState). */
export type ActionState =
  | null
  | { ok: true; message?: string }
  | { ok: false; error: string; fields?: Record<string, string>; values?: Record<string, string> };

export const GENERIC_ERROR = 'Ceva n-a mers, incearca din nou.';

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function failure(code: FailureCode, error: string, fields?: Record<string, string>): Failure {
  return fields ? { ok: false, code, error, fields } : { ok: false, code, error };
}

export function toActionState(result: Result<unknown>, successMessage?: string): ActionState {
  if (result.ok) return successMessage ? { ok: true, message: successMessage } : { ok: true };
  return result.fields
    ? { ok: false, error: result.error, fields: result.fields }
    : { ok: false, error: result.error };
}
```

`lib/log.ts`:

```ts
type Level = 'info' | 'warn' | 'error';

/**
 * Log JSON pe stdout (apare in Vercel Logs).
 * Nu trimite aici parole, token-uri, hash-uri sau continutul mesajelor.
 */
export function log(level: Level, event: string, data: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...data });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function errorName(err: unknown): string {
  return err instanceof Error ? err.name : 'UnknownError';
}
```

- [ ] **Step 4: Ruleaza testele**

Run: `npx vitest run lib/domain.test.ts lib/ids.test.ts lib/result.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/domain.ts lib/ids.ts lib/result.ts lib/log.ts lib/domain.test.ts lib/ids.test.ts lib/result.test.ts
git commit -m "feat: add domain constants, ids, result types and logger"
```

---

### Task 3: Validarea env

**Files:**
- Create: `lib/env.ts`
- Test: `lib/env.test.ts`

- [ ] **Step 1: Scrie testul**

```ts
import { describe, it, expect } from 'vitest';
import { parseEnv } from './env';

const FAKE_HASH = '$2b$12$' + 'a'.repeat(53);
const b64 = (s: string) => Buffer.from(s).toString('base64');

const valid = {
  DATABASE_URL: 'mysql://u:p@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/dates',
  SESSION_SECRET: 'x'.repeat(32),
  USER_EL_NAME: 'catalin',
  USER_EL_PASSWORD_HASH: b64(FAKE_HASH),
  USER_EA_NAME: 'iubita',
  USER_EA_PASSWORD_HASH: b64(FAKE_HASH),
  EMAIL_EL: 'el@example.com',
  EMAIL_EA: '',
  RESEND_API_KEY: 're_123',
  BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_123',
};

describe('parseEnv', () => {
  it('accepts a complete env and decodes the base64 hashes', () => {
    const env = parseEnv(valid);
    expect(env.USER_EL_PASSWORD_HASH).toBe(FAKE_HASH);
    expect(env.EMAIL_EA).toBeNull();
  });

  it('rejects a short session secret and names the variable', () => {
    expect(() => parseEnv({ ...valid, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
  });

  it('rejects a hash that is not base64 bcrypt', () => {
    expect(() => parseEnv({ ...valid, USER_EA_PASSWORD_HASH: FAKE_HASH })).toThrow(/USER_EA_PASSWORD_HASH/);
  });

  it('rejects identical usernames', () => {
    expect(() => parseEnv({ ...valid, USER_EA_NAME: 'CATALIN' })).toThrow(/USER_EA_NAME/);
  });

  it('lists every missing variable', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL.*SESSION_SECRET/s);
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/env.test.ts`
Expected: FAIL (modul inexistent).

- [ ] **Step 3: Implementeaza `lib/env.ts`**

```ts
import { z } from 'zod';

const BCRYPT_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

const bcryptHashBase64 = z.string().min(1).transform((value, ctx) => {
  const decoded = Buffer.from(value, 'base64').toString('utf8');
  if (!BCRYPT_RE.test(decoded)) {
    ctx.addIssue({ code: 'custom', message: 'trebuie generat cu npm run hash-password' });
    return z.NEVER;
  }
  return decoded;
});

const schema = z
  .object({
    DATABASE_URL: z.string().startsWith('mysql://'),
    SESSION_SECRET: z.string().min(32),
    USER_EL_NAME: z.string().trim().min(1).max(100),
    USER_EL_PASSWORD_HASH: bcryptHashBase64,
    USER_EA_NAME: z.string().trim().min(1).max(100),
    USER_EA_PASSWORD_HASH: bcryptHashBase64,
    EMAIL_EL: z.email(),
    EMAIL_EA: z
      .union([z.literal(''), z.email()])
      .optional()
      .transform((v) => (v ? v : null)),
    RESEND_API_KEY: z.string().min(1),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
  })
  .superRefine((env, ctx) => {
    if (env.USER_EL_NAME.toLowerCase() === env.USER_EA_NAME.toLowerCase()) {
      ctx.addIssue({ code: 'custom', path: ['USER_EA_NAME'], message: 'trebuie sa difere de USER_EL_NAME' });
    }
  });

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')} (${i.message})`).join(', ');
    throw new Error(`Variabile de mediu lipsa sau invalide: ${problems}`);
  }
  return result.data;
}

let cached: Env | null = null;

/** Env validat, citit o singura data. Arunca eroare clara daca lipseste ceva (fail closed). */
export function env(): Env {
  if (!cached) cached = parseEnv(process.env);
  return cached;
}
```

- [ ] **Step 4: Ruleaza testul**

Run: `npx vitest run lib/env.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/env.ts lib/env.test.ts
git commit -m "feat: validate environment variables with zod"
```

---

### Task 4: Schema DB, client si prima migrare

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/client.ts`, `drizzle.config.ts`, `drizzle/0000_init.sql` (generat)

- [ ] **Step 1: Scrie `lib/db/schema.ts`**

```ts
import {
  mysqlTable,
  mysqlEnum,
  varchar,
  text,
  datetime,
  tinyint,
  int,
  index,
  uniqueIndex,
  customType,
} from 'drizzle-orm/mysql-core';
import { USERS, THEMES, INVITATION_STATUSES, NOTIFICATION_TYPES } from '../domain';

// ID-uri ascii: de 4 ori mai mici in index decat utf8mb4.
const uuid = customType<{ data: string }>({
  dataType() {
    return 'char(36) CHARACTER SET ascii COLLATE ascii_bin';
  },
});

const sha256Hex = customType<{ data: string }>({
  dataType() {
    return 'char(64) CHARACTER SET ascii COLLATE ascii_bin';
  },
});

const userColumn = (name: string) => mysqlEnum(name, USERS);
const utc = (name: string) => datetime(name, { mode: 'date' });

export const ideas = mysqlTable(
  'ideas',
  {
    id: uuid('id').primaryKey(),
    author: userColumn('author').notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    description: text('description'),
    createdAt: utc('created_at').notNull(),
  },
  (t) => [index('idx_created').on(t.createdAt)],
);

export const invitations = mysqlTable(
  'invitations',
  {
    id: uuid('id').primaryKey(),
    fromUser: userColumn('from_user').notNull(),
    toUser: userColumn('to_user').notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    message: text('message').notNull(),
    location: varchar('location', { length: 200 }).notNull(),
    startsAt: utc('starts_at').notNull(),
    dressCode: varchar('dress_code', { length: 120 }),
    theme: mysqlEnum('theme', THEMES).notNull(),
    status: mysqlEnum('status', INVITATION_STATUSES).notNull().default('pending'),
    proposedAt: utc('proposed_at'),
    responseNote: varchar('response_note', { length: 500 }),
    ideaId: uuid('idea_id').references(() => ideas.id, { onDelete: 'set null' }),
    createdAt: utc('created_at').notNull(),
    updatedAt: utc('updated_at').notNull(),
  },
  (t) => [index('idx_status_starts').on(t.status, t.startsAt), index('idx_idea').on(t.ideaId)],
);

export const memories = mysqlTable(
  'memories',
  {
    id: uuid('id').primaryKey(),
    invitationId: uuid('invitation_id')
      .notNull()
      .references(() => invitations.id, { onDelete: 'cascade' }),
    author: userColumn('author').notNull(),
    note: text('note').notNull(),
    rating: tinyint('rating').notNull(),
    createdAt: utc('created_at').notNull(),
    updatedAt: utc('updated_at').notNull(),
  },
  (t) => [uniqueIndex('uq_invitation_author').on(t.invitationId, t.author)],
);

export const photos = mysqlTable(
  'photos',
  {
    id: uuid('id').primaryKey(),
    memoryId: uuid('memory_id')
      .notNull()
      .references(() => memories.id, { onDelete: 'cascade' }),
    // Doar pe server: nu se trimit niciodata clientului.
    blobUrl: varchar('blob_url', { length: 500 }).notNull(),
    blobPathname: varchar('blob_pathname', { length: 500 }).notNull(),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    width: int('width'),
    height: int('height'),
    createdAt: utc('created_at').notNull(),
  },
  (t) => [index('idx_memory').on(t.memoryId, t.createdAt)],
);

export const notifications = mysqlTable(
  'notifications',
  {
    id: uuid('id').primaryKey(),
    recipient: userColumn('recipient').notNull(),
    type: mysqlEnum('type', NOTIFICATION_TYPES).notNull(),
    invitationId: uuid('invitation_id').references(() => invitations.id, { onDelete: 'cascade' }),
    readAt: utc('read_at'),
    createdAt: utc('created_at').notNull(),
  },
  (t) => [index('idx_recipient_unread').on(t.recipient, t.readAt, t.createdAt)],
);

export const loginAttempts = mysqlTable('login_attempts', {
  ipHash: sha256Hex('ip_hash').primaryKey(),
  windowStart: utc('window_start').notNull(),
  count: int('count').notNull(),
});

export type InvitationRow = typeof invitations.$inferSelect;
export type MemoryRow = typeof memories.$inferSelect;
export type PhotoRow = typeof photos.$inferSelect;
export type IdeaRow = typeof ideas.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
```

- [ ] **Step 2: Scrie `lib/db/client.ts`**

```ts
import { connect } from '@tidbcloud/serverless';
import { drizzle } from 'drizzle-orm/tidb-serverless';
import * as schema from './schema';
import { env } from '../env';

/**
 * Driverul HTTP TiDB: fara pool si fara handshake TCP/TLS la fiecare cold start.
 * Parametrii de query (ex. ?ssl=...) sunt pentru mysql2 / drizzle-kit, driverul HTTP nu ii foloseste.
 */
export function createDb(databaseUrl: string) {
  const url = new URL(databaseUrl);
  url.search = '';
  const client = connect({ url: url.toString() });
  return drizzle({ client, schema });
}

export type Db = ReturnType<typeof createDb>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type DbOrTx = Db | Tx;

let db: Db | null = null;

export function getDb(): Db {
  if (!db) db = createDb(env().DATABASE_URL);
  return db;
}
```

- [ ] **Step 3: Scrie `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
```

- [ ] **Step 4: Genereaza migrarea**

Run: `npx drizzle-kit generate --name init`
Expected: se creeaza `drizzle/0000_init.sql` si `drizzle/meta/`. Deschide SQL-ul si verifica:
- coloanele `id` sunt `char(36) CHARACTER SET ascii COLLATE ascii_bin`
- exista `idx_status_starts`, `idx_idea`, `uq_invitation_author`, `idx_memory`, `idx_created`, `idx_recipient_unread`
- exista FK-urile cu `ON DELETE cascade` / `set null`

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: fara erori din `lib/`. (Erori din `app/` sau `components/` sunt asteptate pana la Task 11, pentru ca layout-ul vechi inca importa CSS vechi; daca apar, noteaza-le si continua.)

- [ ] **Step 6: Commit**

```bash
git add lib/db drizzle.config.ts drizzle
git commit -m "feat: add TiDB schema, drizzle client and initial migration"
```

---

### Task 5: Harness pentru testele de integrare

**Files:**
- Create: `test/db.ts`
- Modify: `test/global-setup.ts`
- Test: `test/db.test.ts`

- [ ] **Step 1: Scrie `test/global-setup.ts`**

```ts
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';

/** Aplica migrarile pe baza de test (doar daca TEST_DATABASE_URL e setat). */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  if (!/\/dates_test(\?|$)/.test(url)) {
    throw new Error('TEST_DATABASE_URL trebuie sa pointeze la baza dates_test, nu la baza reala.');
  }
  const connection = await mysql.createConnection({ uri: url });
  try {
    await migrate(drizzle(connection), { migrationsFolder: './drizzle' });
  } finally {
    await connection.end();
  }
}
```

- [ ] **Step 2: Scrie `test/db.ts`**

```ts
import { createDb, type Db } from '@/lib/db/client';
import { photos, memories, notifications, invitations, ideas, loginAttempts } from '@/lib/db/schema';

export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

export function testDb(): Db {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL lipseste');
  return createDb(url);
}

/** Goleste toate tabelele, in ordinea FK-urilor. */
export async function resetDb(db: Db): Promise<void> {
  await db.delete(photos);
  await db.delete(memories);
  await db.delete(notifications);
  await db.delete(invitations);
  await db.delete(ideas);
  await db.delete(loginAttempts);
}
```

- [ ] **Step 3: Scrie un test de fum `test/db.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { hasTestDb, testDb, resetDb } from './db';
import { ideas } from '@/lib/db/schema';
import { newId } from '@/lib/ids';

describe.skipIf(!hasTestDb)('test database', () => {
  const db = hasTestDb ? testDb() : (null as never);

  beforeEach(async () => {
    await resetDb(db);
  });

  it('round-trips a row with a UTC datetime', async () => {
    const createdAt = new Date('2026-09-28T18:30:00.000Z');
    const id = newId();
    await db.insert(ideas).values({ id, author: 'el', title: 'Picnic', description: null, createdAt });
    const rows = await db.select().from(ideas);
    expect(rows).toHaveLength(1);
    expect(rows[0].createdAt.toISOString()).toBe(createdAt.toISOString());
  });
});
```

- [ ] **Step 4: Ruleaza**

Run: `npx vitest run test/db.test.ts`
Expected: fara `.env.test.local` testul apare ca **skipped**. Cu `TEST_DATABASE_URL` setat (vezi SETUP.md din Faza 5, sau creeaza acum baza `dates_test` in TiDB): PASS.

- [ ] **Step 5: Commit**

```bash
git add test
git commit -m "test: add integration test harness for TiDB"
```

---

### Task 6: Parole si autentificare

**Files:**
- Create: `lib/auth/password.ts`, `lib/auth/credentials.ts`, `scripts/hash-password.mjs`, `scripts/gen-secret.mjs`
- Test: `lib/auth/password.test.ts`, `lib/auth/credentials.test.ts`

- [ ] **Step 1: Scrie testele**

`lib/auth/password.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, BCRYPT_COST } from './password';

describe('password', () => {
  it('hashes with the configured cost and verifies', async () => {
    const hash = await hashPassword('elefant-roz-123');
    expect(hash.startsWith(`$2b$${BCRYPT_COST}$`)).toBe(true);
    expect(await verifyPassword('elefant-roz-123', hash)).toBe(true);
    expect(await verifyPassword('gresit', hash)).toBe(false);
  });
});
```

`lib/auth/credentials.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { authenticate, type UserCredential } from './credentials';
import { hashPassword } from './password';

let users: UserCredential[];

beforeAll(async () => {
  users = [
    { id: 'el', name: 'Catalin', passwordHash: await hashPassword('parola-el') },
    { id: 'ea', name: 'iubita', passwordHash: await hashPassword('parola-ea') },
  ];
});

describe('authenticate', () => {
  it('matches username case-insensitively and trimmed', async () => {
    expect(await authenticate('  catalin ', 'parola-el', users)).toBe('el');
    expect(await authenticate('IUBITA', 'parola-ea', users)).toBe('ea');
  });

  it('rejects the wrong password', async () => {
    expect(await authenticate('catalin', 'parola-ea', users)).toBeNull();
  });

  it('rejects an unknown user', async () => {
    expect(await authenticate('admin', 'parola-el', users)).toBeNull();
  });

  it('password is case-sensitive', async () => {
    expect(await authenticate('catalin', 'PAROLA-EL', users)).toBeNull();
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/auth`
Expected: FAIL (module inexistente).

- [ ] **Step 3: Implementeaza**

`lib/auth/password.ts`:

```ts
import bcrypt from 'bcryptjs';

export const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

`lib/auth/credentials.ts`:

```ts
import type { UserId } from '../domain';
import { hashPassword, verifyPassword } from './password';

export interface UserCredential {
  id: UserId;
  name: string;
  passwordHash: string;
}

let dummyHash: Promise<string> | null = null;

// Pentru un username necunoscut tot rulam un bcrypt.compare,
// ca timpul de raspuns sa nu arate daca username-ul exista.
function getDummyHash(): Promise<string> {
  if (!dummyHash) dummyHash = hashPassword('parola-inexistenta-pentru-timp-constant');
  return dummyHash;
}

export async function authenticate(
  username: string,
  password: string,
  users: UserCredential[],
): Promise<UserId | null> {
  const normalized = username.trim().toLowerCase();
  const match = users.find((u) => u.name.trim().toLowerCase() === normalized);
  const hash = match ? match.passwordHash : await getDummyHash();
  const valid = await verifyPassword(password, hash);
  return match && valid ? match.id : null;
}
```

`scripts/hash-password.mjs`:

```js
import bcrypt from 'bcryptjs';
import readline from 'node:readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question('Parola noua: ');
const again = await rl.question('Repeta parola: ');
rl.close();

if (password !== again) {
  console.error('\nParolele nu coincid. Ruleaza din nou.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('\nParola trebuie sa aiba minim 8 caractere.');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log('\nCopiaza valoarea de mai jos (tot randul) in variabila USER_EL_PASSWORD_HASH sau USER_EA_PASSWORD_HASH:\n');
console.log(Buffer.from(hash).toString('base64'));
console.log('');
```

`scripts/gen-secret.mjs`:

```js
import { randomBytes } from 'node:crypto';

console.log('\nCopiaza valoarea de mai jos in SESSION_SECRET:\n');
console.log(randomBytes(32).toString('base64url'));
console.log('');
```

- [ ] **Step 4: Ruleaza testele**

Run: `npx vitest run lib/auth`
Expected: PASS (dureaza cateva secunde: bcrypt cost 12 e intentionat lent).

- [ ] **Step 5: Incearca scripturile**

Run: `npm run gen-secret`
Expected: afiseaza un string de 43 caractere.

- [ ] **Step 6: Commit**

```bash
git add lib/auth scripts
git commit -m "feat: add bcrypt password hashing, credential check and setup scripts"
```

---

### Task 7: Sesiune JWT

**Files:**
- Create: `lib/auth/session.ts`
- Test: `lib/auth/session.test.ts`

- [ ] **Step 1: Scrie testul**

```ts
import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import { signSession, verifySession, SESSION_MAX_AGE_SECONDS } from './session';

const SECRET = 's'.repeat(32);
const NOW = new Date('2026-09-28T12:00:00Z');

describe('session', () => {
  it('round-trips the user', async () => {
    const token = await signSession('ea', SECRET, NOW);
    expect(await verifySession(token, SECRET, NOW)).toBe('ea');
  });

  it('expires after the max age', async () => {
    const token = await signSession('el', SECRET, NOW);
    const later = new Date(NOW.getTime() + (SESSION_MAX_AGE_SECONDS + 60) * 1000);
    expect(await verifySession(token, SECRET, later)).toBeNull();
  });

  it('rejects a token signed with another secret', async () => {
    const token = await signSession('el', 'o'.repeat(32), NOW);
    expect(await verifySession(token, SECRET, NOW)).toBeNull();
  });

  it('rejects a tampered token', async () => {
    const token = await signSession('el', SECRET, NOW);
    const [h, , s] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'ea', iat: 0, exp: 9999999999 })).toString('base64url');
    expect(await verifySession(`${h}.${forgedPayload}.${s}`, SECRET, NOW)).toBeNull();
  });

  it('rejects alg=none tokens', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'el' })).toString('base64url');
    expect(await verifySession(`${header}.${payload}.`, SECRET, NOW)).toBeNull();
  });

  it('rejects an unknown subject', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('admin')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it('returns null for missing token or short secret', async () => {
    expect(await verifySession(undefined, SECRET)).toBeNull();
    const token = await signSession('el', SECRET, NOW);
    expect(await verifySession(token, 'short', NOW)).toBeNull();
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/auth/session.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementeaza `lib/auth/session.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose';
import { isUserId, type UserId } from '../domain';

export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSession(user: UserId, secret: string, now: Date = new Date()): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_MAX_AGE_SECONDS)
    .sign(key(secret));
}

export async function verifySession(
  token: string | undefined,
  secret: string,
  now: Date = new Date(),
): Promise<UserId | null> {
  if (!token || secret.length < 32) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ['HS256'], currentDate: now });
    return isUserId(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Ruleaza testul**

Run: `npx vitest run lib/auth/session.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/session.ts lib/auth/session.test.ts
git commit -m "feat: add signed JWT session helpers"
```

---

### Task 8: Rate limit la login

**Files:**
- Create: `lib/auth/rate-limit.ts`, `lib/auth/client-ip.ts`
- Test: `lib/auth/rate-limit.test.ts`, `lib/auth/rate-limit.int.test.ts`, `lib/auth/client-ip.test.ts`

- [ ] **Step 1: Scrie testele**

`lib/auth/rate-limit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { hashIp, exceedsLimit, toSqlDateTime, buildReserveAttemptQuery, RATE_LIMIT_MAX_FAILURES } from './rate-limit';

describe('exceedsLimit', () => {
  it('is false at and below the max', () => {
    expect(exceedsLimit(RATE_LIMIT_MAX_FAILURES)).toBe(false);
    expect(exceedsLimit(RATE_LIMIT_MAX_FAILURES - 1)).toBe(false);
  });

  it('is true above the max', () => {
    expect(exceedsLimit(RATE_LIMIT_MAX_FAILURES + 1)).toBe(true);
  });
});

describe('toSqlDateTime', () => {
  it('formats a UTC date as YYYY-MM-DD HH:MM:SS', () => {
    expect(toSqlDateTime(new Date('2026-09-28T12:34:56.789Z'))).toBe('2026-09-28 12:34:56');
  });
});

describe('hashIp', () => {
  it('is stable, hex, and depends on the secret', () => {
    const a = hashIp('1.2.3.4', 'x'.repeat(32));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp('1.2.3.4', 'x'.repeat(32))).toBe(a);
    expect(hashIp('1.2.3.4', 'y'.repeat(32))).not.toBe(a);
  });
});

describe('buildReserveAttemptQuery', () => {
  it('assigns count before window_start in the SET clause', () => {
    // MySQL/TiDB evaluate ON DUPLICATE KEY UPDATE assignments left to right, and the
    // count expression reads window_start: if window_start were reassigned first,
    // count would see the new value instead of the value stored before this statement.
    const now = new Date('2026-09-28T12:00:00Z');
    const dialect = new MySqlDialect();

    const { sql: text } = dialect.sqlToQuery(buildReserveAttemptQuery('x'.repeat(64), now));

    const countIdx = text.indexOf('`count` =');
    const windowIdx = text.indexOf('`window_start` =');
    expect(countIdx).toBeGreaterThan(-1);
    expect(windowIdx).toBeGreaterThan(-1);
    expect(countIdx).toBeLessThan(windowIdx);
  });

  it('does not qualify the SET target columns with the table name', () => {
    const now = new Date('2026-09-28T12:00:00Z');
    const dialect = new MySqlDialect();
    const { sql: text } = dialect.sqlToQuery(buildReserveAttemptQuery('x'.repeat(64), now));

    expect(text).toContain('on duplicate key update');
    expect(text).not.toContain('login_attempts`.`count` =');
    expect(text).not.toContain('login_attempts`.`window_start` =');
  });
});
```

`lib/auth/client-ip.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { clientIpFrom } from './client-ip';

describe('clientIpFrom', () => {
  it('takes the first x-forwarded-for entry', () => {
    expect(clientIpFrom(new Headers({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }))).toBe('9.9.9.9');
  });

  it('falls back to x-real-ip, then unknown', () => {
    expect(clientIpFrom(new Headers({ 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8');
    expect(clientIpFrom(new Headers())).toBe('unknown');
  });
});
```

`lib/auth/rate-limit.int.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { hasTestDb, testDb, resetDb } from '@/test/db';
import { getAttempts, reserveAttempt, exceedsLimit, clearAttempts, RATE_LIMIT_WINDOW_MS } from './rate-limit';

describe.skipIf(!hasTestDb)('rate limit persistence', () => {
  const db = hasTestDb ? testDb() : (null as never);
  const ipHash = 'a'.repeat(64);
  const now = new Date('2026-09-28T12:00:00Z');

  beforeEach(async () => {
    await resetDb(db);
  });

  it('increments sequentially and resets once the window passes', async () => {
    expect(await getAttempts(db, ipHash)).toBeNull();

    for (let i = 1; i <= 6; i++) {
      expect(await reserveAttempt(db, ipHash, now)).toBe(i);
    }
    expect(exceedsLimit(6)).toBe(true);

    const afterWindow = new Date(now.getTime() + RATE_LIMIT_WINDOW_MS + 60_000);
    expect(await reserveAttempt(db, ipHash, afterWindow)).toBe(1);
  });

  it('does not lose updates under concurrent reservations', async () => {
    await Promise.all(Array.from({ length: 10 }, () => reserveAttempt(db, ipHash, now)));
    expect((await getAttempts(db, ipHash))?.count).toBe(10);
  });

  it('clears attempts', async () => {
    await reserveAttempt(db, ipHash, now);
    await clearAttempts(db, ipHash);
    expect(await getAttempts(db, ipHash)).toBeNull();
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/auth/rate-limit.test.ts lib/auth/client-ip.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementeaza**

`lib/auth/rate-limit.ts`:

Nota (security review post-implementare): varianta initiala facea `isBlocked(getAttempts) -> bcrypt -> recordFailure` (citeste-apoi-scrie), ceea ce nu e atomic -- cereri paralele treceau toate de verificare si actualizarile se pierdeau (undercounting). Inlocuita cu o rezervare atomica INAINTE de verificarea parolei, intr-un singur `INSERT ... ON DUPLICATE KEY UPDATE`. `isBlocked`, `afterFailure` si `recordFailure` au fost eliminate (cod mort dupa schimbare); `getAttempts`, `clearAttempts`, `hashIp` si constantele raman.

`hashIp` foloseste acum `createHmac` (nu `createHash` cu secretul concatenat in text): HMAC e constructia corecta pentru "hash legat de o cheie".

Ordinea asignarilor din SET conteaza (`count` trebuie evaluat inaintea lui `window_start`, vezi comentariul din cod), dar `db.insert(...).onDuplicateKeyUpdate({ set: {...} })` al drizzle reordoneaza intotdeauna dupa ordinea de DECLARARE a coloanelor in schema (`mysql-core/dialect.js#buildUpdateSet`), ignorand ordinea cheilor din `set`. De aceea statement-ul e scris ca `sql` bruta si executat cu `db.execute(...)`, nu prin `.onDuplicateKeyUpdate()`.

```ts
import { createHmac } from 'node:crypto';
import { eq, sql, getTableName, type SQL } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { loginAttempts } from '../db/schema';

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_MAX_FAILURES = 5;

export interface AttemptWindow {
  windowStart: Date;
  count: number;
}

/** IP-ul brut nu se stocheaza: doar un HMAC legat de SESSION_SECRET (nu un hash simplu, ca sa nu poata fi brute-forced offline). */
export function hashIp(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(ip).digest('hex');
}

/** 'YYYY-MM-DD HH:MM:SS' UTC. Parametrii dintr-un sql`` nu trec prin maparea de tip a coloanei datetime, deci ii formatam explicit. */
export function toSqlDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export async function getAttempts(db: DbOrTx, ipHash: string): Promise<AttemptWindow | null> {
  const [row] = await db
    .select({ windowStart: loginAttempts.windowStart, count: loginAttempts.count })
    .from(loginAttempts)
    .where(eq(loginAttempts.ipHash, ipHash))
    .limit(1);
  return row ?? null;
}

const tableId = sql.identifier(getTableName(loginAttempts));
const ipHashId = sql.identifier(loginAttempts.ipHash.name);
const windowStartId = sql.identifier(loginAttempts.windowStart.name);
const countId = sql.identifier(loginAttempts.count.name);

/**
 * Construieste (fara sa execute) statement-ul brut de rezervare atomica a unei incercari.
 *
 * IMPORTANT: `count` trebuie asignat inaintea lui `window_start`. MySQL/TiDB evalueaza
 * asignarile dintr-un ON DUPLICATE KEY UPDATE in ordine, de la stanga la dreapta, iar
 * expresia lui `count` citeste `window_start`: daca `window_start` ar fi fost deja
 * suprascris de o asignare anterioara, `count` ar vedea valoarea noua in loc de cea
 * stocata si nu ar mai putea decide corect daca fereastra a expirat.
 */
export function buildReserveAttemptQuery(ipHash: string, now: Date): SQL {
  const cutoff = toSqlDateTime(new Date(now.getTime() - RATE_LIMIT_WINDOW_MS));
  const nowValue = toSqlDateTime(now);
  return sql`insert into ${tableId} (${ipHashId}, ${windowStartId}, ${countId})
    values (${ipHash}, ${nowValue}, 1)
    on duplicate key update
      ${countId} = IF(${windowStartId} <= ${cutoff}, 1, ${countId} + 1),
      ${windowStartId} = IF(${windowStartId} <= ${cutoff}, ${nowValue}, ${windowStartId})`;
}

/**
 * Rezerva atomic o incercare de login, INAINTE de verificarea parolei: un singur
 * INSERT ... ON DUPLICATE KEY UPDATE, fara citire-apoi-scriere (care ar pierde
 * actualizari sub cereri paralele). Intoarce numarul de incercari din fereastra curenta.
 */
export async function reserveAttempt(db: DbOrTx, ipHash: string, now: Date): Promise<number> {
  await db.execute(buildReserveAttemptQuery(ipHash, now));
  const row = await getAttempts(db, ipHash);
  return row?.count ?? 1;
}

export function exceedsLimit(count: number): boolean {
  return count > RATE_LIMIT_MAX_FAILURES;
}

export async function clearAttempts(db: DbOrTx, ipHash: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.ipHash, ipHash));
}
```

`lib/auth/client-ip.ts`:

```ts
/**
 * Pe Vercel, x-forwarded-for e suprascris de platforma cu IP-ul real al clientului.
 * Pe alt hosting header-ul poate fi falsificat de client.
 */
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  const real = headers.get('x-real-ip')?.trim();
  return real || 'unknown';
}
```

- [ ] **Step 4: Ruleaza testele**

Run: `npx vitest run lib/auth`
Expected: PASS (testul de integrare e skipped fara `TEST_DATABASE_URL`).

- [ ] **Step 5: Commit**

```bash
git add lib/auth
git commit -m "feat: add login rate limiting per hashed IP"
```

---

### Task 9: CSP si proxy

**Files:**
- Create: `lib/security/csp.ts`, `proxy.ts`
- Test: `lib/security/csp.test.ts`, `proxy.test.ts`

- [ ] **Step 1: Scrie testele**

`lib/security/csp.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildCsp } from './csp';

describe('buildCsp', () => {
  it('uses the nonce and locks down framing, objects and base', () => {
    const csp = buildCsp('abc123', false);
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('ws:');
  });

  it('allows eval and websockets only in dev', () => {
    const csp = buildCsp('abc123', true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain('ws:');
  });
});
```

`proxy.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';
import { signSession, SESSION_COOKIE } from './lib/auth/session';

const SECRET = 'p'.repeat(32);

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
});

async function withSession(url: string) {
  const token = await signSession('el', SECRET);
  return new NextRequest(url, { headers: { cookie: `${SESSION_COOKIE}=${token}` } });
}

describe('proxy', () => {
  it('redirects pages to /login without a session', async () => {
    const res = await proxy(new NextRequest('http://localhost/'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/login');
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
  });

  it('returns 401 for api routes without a session', async () => {
    const res = await proxy(new NextRequest('http://localhost/api/photos/x'));
    expect(res.status).toBe(401);
  });

  it('lets /login through without a session, with a CSP nonce', async () => {
    const res = await proxy(new NextRequest('http://localhost/login'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  });

  it('redirects /login to / when already logged in', async () => {
    const res = await proxy(await withSession('http://localhost/login'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/');
  });

  it('lets authenticated requests through', async () => {
    const res = await proxy(await withSession('http://localhost/'));
    expect(res.status).toBe(200);
  });

  it('treats a forged cookie as no session', async () => {
    const req = new NextRequest('http://localhost/', { headers: { cookie: `${SESSION_COOKIE}=forged.token.value` } });
    const res = await proxy(req);
    expect(res.status).toBe(307);
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/security proxy.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementeaza**

`lib/security/csp.ts`:

```ts
export function buildCsp(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // R3F / drei si React folosesc stiluri inline; scripturile raman strict pe nonce.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? ' ws:' : ''}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  // Fara upgrade-insecure-requests: Vercel forteaza HTTPS + HSTS, iar directiva ar strica testele E2E pe http://localhost.
  return directives.join('; ');
}
```

`proxy.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE } from './lib/auth/session';
import { buildCsp } from './lib/security/csp';

const PUBLIC_PATHS = new Set(['/login']);

function withCsp(response: NextResponse, csp: string): NextResponse {
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');
  const { pathname } = request.nextUrl;

  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET ?? '');
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!user && !isPublic) {
    if (pathname.startsWith('/api/')) {
      return withCsp(NextResponse.json({ error: 'Neautentificat' }, { status: 401 }), csp);
    }
    return withCsp(NextResponse.redirect(new URL('/login', request.url)), csp);
  }

  if (user && isPublic) {
    return withCsp(NextResponse.redirect(new URL('/', request.url)), csp);
  }

  // Next citeste nonce-ul din header-ul CSP al request-ului si il pune pe scripturile lui.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }), csp);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 4: Ruleaza testele**

Run: `npx vitest run lib/security proxy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/security proxy.ts proxy.test.ts
git commit -m "feat: add CSP nonce and auth gate in proxy"
```

---

### Task 10: Sesiunea pe server, nume afisate, citirea formularelor

**Files:**
- Create: `lib/auth/require-session.ts`, `lib/auth/display-names.ts`, `lib/form.ts`
- Test: `lib/form.test.ts`, `lib/auth/display-names.test.ts`

- [ ] **Step 1: Scrie testele**

`lib/form.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { pickStrings, toFieldErrors } from './form';

describe('pickStrings', () => {
  it('reads strings and defaults missing or file values to empty', () => {
    const fd = new FormData();
    fd.set('title', 'Cina');
    fd.set('file', new Blob(['x']));
    expect(pickStrings(fd, ['title', 'missing', 'file'])).toEqual({ title: 'Cina', missing: '', file: '' });
  });
});

describe('toFieldErrors', () => {
  it('keeps the first message per field', () => {
    const schema = z.object({ title: z.string().min(1, 'Obligatoriu').min(3, 'Prea scurt'), age: z.number() });
    const result = schema.safeParse({ title: '', age: 'x' });
    if (result.success) throw new Error('expected failure');
    const fields = toFieldErrors(result.error);
    expect(fields.title).toBe('Obligatoriu');
    expect(fields.age).toBeTruthy();
  });
});
```

`lib/auth/display-names.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatDisplayName } from './display-names';

describe('formatDisplayName', () => {
  it('capitalizes the first letter', () => {
    expect(formatDisplayName('catalin')).toBe('Catalin');
    expect(formatDisplayName('  ana ')).toBe('Ana');
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/form.test.ts lib/auth/display-names.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementeaza**

`lib/form.ts`:

```ts
import type { z } from 'zod';

export function pickStrings<K extends string>(formData: FormData, keys: readonly K[]): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of keys) {
    const value = formData.get(key);
    out[key] = typeof value === 'string' ? value : '';
  }
  return out;
}

export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
```

`lib/auth/display-names.ts`:

```ts
import type { UserId } from '../domain';
import { env } from '../env';

export function formatDisplayName(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function displayNames(): Record<UserId, string> {
  const e = env();
  return { el: formatDisplayName(e.USER_EL_NAME), ea: formatDisplayName(e.USER_EA_NAME) };
}

export function displayName(user: UserId): string {
  return displayNames()[user];
}
```

`lib/auth/require-session.ts`:

```ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserId } from '../domain';
import { env } from '../env';
import { SESSION_COOKIE, verifySession } from './session';

/** Userul din cookie, sau null. Pentru route handlers (care raspund cu 401). */
export async function getSessionUser(): Promise<UserId | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token, env().SESSION_SECRET);
}

/** Pentru pagini si Server Actions: redirect la /login fara sesiune. */
export async function requireSession(): Promise<UserId> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}
```

- [ ] **Step 4: Ruleaza testele**

Run: `npx vitest run lib/form.test.ts lib/auth/display-names.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/form.ts lib/form.test.ts lib/auth/require-session.ts lib/auth/display-names.ts lib/auth/display-names.test.ts
git commit -m "feat: add server session helpers, display names and form parsing"
```

---

### Task 11: Stiluri, root layout, pagini de eroare

**Files:**
- Modify: `app/layout.tsx`, `app/globals.css` (rescris complet)
- Create: `app/error.tsx`, `app/not-found.tsx`, `components/SkyBackground.tsx`, `components/ui/Field.tsx`, `components/ui/SubmitButton.tsx`

- [ ] **Step 1: Rescrie `app/globals.css`**

```css
:root {
  --pink-100: #fff0f6;
  --pink-200: #ffc8dd;
  --pink-300: #ffafcc;
  --blue-200: #bde0fe;
  --blue-300: #a2d2ff;
  --cream: #fff8fb;
  --ink: #3a2540;
  --ink-soft: #6b5570;
  --danger: #b3261e;
  --success: #2e7d5b;
  --glass: rgba(255, 255, 255, 0.45);
  --glass-strong: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(255, 255, 255, 0.75);
  --shadow: 0 12px 40px rgba(58, 37, 64, 0.12);
  --radius: 20px;
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --sky-top: var(--pink-200);
  --sky-bottom: var(--blue-200);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body { min-height: 100%; }

body {
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.55;
  background: var(--cream);
  overflow-x: hidden;
}

h1, h2, h3 { font-family: var(--font-display); font-weight: 600; line-height: 1.15; }
h1 { font-size: clamp(2rem, 5vw, 3.25rem); }
h2 { font-size: clamp(1.4rem, 3vw, 1.9rem); }
h3 { font-size: 1.15rem; }
a { color: inherit; }
img { max-width: 100%; display: block; }

:focus-visible { outline: 3px solid var(--blue-300); outline-offset: 2px; }

/* Cer: fundal fix sub continut (si sub canvas-ul 3D din Faza 4) */
.sky {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(180deg, var(--sky-top) 0%, var(--sky-bottom) 100%);
  transition: background 600ms ease;
}
.sky[data-theme='toamna'] { --sky-top: var(--pink-200); --sky-bottom: var(--cream); }
.sky[data-theme='iarna'] { --sky-top: var(--blue-300); --sky-bottom: #ffffff; }
.sky[data-theme='amandoua'] { --sky-top: var(--pink-200); --sky-bottom: var(--blue-200); }

/* Layout */
.app-shell { position: relative; z-index: 1; min-height: 100vh; }
.page { width: min(1100px, 100% - 32px); margin: 0 auto; padding: 24px 0 64px; }
.stack { display: grid; gap: 20px; }
.row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.grid-2 { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.center-screen { min-height: 100vh; display: grid; place-items: center; padding: 16px; position: relative; z-index: 1; }

/* Card glass */
.card {
  background: var(--glass);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 24px;
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}
.card-strong { background: var(--glass-strong); }
.eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.75rem; color: var(--ink-soft); font-weight: 600; }
.muted { color: var(--ink-soft); }

/* Header */
.app-header {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  width: min(1100px, 100% - 32px); margin: 12px auto 0; padding: 10px 16px;
  background: var(--glass-strong); border: 1px solid var(--glass-border); border-radius: 999px;
  -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
}
.app-header .logo { font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; text-decoration: none; }
.app-header nav { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
.nav-link { text-decoration: none; padding: 6px 12px; border-radius: 999px; font-weight: 500; position: relative; }
.nav-link:hover, .nav-link[aria-current='page'] { background: rgba(255, 255, 255, 0.8); }
.badge {
  display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; margin-left: 4px;
  border-radius: 999px; background: var(--pink-300); color: var(--ink); font-size: 0.75rem; font-weight: 700;
}

/* Butoane */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 44px; padding: 10px 20px; border-radius: 999px; border: 1px solid transparent;
  font: inherit; font-weight: 600; text-decoration: none; cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
}
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.btn-primary { background: linear-gradient(135deg, var(--pink-300), var(--blue-300)); color: var(--ink); box-shadow: 0 6px 20px rgba(255, 175, 204, 0.5); }
.btn-ghost { background: rgba(255, 255, 255, 0.6); border-color: var(--glass-border); color: var(--ink); }
.btn-danger { background: #fff; border-color: #f1b8b4; color: var(--danger); }
.btn-link { background: none; border: none; padding: 0; min-height: auto; color: var(--ink); text-decoration: underline; cursor: pointer; font: inherit; }

/* Formulare */
.form { display: grid; gap: 16px; }
.field { display: grid; gap: 6px; }
.field label, .field legend { font-weight: 600; font-size: 0.95rem; }
.field input, .field textarea, .field select {
  width: 100%; font: inherit; color: var(--ink);
  padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(58, 37, 64, 0.18); background: rgba(255, 255, 255, 0.85);
}
.field textarea { min-height: 120px; resize: vertical; }
.field input[aria-invalid='true'], .field textarea[aria-invalid='true'] { border-color: var(--danger); }
.hint { font-size: 0.85rem; color: var(--ink-soft); }
.field-error, .form-error { color: var(--danger); font-size: 0.9rem; font-weight: 500; }
.form-success { color: var(--success); font-weight: 600; }
fieldset { border: none; }
.choice-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.choice { position: relative; }
.choice input { position: absolute; opacity: 0; inset: 0; cursor: pointer; }
.choice span {
  display: grid; place-items: center; text-align: center; min-height: 56px; padding: 12px;
  border-radius: 16px; border: 2px solid var(--glass-border); background: rgba(255, 255, 255, 0.6); font-weight: 600;
}
.choice input:checked + span { border-color: var(--pink-300); background: #fff; box-shadow: 0 4px 16px rgba(255, 175, 204, 0.45); }
.choice input:focus-visible + span { outline: 3px solid var(--blue-300); outline-offset: 2px; }

/* Status */
.status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; background: #fff; }
.status-pending, .status-reschedule { background: #fff3c4; }
.status-accepted { background: #d6f5e5; }
.status-declined, .status-cancelled { background: #f3e1e6; color: var(--ink-soft); }

/* Countdown (componenta pastrata) */
.countdown { display: grid; gap: 6px; }
.countdown-label { color: var(--ink-soft); font-weight: 600; }
.countdown-units { display: flex; gap: 10px; font-family: var(--font-display); font-size: 1.6rem; font-weight: 600; }
.countdown-complete { font-weight: 600; }

@media (max-width: 640px) {
  .card { padding: 18px; }
  .app-header { border-radius: 20px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; }
}
```

- [ ] **Step 2: Rescrie `app/layout.tsx`**

```tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { connection } from 'next/server';
import { Fraunces, Inter } from 'next/font/google';

const display = Fraunces({ subsets: ['latin', 'latin-ext'], variable: '--font-display', display: 'swap' });
const body = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: 'Dateurile noastre',
  description: 'Invitatii, amintiri si idei, doar pentru noi doi.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#ffc8dd',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Randare dinamica pe fiecare request: necesar pentru nonce-ul CSP.
  await connection();
  return (
    <html lang="ro" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Creeaza `components/SkyBackground.tsx`**

```tsx
import type { ThemeId } from '@/lib/domain';

/** Gradientul de fundal. In Faza 4 canvas-ul 3D se aseaza peste el. */
export default function SkyBackground({ theme }: { theme: ThemeId }) {
  return <div className="sky" data-theme={theme} aria-hidden="true" />;
}
```

- [ ] **Step 4: Creeaza `components/ui/Field.tsx` si `components/ui/SubmitButton.tsx`**

`components/ui/Field.tsx`:

```tsx
import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export default function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
      {error && (
        <p className="field-error" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

`components/ui/SubmitButton.tsx`:

```tsx
'use client';

import { useFormStatus } from 'react-dom';

interface SubmitButtonProps {
  label: string;
  pendingLabel?: string;
  variant?: 'primary' | 'ghost' | 'danger';
}

export default function SubmitButton({ label, pendingLabel = 'Se trimite...', variant = 'primary' }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn btn-${variant}`} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
```

- [ ] **Step 5: Creeaza paginile de eroare**

`app/error.tsx`:

```tsx
'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="center-screen">
      <div className="sky" data-theme="amandoua" aria-hidden="true" />
      <div className="card card-strong stack" style={{ maxWidth: 420, position: 'relative' }}>
        <h1>Ups</h1>
        <p>Ceva n-a mers. Incearca din nou.</p>
        <button type="button" className="btn btn-primary" onClick={reset}>
          Reincearca
        </button>
      </div>
    </main>
  );
}
```

`app/not-found.tsx`:

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="center-screen">
      <div className="sky" data-theme="amandoua" aria-hidden="true" />
      <div className="card card-strong stack" style={{ maxWidth: 420, position: 'relative' }}>
        <h1>Nu exista</h1>
        <p>Pagina cautata nu exista sau nu mai e disponibila.</p>
        <Link href="/" className="btn btn-primary">
          Inapoi acasa
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx app/error.tsx app/not-found.tsx components
git commit -m "feat: add pastel design tokens, root layout and error pages"
```

---

### Task 12: Login, logout si shell-ul aplicatiei

**Files:**
- Create: `app/(auth)/actions.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/login/LoginForm.tsx`, `app/(app)/layout.tsx`, `app/(app)/page.tsx`, `components/AppHeader.tsx`

- [ ] **Step 1: Scrie `app/(auth)/actions.ts`**

```ts
'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { env } from '@/lib/env';
import { getDb } from '@/lib/db/client';
import { authenticate } from '@/lib/auth/credentials';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { hashIp, reserveAttempt, exceedsLimit, clearAttempts } from '@/lib/auth/rate-limit';
import { clientIpFrom } from '@/lib/auth/client-ip';
import { pickStrings } from '@/lib/form';
import { log, errorName } from '@/lib/log';
import { GENERIC_ERROR, type ActionState } from '@/lib/result';

const WRONG_CREDENTIALS = 'Utilizator sau parola gresite.';
const TOO_MANY = 'Utilizator sau parola gresite. Prea multe incercari, incearca din nou peste 15 minute.';

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = pickStrings(formData, ['username', 'password']);
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: WRONG_CREDENTIALS, values: { username: values.username } };

  try {
    const e = env();
    const db = getDb();
    const now = new Date();
    const ipHash = hashIp(clientIpFrom(await headers()), e.SESSION_SECRET);

    // Rezervarea se face INAINTE de verificarea parolei si conteaza automat incercarea
    // curenta (atomic, vezi lib/auth/rate-limit.ts): daca autentificarea esueaza mai jos,
    // nu mai inregistram inca o data esecul, e deja numarat.
    const attempts = await reserveAttempt(db, ipHash, now);
    if (exceedsLimit(attempts)) {
      log('warn', 'login_rate_limited');
      return { ok: false, error: TOO_MANY, values: { username: values.username } };
    }

    const user = await authenticate(parsed.data.username, parsed.data.password, [
      { id: 'el', name: e.USER_EL_NAME, passwordHash: e.USER_EL_PASSWORD_HASH },
      { id: 'ea', name: e.USER_EA_NAME, passwordHash: e.USER_EA_PASSWORD_HASH },
    ]);

    if (!user) {
      log('warn', 'login_failed');
      return { ok: false, error: WRONG_CREDENTIALS, values: { username: values.username } };
    }

    await clearAttempts(db, ipHash);
    const token = await signSession(user, e.SESSION_SECRET, now);
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    log('info', 'login_ok', { user });
  } catch (err) {
    log('error', 'login_error', { reason: errorName(err) });
    return { ok: false, error: GENERIC_ERROR, values: { username: values.username } };
  }

  redirect('/');
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}
```

- [ ] **Step 2: Scrie `app/(auth)/login/LoginForm.tsx`**

```tsx
'use client';

import { useActionState } from 'react';
import { loginAction } from '../actions';
import Field from '@/components/ui/Field';
import SubmitButton from '@/components/ui/SubmitButton';

export default function LoginForm() {
  const [state, formAction] = useActionState(loginAction, null);
  const username = state && !state.ok ? state.values?.username ?? '' : '';

  return (
    <form action={formAction} className="form">
      <Field label="Utilizator" htmlFor="username">
        <input id="username" name="username" autoComplete="username" required maxLength={100} defaultValue={username} />
      </Field>
      <Field label="Parola" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} />
      </Field>
      {state && !state.ok && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton label="Intra" pendingLabel="Se verifica..." />
    </form>
  );
}
```

- [ ] **Step 3: Scrie `app/(auth)/login/page.tsx`**

```tsx
import SkyBackground from '@/components/SkyBackground';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <main className="center-screen">
      <SkyBackground theme="amandoua" />
      <div className="card card-strong stack" style={{ width: 'min(420px, 100%)', position: 'relative' }}>
        <p className="eyebrow">Doar pentru noi doi</p>
        <h1>Dateurile noastre</h1>
        <LoginForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Scrie `components/AppHeader.tsx`**

```tsx
import Link from 'next/link';
import { logoutAction } from '@/app/(auth)/actions';

export interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

export const BASE_NAV: NavItem[] = [{ href: '/', label: 'Acasa' }];

interface AppHeaderProps {
  name: string;
  items: NavItem[];
}

export default function AppHeader({ name, items }: AppHeaderProps) {
  return (
    <header className="app-header">
      <Link href="/" className="logo">
        Dateurile noastre
      </Link>
      <nav aria-label="Navigare principala">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="nav-link">
            {item.label}
            {item.badge ? (
              <span className="badge" aria-label={`${item.badge} necitite`}>
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
        <form action={logoutAction}>
          <button type="submit" className="nav-link btn-link" title={`Iesi (${name})`}>
            Iesi
          </button>
        </form>
      </nav>
    </header>
  );
}
```

- [ ] **Step 5: Scrie `app/(app)/layout.tsx`**

```tsx
import type { ReactNode } from 'react';
import AppHeader, { BASE_NAV } from '@/components/AppHeader';
import SkyBackground from '@/components/SkyBackground';
import { requireSession } from '@/lib/auth/require-session';
import { displayName } from '@/lib/auth/display-names';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await requireSession();
  return (
    <>
      <SkyBackground theme="amandoua" />
      <div className="app-shell">
        <AppHeader name={displayName(me)} items={BASE_NAV} />
        <main className="page">{children}</main>
      </div>
    </>
  );
}
```

- [ ] **Step 6: Scrie `app/(app)/page.tsx` (placeholder pana in Faza 2)**

```tsx
import { requireSession } from '@/lib/auth/require-session';
import { displayName } from '@/lib/auth/display-names';

export default async function DashboardPage() {
  const me = await requireSession();
  return (
    <section className="card stack">
      <p className="eyebrow">Salut</p>
      <h1>{displayName(me)}</h1>
      <p className="muted">Aici vor aparea dateurile voastre.</p>
    </section>
  );
}
```

- [ ] **Step 7: Typecheck si build**

Run: `npx tsc --noEmit`
Expected: fara erori.

Run: `npm run build`
Expected: build reusit (rutele `/`, `/login` apar ca dinamice `ƒ`). Build-ul nu are nevoie de env; env-ul e citit doar la request.

- [ ] **Step 8: Smoke test manual (necesita `.env.local` completat si migrarea aplicata)**

```bash
npm run db:migrate
npm run dev
```

In browser:
1. `http://localhost:3000/` -> redirect la `/login`
2. User gresit -> "Utilizator sau parola gresite."
3. Login corect -> dashboard cu numele tau
4. "Iesi" -> inapoi la `/login`
5. DevTools -> Network -> raspunsul la `/login` are `content-security-policy` cu `nonce-...` si `x-frame-options: DENY`; nu are `x-powered-by`.

Daca `.env.local` nu e gata inca, sari peste acest pas si noteaza-l; e acoperit si de testele E2E din Faza 5.

- [ ] **Step 9: Ruleaza toate testele si verify**

Run: `npm run verify`
Expected: typecheck OK, toate testele PASS (cele de integrare skipped fara `TEST_DATABASE_URL`), `npm audit` fara vulnerabilitati high / critical. Daca audit raporteaza ceva, ruleaza `npm audit fix` (fara `--force`) si reia.

- [ ] **Step 10: Commit**

```bash
git add app components
git commit -m "feat: add login, logout and authenticated app shell"
```
