# Faza 2: Invitatii, dashboard, notificari - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fluxul complet de invitatii: creare, raspuns (Da / Nu / Propun alta ora), acceptarea orei propuse, anulare, dashboard grupat, notificari in aplicatie cu badge si email catre "el".

**Architecture:** Logica de tranzitii e o functie pura (`transition`) folosita si de server (validare), si de UI (`canPerform`, ce butoane apar). Serviciile (`lib/invitations/service.ts`) primesc `db` si `now`, fac mutatia + notificarea intr-o tranzactie si intorc un `NotificationEvent`; Server Actions trimit emailul dupa raspuns cu `after()`.

**Tech Stack:** Next.js 16 Server Actions + `after`, Drizzle, zod 4, Resend, Vitest.

**Prerequisite:** Faza 1 terminata. Spec sectiunile 6, 7, 8, 11. Abaterile: `2026-09-28-date-manager-00-overview.md`.

---

## File map (Faza 2)

| Fisier | Responsabilitate |
|---|---|
| `lib/time.ts` | conversii Europe/Bucharest <-> UTC, formatare in romana |
| `lib/escape.ts` | escape HTML pentru email |
| `lib/app-url.ts` | URL-ul public pentru linkurile din email |
| `lib/validation.ts` | scheme zod (invitatie, raspuns) |
| `lib/invitations/state-machine.ts` | `transition`, `canPerform` |
| `lib/invitations/group.ts` | gruparea din dashboard |
| `lib/invitations/queries.ts` | citiri invitatii |
| `lib/invitations/service.ts` | `createInvitation`, `applyInvitationAction` |
| `lib/notifications/describe.ts` | textul si linkul unei notificari |
| `lib/notifications/create.ts` | insert notificare |
| `lib/notifications/queries.ts` | badge, lista, marcare citite |
| `lib/notifications/email.ts` | constructie + trimitere email |
| `components/ui/ActionButtonForm.tsx` | buton-formular pentru actiuni simple |
| `components/StatusPill.tsx`, `components/InvitationCard.tsx` | afisare invitatii |
| `components/AppHeader.tsx` | navigare completa + badge (rescris) |
| `app/(app)/layout.tsx` | badge (modificat) |
| `app/(app)/page.tsx` | dashboard (rescris) |
| `app/(app)/invitatii/noua/{page.tsx,InvitationForm.tsx,actions.ts}` | creare |
| `app/(app)/invitatii/[id]/{page.tsx,InvitationDetails.tsx,ResponsePanel.tsx,CreatorActions.tsx,actions.ts}` | detaliu + actiuni |
| `app/(app)/notificari/{page.tsx,actions.ts}` | lista notificari |

---

### Task 1: Timp (Europe/Bucharest)

**Files:**
- Create: `lib/time.ts`
- Test: `lib/time.test.ts`

- [ ] **Step 1: Scrie testul**

```ts
import { describe, it, expect } from 'vitest';
import { parseLocalDateTime, toLocalInputValue, localDateKey, formatDateTimeRo } from './time';

describe('parseLocalDateTime', () => {
  it('converts summer time (UTC+3)', () => {
    expect(parseLocalDateTime('2026-07-25T20:00')?.toISOString()).toBe('2026-07-25T17:00:00.000Z');
  });

  it('converts winter time (UTC+2)', () => {
    expect(parseLocalDateTime('2026-01-10T20:00')?.toISOString()).toBe('2026-01-10T18:00:00.000Z');
  });

  it('handles the DST gap without failing', () => {
    // 2026-03-29 03:30 nu exista in Romania (ceasul sare de la 03:00 la 04:00)
    expect(parseLocalDateTime('2026-03-29T03:30')).not.toBeNull();
  });

  it('rejects malformed or impossible values', () => {
    expect(parseLocalDateTime('abc')).toBeNull();
    expect(parseLocalDateTime('2026-02-30T10:00')).toBeNull();
    expect(parseLocalDateTime('2026-13-01T10:00')).toBeNull();
    expect(parseLocalDateTime('2026-01-01T24:00')).toBeNull();
    expect(parseLocalDateTime('')).toBeNull();
  });
});

describe('toLocalInputValue', () => {
  it('round-trips with parseLocalDateTime', () => {
    const date = new Date('2026-07-25T17:00:00.000Z');
    expect(toLocalInputValue(date)).toBe('2026-07-25T20:00');
    expect(parseLocalDateTime(toLocalInputValue(date))?.getTime()).toBe(date.getTime());
  });
});

describe('localDateKey', () => {
  it('uses the Bucharest calendar day', () => {
    // 22:30 UTC = 01:30 a doua zi in Bucuresti (vara)
    expect(localDateKey(new Date('2026-07-25T22:30:00Z'))).toBe('2026-07-26');
  });
});

describe('formatDateTimeRo', () => {
  it('formats in Romanian with Bucharest time', () => {
    const text = formatDateTimeRo(new Date('2026-07-25T17:00:00Z'));
    expect(text).toContain('iulie');
    expect(text).toContain('20:00');
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/time.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementeaza `lib/time.ts`**

```ts
import { pad2 } from './countdown';

export const TIME_ZONE = 'Europe/Bucharest';

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function zonedParts(date: Date): ZonedParts {
  const parts = partsFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute') };
}

function offsetMinutes(date: Date): number {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const truncated = Math.floor(date.getTime() / 60000) * 60000;
  return (asUtc - truncated) / 60000;
}

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** "YYYY-MM-DDTHH:mm" (valoarea unui input datetime-local) interpretat ca ora Bucurestiului. */
export function parseLocalDateTime(value: string): Date | null {
  const match = LOCAL_INPUT.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  const naive = Date.UTC(year, month - 1, day, hour, minute);
  let utc = naive - offsetMinutes(new Date(naive)) * 60000;
  utc = naive - offsetMinutes(new Date(utc)) * 60000;

  const check = zonedParts(new Date(utc));
  if (check.year !== year || check.month !== month || check.day !== day) return null;
  return new Date(utc);
}

export function toLocalInputValue(date: Date): string {
  const p = zonedParts(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function localDateKey(date: Date): string {
  const p = zonedParts(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

const longFormatter = new Intl.DateTimeFormat('ro-RO', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const shortFormatter = new Intl.DateTimeFormat('ro-RO', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDateTimeRo(date: Date): string {
  return longFormatter.format(date);
}

export function formatShortRo(date: Date): string {
  return shortFormatter.format(date);
}
```

- [ ] **Step 4: Ruleaza testul**

Run: `npx vitest run lib/time.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/time.ts lib/time.test.ts
git commit -m "feat: add Europe/Bucharest date conversion and formatting"
```

---

### Task 2: Escape HTML si URL-ul aplicatiei

**Files:**
- Create: `lib/escape.ts`, `lib/app-url.ts`
- Test: `lib/escape.test.ts`, `lib/app-url.test.ts`

- [ ] **Step 1: Scrie testele**

`lib/escape.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { escapeHtml } from './escape';

describe('escapeHtml', () => {
  it('escapes the five dangerous characters', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });
});
```

`lib/app-url.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { appUrl } from './app-url';

describe('appUrl', () => {
  it('prefers APP_URL without trailing slash', () => {
    expect(appUrl({ APP_URL: 'https://noi.example.com/' })).toBe('https://noi.example.com');
  });

  it('falls back to the Vercel production url', () => {
    expect(appUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'dateuri.vercel.app' })).toBe('https://dateuri.vercel.app');
  });

  it('falls back to localhost', () => {
    expect(appUrl({})).toBe('http://localhost:3000');
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/escape.test.ts lib/app-url.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementeaza**

`lib/escape.ts`:

```ts
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

`lib/app-url.ts`:

```ts
export function appUrl(source: Record<string, string | undefined> = process.env): string {
  const explicit = source.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = source.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}
```

- [ ] **Step 4: Ruleaza testele**

Run: `npx vitest run lib/escape.test.ts lib/app-url.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/escape.ts lib/escape.test.ts lib/app-url.ts lib/app-url.test.ts
git commit -m "feat: add html escaping and app url helpers"
```

---

### Task 3: Scheme de validare

**Files:**
- Create: `lib/validation.ts`
- Test: `lib/validation.test.ts`

- [ ] **Step 1: Scrie testul**

```ts
import { describe, it, expect } from 'vitest';
import { invitationSchema, respondSchema } from './validation';

const base = {
  title: '  Cina  ',
  message: 'Te astept cu drag',
  location: 'La noi acasa',
  startsAt: '2026-10-10T19:30',
  dressCode: '',
  theme: 'iarna',
  ideaId: '',
};

describe('invitationSchema', () => {
  it('parses and normalizes a valid invitation', () => {
    const r = invitationSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.title).toBe('Cina');
    expect(r.data.dressCode).toBeNull();
    expect(r.data.ideaId).toBeNull();
    expect(r.data.startsAt.toISOString()).toBe('2026-10-10T16:30:00.000Z');
  });

  it('reports field errors', () => {
    const r = invitationSchema.safeParse({ ...base, title: ' ', theme: 'vara', startsAt: 'maine' });
    expect(r.success).toBe(false);
    if (r.success) return;
    const paths = r.error.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(['title', 'theme', 'startsAt']));
  });

  it('enforces max lengths', () => {
    expect(invitationSchema.safeParse({ ...base, title: 'x'.repeat(121) }).success).toBe(false);
    expect(invitationSchema.safeParse({ ...base, message: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('rejects an idea id that is not a uuid', () => {
    expect(invitationSchema.safeParse({ ...base, ideaId: "1' OR 1=1" }).success).toBe(false);
  });
});

describe('respondSchema', () => {
  it('accepts a simple answer with an optional note', () => {
    const r = respondSchema.safeParse({ action: 'accept', proposedAt: '', note: '' });
    expect(r.success && r.data.note).toBeNull();
  });

  it('requires a valid proposedAt for reschedule', () => {
    expect(respondSchema.safeParse({ action: 'reschedule', proposedAt: '', note: '' }).success).toBe(false);
    const r = respondSchema.safeParse({ action: 'reschedule', proposedAt: '2026-10-11T18:00', note: 'Mai tarziu?' });
    expect(r.success).toBe(true);
  });

  it('rejects unknown actions', () => {
    expect(respondSchema.safeParse({ action: 'cancel', note: '' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/validation.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementeaza `lib/validation.ts`**

```ts
import { z } from 'zod';
import { LIMITS, THEMES } from './domain';
import { parseLocalDateTime } from './time';

const required = (label: string, max: number) =>
  z.string().trim().min(1, `${label} e obligatoriu`).max(max, `Maxim ${max} caractere`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maxim ${max} caractere`)
    .transform((v) => (v === '' ? null : v));

const localDateTime = z.string().transform((value, ctx) => {
  const date = parseLocalDateTime(value);
  if (!date) {
    ctx.addIssue({ code: 'custom', message: 'Alege data si ora' });
    return z.NEVER;
  }
  return date;
});

const optionalUuid = z
  .union([z.literal(''), z.uuid('Id invalid')])
  .transform((v) => (v === '' ? null : v));

export const invitationSchema = z.object({
  title: required('Titlul', LIMITS.titleMax),
  message: required('Mesajul', LIMITS.messageMax),
  location: required('Locul', LIMITS.locationMax),
  startsAt: localDateTime,
  dressCode: optionalText(LIMITS.dressCodeMax),
  theme: z.enum(THEMES, { error: 'Alege o tema' }),
  ideaId: optionalUuid,
});

export type InvitationInput = z.infer<typeof invitationSchema>;

const note = optionalText(LIMITS.responseNoteMax);

export const respondSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept'), note }),
  z.object({ action: z.literal('decline'), note }),
  z.object({ action: z.literal('reschedule'), proposedAt: localDateTime, note }),
]);

export type RespondInput = z.infer<typeof respondSchema>;
```

- [ ] **Step 4: Ruleaza testul**

Run: `npx vitest run lib/validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validation.ts lib/validation.test.ts
git commit -m "feat: add zod schemas for invitations and responses"
```

---

### Task 4: State machine

**Files:**
- Create: `lib/invitations/state-machine.ts`
- Test: `lib/invitations/state-machine.test.ts`

- [ ] **Step 1: Scrie testul**

```ts
import { describe, it, expect } from 'vitest';
import { transition, canPerform, type InvitationState } from './state-machine';

const NOW = new Date('2026-09-28T12:00:00Z');
const FUTURE = new Date('2026-10-05T17:00:00Z');
const PAST = new Date('2026-09-20T17:00:00Z');

const inv = (over: Partial<InvitationState> = {}): InvitationState => ({
  fromUser: 'el',
  toUser: 'ea',
  status: 'pending',
  startsAt: FUTURE,
  proposedAt: null,
  ...over,
});

describe('transition: recipient answers', () => {
  it('accepts', () => {
    const r = transition(inv(), 'ea', { type: 'accept' }, NOW);
    expect(r).toMatchObject({ ok: true, changes: { status: 'accepted' }, notification: 'invite_response', isResponse: true });
  });

  it('declines', () => {
    expect(transition(inv(), 'ea', { type: 'decline' }, NOW)).toMatchObject({ ok: true, changes: { status: 'declined' } });
  });

  it('proposes another time in the future', () => {
    const proposedAt = new Date('2026-10-06T17:00:00Z');
    const r = transition(inv(), 'ea', { type: 'reschedule', proposedAt }, NOW);
    expect(r).toMatchObject({ ok: true, changes: { status: 'reschedule', proposedAt } });
  });

  it('rejects a proposed time in the past', () => {
    const r = transition(inv(), 'ea', { type: 'reschedule', proposedAt: PAST }, NOW);
    expect(r).toMatchObject({ ok: false, code: 'invalid', fields: { proposedAt: expect.any(String) } });
  });

  it('forbids the creator from answering', () => {
    expect(transition(inv(), 'el', { type: 'accept' }, NOW)).toMatchObject({ ok: false, code: 'forbidden' });
  });

  it('rejects answering twice', () => {
    expect(transition(inv({ status: 'accepted' }), 'ea', { type: 'decline' }, NOW)).toMatchObject({ ok: false, code: 'invalid' });
  });

  it('rejects answering after the date passed', () => {
    expect(transition(inv({ startsAt: PAST }), 'ea', { type: 'accept' }, NOW)).toMatchObject({ ok: false, code: 'invalid' });
  });
});

describe('transition: creator actions', () => {
  const proposedAt = new Date('2026-10-07T17:00:00Z');

  it('accepts the proposed time', () => {
    const r = transition(inv({ status: 'reschedule', proposedAt }), 'el', { type: 'acceptProposal' }, NOW);
    expect(r).toMatchObject({
      ok: true,
      changes: { status: 'accepted', startsAt: proposedAt, proposedAt: null },
      notification: 'reschedule_accepted',
      isResponse: false,
    });
  });

  it('forbids the recipient from accepting their own proposal', () => {
    const r = transition(inv({ status: 'reschedule', proposedAt }), 'ea', { type: 'acceptProposal' }, NOW);
    expect(r).toMatchObject({ ok: false, code: 'forbidden' });
  });

  it('rejects a proposal that already passed', () => {
    const r = transition(inv({ status: 'reschedule', proposedAt: PAST }), 'el', { type: 'acceptProposal' }, NOW);
    expect(r).toMatchObject({ ok: false, code: 'invalid' });
  });

  it.each(['pending', 'reschedule'] as const)('cancels a %s invitation', (status) => {
    const r = transition(inv({ status, proposedAt }), 'el', { type: 'cancel' }, NOW);
    expect(r).toMatchObject({ ok: true, changes: { status: 'cancelled' }, notification: 'invite_cancelled' });
  });

  it('cancels an accepted future invitation but not a past one', () => {
    expect(transition(inv({ status: 'accepted' }), 'el', { type: 'cancel' }, NOW).ok).toBe(true);
    expect(transition(inv({ status: 'accepted', startsAt: PAST }), 'el', { type: 'cancel' }, NOW).ok).toBe(false);
  });

  it.each(['declined', 'cancelled'] as const)('cannot cancel a %s invitation', (status) => {
    expect(transition(inv({ status }), 'el', { type: 'cancel' }, NOW).ok).toBe(false);
  });

  it('forbids the recipient from cancelling', () => {
    expect(transition(inv(), 'ea', { type: 'cancel' }, NOW)).toMatchObject({ ok: false, code: 'forbidden' });
  });
});

describe('canPerform', () => {
  it('drives which buttons appear', () => {
    expect(canPerform(inv(), 'ea', 'reschedule', NOW)).toBe(true);
    expect(canPerform(inv(), 'el', 'reschedule', NOW)).toBe(false);
    expect(canPerform(inv(), 'el', 'cancel', NOW)).toBe(true);
    expect(canPerform(inv(), 'el', 'acceptProposal', NOW)).toBe(false);
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/invitations/state-machine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementeaza `lib/invitations/state-machine.ts`**

```ts
import type { InvitationStatus, NotificationType, UserId } from '../domain';

export type InvitationAction =
  | { type: 'accept' }
  | { type: 'decline' }
  | { type: 'reschedule'; proposedAt: Date }
  | { type: 'acceptProposal' }
  | { type: 'cancel' };

export type InvitationActionType = InvitationAction['type'];

export interface InvitationState {
  fromUser: UserId;
  toUser: UserId;
  status: InvitationStatus;
  startsAt: Date;
  proposedAt: Date | null;
}

export interface TransitionChanges {
  status: InvitationStatus;
  startsAt?: Date;
  proposedAt?: Date | null;
}

export type TransitionResult =
  | { ok: true; changes: TransitionChanges; notification: NotificationType; isResponse: boolean }
  | { ok: false; code: 'forbidden' | 'invalid'; error: string; fields?: Record<string, string> };

const FORBIDDEN: TransitionResult = { ok: false, code: 'forbidden', error: 'Nu poti face asta pentru invitatia asta.' };

function invalid(error: string, fields?: Record<string, string>): TransitionResult {
  return fields ? { ok: false, code: 'invalid', error, fields } : { ok: false, code: 'invalid', error };
}

function allow(changes: TransitionChanges, notification: NotificationType, isResponse: boolean): TransitionResult {
  return { ok: true, changes, notification, isResponse };
}

/** Singura sursa de adevar pentru ce se poate face cu o invitatie. Actorul vine din sesiune. */
export function transition(
  inv: InvitationState,
  actor: UserId,
  action: InvitationAction,
  now: Date,
): TransitionResult {
  const isFuture = (date: Date) => date.getTime() > now.getTime();

  switch (action.type) {
    case 'accept':
    case 'decline':
    case 'reschedule': {
      if (actor !== inv.toUser) return FORBIDDEN;
      if (inv.status !== 'pending') return invalid('Ai raspuns deja la invitatia asta.');
      if (!isFuture(inv.startsAt)) return invalid('Data invitatiei a trecut.');
      if (action.type === 'accept') return allow({ status: 'accepted' }, 'invite_response', true);
      if (action.type === 'decline') return allow({ status: 'declined' }, 'invite_response', true);
      if (!isFuture(action.proposedAt)) {
        return invalid('Verifica ora propusa.', { proposedAt: 'Alege o ora din viitor' });
      }
      return allow({ status: 'reschedule', proposedAt: action.proposedAt }, 'invite_response', true);
    }
    case 'acceptProposal': {
      if (actor !== inv.fromUser) return FORBIDDEN;
      if (inv.status !== 'reschedule' || !inv.proposedAt) return invalid('Nu exista o ora propusa.');
      if (!isFuture(inv.proposedAt)) return invalid('Ora propusa a trecut deja.');
      return allow({ status: 'accepted', startsAt: inv.proposedAt, proposedAt: null }, 'reschedule_accepted', false);
    }
    case 'cancel': {
      if (actor !== inv.fromUser) return FORBIDDEN;
      const cancellable =
        inv.status === 'pending' || inv.status === 'reschedule' || (inv.status === 'accepted' && isFuture(inv.startsAt));
      if (!cancellable) return invalid('Invitatia nu mai poate fi anulata.');
      return allow({ status: 'cancelled' }, 'invite_cancelled', false);
    }
  }
}

export function canPerform(inv: InvitationState, actor: UserId, type: InvitationActionType, now: Date): boolean {
  const action: InvitationAction =
    type === 'reschedule' ? { type, proposedAt: new Date(now.getTime() + 60 * 60 * 1000) } : { type };
  return transition(inv, actor, action, now).ok;
}
```

- [ ] **Step 4: Ruleaza testul**

Run: `npx vitest run lib/invitations/state-machine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/invitations
git commit -m "feat: add invitation state machine"
```

---

### Task 5: Gruparea din dashboard

**Files:**
- Create: `lib/invitations/group.ts`
- Test: `lib/invitations/group.test.ts`

- [ ] **Step 1: Scrie testul**

```ts
import { describe, it, expect } from 'vitest';
import { groupInvitations, type Groupable } from './group';

const NOW = new Date('2026-09-28T12:00:00Z');
const at = (iso: string) => new Date(iso);

type Row = Groupable & { id: string };
const row = (id: string, over: Partial<Row>): Row => ({
  id,
  fromUser: 'el',
  toUser: 'ea',
  status: 'pending',
  startsAt: at('2026-10-10T17:00:00Z'),
  proposedAt: null,
  ...over,
});

describe('groupInvitations', () => {
  const list: Row[] = [
    row('acc-later', { status: 'accepted', startsAt: at('2026-10-20T17:00:00Z') }),
    row('acc-soon', { status: 'accepted', startsAt: at('2026-10-01T17:00:00Z') }),
    row('acc-past', { status: 'accepted', startsAt: at('2026-09-01T17:00:00Z') }),
    row('pending-for-ea', { status: 'pending' }),
    row('pending-from-ea', { status: 'pending', fromUser: 'ea', toUser: 'el' }),
    row('resched-mine', { status: 'reschedule', proposedAt: at('2026-10-12T17:00:00Z') }),
    row('pending-expired', { status: 'pending', startsAt: at('2026-09-10T17:00:00Z') }),
    row('declined', { status: 'declined', startsAt: at('2026-09-15T17:00:00Z') }),
    row('cancelled', { status: 'cancelled', startsAt: at('2026-09-25T17:00:00Z') }),
  ];

  it('groups from the point of view of el', () => {
    const g = groupInvitations(list, 'el', NOW);
    expect(g.next?.id).toBe('acc-soon');
    expect(g.upcoming.map((i) => i.id)).toEqual(['acc-later']);
    // el trebuie sa raspunda la invitatia ei si sa decida asupra orei propuse de ea
    expect(g.awaitingMe.map((i) => i.id)).toEqual(['pending-from-ea', 'resched-mine']);
    expect(g.awaitingOther.map((i) => i.id)).toEqual(['pending-for-ea']);
    expect(g.history.map((i) => i.id)).toEqual(['cancelled', 'declined', 'pending-expired', 'acc-past']);
  });

  it('flips pending groups for ea', () => {
    const g = groupInvitations(list, 'ea', NOW);
    expect(g.awaitingMe.map((i) => i.id)).toEqual(['pending-for-ea']);
    expect(g.awaitingOther.map((i) => i.id)).toEqual(['pending-from-ea', 'resched-mine']);
  });

  it('returns empty groups for an empty list', () => {
    expect(groupInvitations([], 'el', NOW)).toEqual({ next: null, upcoming: [], awaitingMe: [], awaitingOther: [], history: [] });
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/invitations/group.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementeaza `lib/invitations/group.ts`**

```ts
import type { UserId } from '../domain';
import type { InvitationRow } from '../db/schema';

export type Groupable = Pick<InvitationRow, 'fromUser' | 'toUser' | 'status' | 'startsAt' | 'proposedAt'>;

export interface DashboardGroups<T> {
  /** Cel mai apropiat date acceptat (hero). Nu apare si in `upcoming`. */
  next: T | null;
  upcoming: T[];
  /** Asteapta o actiune de la mine: raspuns la invitatie sau decizie asupra orei propuse. */
  awaitingMe: T[];
  awaitingOther: T[];
  history: T[];
}

export function groupInvitations<T extends Groupable>(list: readonly T[], me: UserId, now: Date): DashboardGroups<T> {
  const t = now.getTime();
  const upcoming: T[] = [];
  const awaitingMe: T[] = [];
  const awaitingOther: T[] = [];
  const history: T[] = [];

  for (const inv of list) {
    const start = inv.startsAt.getTime();
    if (inv.status === 'accepted') {
      (start > t ? upcoming : history).push(inv);
    } else if (inv.status === 'pending' || inv.status === 'reschedule') {
      const latest = Math.max(start, inv.proposedAt?.getTime() ?? 0);
      if (latest <= t) {
        history.push(inv);
        continue;
      }
      const mine = inv.status === 'pending' ? inv.toUser === me : inv.fromUser === me;
      (mine ? awaitingMe : awaitingOther).push(inv);
    } else {
      history.push(inv);
    }
  }

  const byStart = (a: T, b: T) => a.startsAt.getTime() - b.startsAt.getTime();
  upcoming.sort(byStart);
  awaitingMe.sort(byStart);
  awaitingOther.sort(byStart);
  history.sort((a, b) => byStart(b, a));

  return { next: upcoming[0] ?? null, upcoming: upcoming.slice(1), awaitingMe, awaitingOther, history };
}
```

- [ ] **Step 4: Ruleaza testul**

Run: `npx vitest run lib/invitations/group.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/invitations/group.ts lib/invitations/group.test.ts
git commit -m "feat: group invitations for the dashboard"
```

---

### Task 6: Notificari (text, insert, query-uri, email)

**Files:**
- Create: `lib/notifications/describe.ts`, `lib/notifications/create.ts`, `lib/notifications/queries.ts`, `lib/notifications/email.ts`
- Test: `lib/notifications/describe.test.ts`, `lib/notifications/email.test.ts`

- [ ] **Step 1: Scrie testele**

`lib/notifications/describe.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { describeNotification, notificationHref } from './describe';

describe('describeNotification', () => {
  it('describes each response precisely when the status is known', () => {
    const base = { type: 'invite_response' as const, actorName: 'Ana', title: 'Cina' };
    expect(describeNotification({ ...base, status: 'accepted' })).toBe('Ana a acceptat invitatia "Cina"');
    expect(describeNotification({ ...base, status: 'declined' })).toBe('Ana a refuzat invitatia "Cina"');
    expect(describeNotification({ ...base, status: 'reschedule' })).toBe('Ana propune alta ora pentru "Cina"');
    expect(describeNotification(base)).toBe('Ana a raspuns la invitatia "Cina"');
  });

  it('describes a new idea without a title', () => {
    expect(describeNotification({ type: 'idea_added', actorName: 'Ana', title: null })).toBe('Ana a adaugat o idee noua');
  });
});

describe('notificationHref', () => {
  it('links to the invitation or to ideas', () => {
    expect(notificationHref('invite_new', 'abc')).toBe('/invitatii/abc');
    expect(notificationHref('idea_added', null)).toBe('/idei');
  });
});
```

`lib/notifications/email.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { shouldEmail, buildNotificationEmail, type NotificationEvent } from './email';

const event: NotificationEvent = {
  recipient: 'el',
  actor: 'ea',
  type: 'invite_new',
  invitationId: '11111111-1111-4111-8111-111111111111',
  title: '<script>alert(1)</script>\r\nBcc: x@evil.com',
};

describe('shouldEmail', () => {
  it('emails only el, only for invitation events', () => {
    expect(shouldEmail(event)).toBe(true);
    expect(shouldEmail({ ...event, recipient: 'ea' })).toBe(false);
    expect(shouldEmail({ ...event, type: 'idea_added' })).toBe(false);
    expect(shouldEmail({ ...event, type: 'memory_added' })).toBe(false);
  });
});

describe('buildNotificationEmail', () => {
  const email = buildNotificationEmail(event, 'Ana', 'https://noi.example.com');

  it('escapes user content in html', () => {
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('keeps the subject on one line', () => {
    expect(email.subject).not.toMatch(/[\r\n]/);
  });

  it('links to the invitation', () => {
    expect(email.text).toContain('https://noi.example.com/invitatii/11111111-1111-4111-8111-111111111111');
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/notifications`
Expected: FAIL.

- [ ] **Step 3: Implementeaza**

`lib/notifications/describe.ts`:

```ts
import type { InvitationStatus, NotificationType } from '../domain';

export interface DescribeInput {
  type: NotificationType;
  actorName: string;
  title: string | null;
  status?: InvitationStatus;
}

export function describeNotification({ type, actorName, title, status }: DescribeInput): string {
  const quoted = title ? `"${title}"` : 'o invitatie';
  switch (type) {
    case 'invite_new':
      return `${actorName} te-a invitat la ${quoted}`;
    case 'invite_response':
      if (status === 'accepted') return `${actorName} a acceptat invitatia ${quoted}`;
      if (status === 'declined') return `${actorName} a refuzat invitatia ${quoted}`;
      if (status === 'reschedule') return `${actorName} propune alta ora pentru ${quoted}`;
      return `${actorName} a raspuns la invitatia ${quoted}`;
    case 'reschedule_accepted':
      return `${actorName} a acceptat ora propusa pentru ${quoted}`;
    case 'invite_cancelled':
      return `${actorName} a anulat invitatia ${quoted}`;
    case 'memory_added':
      return `${actorName} a scris o amintire despre ${quoted}`;
    case 'idea_added':
      return `${actorName} a adaugat o idee noua`;
  }
}

export function notificationHref(type: NotificationType, invitationId: string | null): string {
  if (invitationId) return `/invitatii/${invitationId}`;
  return type === 'idea_added' ? '/idei' : '/notificari';
}
```

`lib/notifications/create.ts`:

```ts
import type { DbOrTx } from '../db/client';
import { notifications } from '../db/schema';
import type { NotificationType, UserId } from '../domain';
import { newId } from '../ids';

export interface NewNotification {
  recipient: UserId;
  type: NotificationType;
  invitationId: string | null;
  now: Date;
}

export async function insertNotification(db: DbOrTx, input: NewNotification): Promise<void> {
  await db.insert(notifications).values({
    id: newId(),
    recipient: input.recipient,
    type: input.type,
    invitationId: input.invitationId,
    readAt: null,
    createdAt: input.now,
  });
}
```

`lib/notifications/queries.ts`:

```ts
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { invitations, notifications } from '../db/schema';
import type { InvitationStatus, NotificationType, UserId } from '../domain';

export async function countUnread(db: Db, user: UserId): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(notifications)
    .where(and(eq(notifications.recipient, user), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

export interface NotificationView {
  id: string;
  type: NotificationType;
  invitationId: string | null;
  title: string | null;
  status: InvitationStatus | null;
  readAt: Date | null;
  createdAt: Date;
}

export async function listNotifications(db: Db, user: UserId, limit = 100): Promise<NotificationView[]> {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      invitationId: notifications.invitationId,
      title: invitations.title,
      status: invitations.status,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .leftJoin(invitations, eq(notifications.invitationId, invitations.id))
    .where(eq(notifications.recipient, user))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markAllRead(db: Db, user: UserId, now: Date): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.recipient, user), isNull(notifications.readAt)));
}

export async function markReadForInvitation(db: Db, user: UserId, invitationId: string, now: Date): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: now })
    .where(
      and(eq(notifications.recipient, user), eq(notifications.invitationId, invitationId), isNull(notifications.readAt)),
    );
}
```

`lib/notifications/email.ts`:

```ts
import { Resend } from 'resend';
import type { InvitationStatus, NotificationType, UserId } from '../domain';
import { env } from '../env';
import { escapeHtml } from '../escape';
import { appUrl } from '../app-url';
import { log, errorName } from '../log';
import { displayName } from '../auth/display-names';
import { describeNotification, notificationHref } from './describe';

export interface NotificationEvent {
  recipient: UserId;
  actor: UserId;
  type: NotificationType;
  invitationId: string | null;
  title: string | null;
  status?: InvitationStatus;
}

const EMAIL_TYPES = new Set<NotificationType>(['invite_new', 'invite_response', 'reschedule_accepted', 'invite_cancelled']);

/** Resend e in sandbox: poate trimite doar la adresa contului (EMAIL_EL). */
export function shouldEmail(event: NotificationEvent): boolean {
  return event.recipient === 'el' && EMAIL_TYPES.has(event.type);
}

export function buildNotificationEmail(event: NotificationEvent, actorName: string, baseUrl: string) {
  const summary = describeNotification({ type: event.type, actorName, title: event.title, status: event.status });
  const oneLine = summary.replace(/[\r\n]+/g, ' ');
  const link = `${baseUrl}${notificationHref(event.type, event.invitationId)}`;
  const html = `<!doctype html>
<html lang="ro"><body style="margin:0;padding:24px;background:#fff8fb;font-family:Arial,sans-serif;color:#3a2540;">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px;">
<p style="font-size:18px;line-height:1.5;margin:0 0 20px;">${escapeHtml(oneLine)}</p>
<a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#ffafcc;color:#3a2540;text-decoration:none;font-weight:bold;">Deschide in aplicatie</a>
</div></body></html>`;
  return { subject: oneLine, html, text: `${oneLine}\n\n${link}` };
}

/** Nu arunca niciodata: esecul emailului nu trebuie sa strice actiunea. */
export async function sendNotificationEmail(event: NotificationEvent): Promise<void> {
  if (!shouldEmail(event)) return;
  try {
    const e = env();
    const email = buildNotificationEmail(event, displayName(event.actor), appUrl());
    const { error } = await new Resend(e.RESEND_API_KEY).emails.send({
      from: 'Dateurile noastre <onboarding@resend.dev>',
      to: e.EMAIL_EL,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) log('error', 'email_failed', { type: event.type, reason: error.name });
  } catch (err) {
    log('error', 'email_failed', { type: event.type, reason: errorName(err) });
  }
}
```

- [ ] **Step 4: Ruleaza testele**

Run: `npx vitest run lib/notifications`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/notifications
git commit -m "feat: add notification text, storage, queries and email"
```

---

### Task 7: Query-uri si servicii pentru invitatii

**Files:**
- Create: `lib/invitations/queries.ts`, `lib/invitations/service.ts`
- Test: `lib/invitations/service.int.test.ts`

- [ ] **Step 1: Scrie testul de integrare**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { hasTestDb, testDb, resetDb } from '@/test/db';
import { notifications } from '@/lib/db/schema';
import { createInvitation, applyInvitationAction } from './service';
import { getInvitation, listDashboardInvitations } from './queries';
import { countUnread, markReadForInvitation } from '../notifications/queries';
import type { InvitationInput } from '../validation';

const NOW = new Date('2026-09-28T12:00:00Z');
const input: InvitationInput = {
  title: 'Cina',
  message: 'Te astept',
  location: 'Acasa',
  startsAt: new Date('2026-10-05T17:00:00Z'),
  dressCode: null,
  theme: 'amandoua',
  ideaId: null,
};

describe.skipIf(!hasTestDb)('invitation service', () => {
  const db = hasTestDb ? testDb() : (null as never);

  beforeEach(async () => {
    await resetDb(db);
  });

  async function created() {
    const r = await createInvitation(db, 'el', input, NOW);
    if (!r.ok) throw new Error(r.error);
    return r.value.id;
  }

  it('creates a pending invitation and notifies the other user', async () => {
    const r = await createInvitation(db, 'el', input, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.event).toMatchObject({ recipient: 'ea', actor: 'el', type: 'invite_new', title: 'Cina' });
    const inv = await getInvitation(db, r.value.id);
    expect(inv).toMatchObject({ fromUser: 'el', toUser: 'ea', status: 'pending' });
    expect(await countUnread(db, 'ea')).toBe(1);
    expect(await countUnread(db, 'el')).toBe(0);
  });

  it('rejects a start date in the past', async () => {
    const r = await createInvitation(db, 'el', { ...input, startsAt: new Date('2026-09-01T10:00:00Z') }, NOW);
    expect(r).toMatchObject({ ok: false, code: 'invalid', fields: { startsAt: expect.any(String) } });
  });

  it('rejects an idea id that does not exist', async () => {
    const r = await createInvitation(db, 'el', { ...input, ideaId: '22222222-2222-4222-8222-222222222222' }, NOW);
    expect(r).toMatchObject({ ok: false, code: 'invalid' });
  });

  it('lets the recipient accept with a note and notifies the creator', async () => {
    const id = await created();
    const r = await applyInvitationAction(db, 'ea', id, { type: 'accept' }, NOW, 'Abia astept');
    expect(r.ok).toBe(true);
    expect(await getInvitation(db, id)).toMatchObject({ status: 'accepted', responseNote: 'Abia astept' });
    expect(await countUnread(db, 'el')).toBe(1);
  });

  it('does not let the creator answer their own invitation', async () => {
    const id = await created();
    const r = await applyInvitationAction(db, 'el', id, { type: 'accept' }, NOW);
    expect(r).toMatchObject({ ok: false, code: 'forbidden' });
    expect((await getInvitation(db, id))?.status).toBe('pending');
  });

  it('runs the reschedule flow', async () => {
    const id = await created();
    const proposedAt = new Date('2026-10-06T18:00:00Z');
    expect((await applyInvitationAction(db, 'ea', id, { type: 'reschedule', proposedAt }, NOW)).ok).toBe(true);
    expect((await applyInvitationAction(db, 'el', id, { type: 'acceptProposal' }, NOW)).ok).toBe(true);
    const inv = await getInvitation(db, id);
    expect(inv?.status).toBe('accepted');
    expect(inv?.startsAt.toISOString()).toBe(proposedAt.toISOString());
    expect(inv?.proposedAt).toBeNull();
  });

  it('only the creator can cancel', async () => {
    const id = await created();
    expect(await applyInvitationAction(db, 'ea', id, { type: 'cancel' }, NOW)).toMatchObject({ ok: false, code: 'forbidden' });
    expect((await applyInvitationAction(db, 'el', id, { type: 'cancel' }, NOW)).ok).toBe(true);
    expect((await getInvitation(db, id))?.status).toBe('cancelled');
  });

  it('returns not_found for unknown or malformed ids', async () => {
    expect(await applyInvitationAction(db, 'ea', '33333333-3333-4333-8333-333333333333', { type: 'accept' }, NOW)).toMatchObject({
      ok: false,
      code: 'not_found',
    });
    expect(await getInvitation(db, 'not-a-uuid')).toBeNull();
  });

  it('hides old cancelled invitations from the dashboard query', async () => {
    const id = await created();
    // updated_at = 20 sept: vizibila pe 28 sept (sub 30 zile), ascunsa pe 1 dec
    await applyInvitationAction(db, 'el', id, { type: 'cancel' }, new Date('2026-09-20T00:00:00Z'));
    expect(await listDashboardInvitations(db, NOW)).toHaveLength(1);
    expect(await listDashboardInvitations(db, new Date('2026-12-01T00:00:00Z'))).toHaveLength(0);
  });

  it('marks notifications of an invitation as read', async () => {
    const id = await created();
    await markReadForInvitation(db, 'ea', id, NOW);
    expect(await countUnread(db, 'ea')).toBe(0);
    const rows = await db.select().from(notifications).where(eq(notifications.invitationId, id));
    expect(rows[0].readAt).not.toBeNull();
  });
});
```

Nota: testul "hides old cancelled" anuleaza cu un `now` explicit doar ca sa controleze `updated_at`; tranzitia `cancel` e permisa pentru `pending` indiferent de data.

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/invitations/service.int.test.ts`
Expected: FAIL la import (cu `TEST_DATABASE_URL` setat) sau skipped (fara). Daca e skipped, seteaza `.env.test.local` inainte sa continui; testele de integrare sunt obligatorii pentru acest task.

- [ ] **Step 3: Implementeaza `lib/invitations/queries.ts`**

```ts
import { and, asc, eq, gt, gte, lt, ne, or } from 'drizzle-orm';
import type { Db } from '../db/client';
import { invitations, type InvitationRow } from '../db/schema';
import { isUuid } from '../ids';

const CANCELLED_VISIBLE_MS = 30 * 24 * 60 * 60 * 1000;

/** Toate invitatiile relevante pentru dashboard, intr-un singur query. */
export async function listDashboardInvitations(db: Db, now: Date): Promise<InvitationRow[]> {
  const cutoff = new Date(now.getTime() - CANCELLED_VISIBLE_MS);
  return db
    .select()
    .from(invitations)
    .where(or(ne(invitations.status, 'cancelled'), gt(invitations.updatedAt, cutoff)))
    .orderBy(asc(invitations.startsAt));
}

export async function getInvitation(db: Db, id: string): Promise<InvitationRow | null> {
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
  return row ?? null;
}

/** Pentru calendar (Faza 3): invitatii ne-anulate intre doua momente. */
export async function listInvitationsBetween(db: Db, from: Date, to: Date): Promise<InvitationRow[]> {
  return db
    .select()
    .from(invitations)
    .where(and(ne(invitations.status, 'cancelled'), gte(invitations.startsAt, from), lt(invitations.startsAt, to)))
    .orderBy(asc(invitations.startsAt));
}
```

- [ ] **Step 4: Implementeaza `lib/invitations/service.ts`**

```ts
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { ideas, invitations } from '../db/schema';
import { otherUser, type UserId } from '../domain';
import { newId } from '../ids';
import { failure, ok, type Result } from '../result';
import type { InvitationInput } from '../validation';
import { insertNotification } from '../notifications/create';
import type { NotificationEvent } from '../notifications/email';
import { getInvitation } from './queries';
import { transition, type InvitationAction } from './state-machine';

export async function createInvitation(
  db: Db,
  actor: UserId,
  input: InvitationInput,
  now: Date,
): Promise<Result<{ id: string; event: NotificationEvent }>> {
  if (input.startsAt.getTime() <= now.getTime()) {
    return failure('invalid', 'Verifica campurile marcate.', { startsAt: 'Alege o data din viitor' });
  }
  if (input.ideaId) {
    const [idea] = await db.select({ id: ideas.id }).from(ideas).where(eq(ideas.id, input.ideaId)).limit(1);
    if (!idea) return failure('invalid', 'Ideea nu mai exista.');
  }

  const id = newId();
  const toUser = otherUser(actor);
  await db.transaction(async (tx) => {
    await tx.insert(invitations).values({
      id,
      fromUser: actor,
      toUser,
      title: input.title,
      message: input.message,
      location: input.location,
      startsAt: input.startsAt,
      dressCode: input.dressCode,
      theme: input.theme,
      status: 'pending',
      proposedAt: null,
      responseNote: null,
      ideaId: input.ideaId,
      createdAt: now,
      updatedAt: now,
    });
    await insertNotification(tx, { recipient: toUser, type: 'invite_new', invitationId: id, now });
  });

  return ok({ id, event: { recipient: toUser, actor, type: 'invite_new', invitationId: id, title: input.title } });
}

export async function applyInvitationAction(
  db: Db,
  actor: UserId,
  invitationId: string,
  action: InvitationAction,
  now: Date,
  note: string | null = null,
): Promise<Result<{ event: NotificationEvent }>> {
  const inv = await getInvitation(db, invitationId);
  if (!inv) return failure('not_found', 'Invitatia nu exista.');

  const t = transition(inv, actor, action, now);
  if (!t.ok) return failure(t.code, t.error, t.fields);

  const recipient = otherUser(actor);
  await db.transaction(async (tx) => {
    await tx
      .update(invitations)
      .set({ ...t.changes, ...(t.isResponse ? { responseNote: note } : {}), updatedAt: now })
      // Conditia pe status previne aplicarea unei tranzitii peste o stare schimbata intre timp.
      .where(and(eq(invitations.id, inv.id), eq(invitations.status, inv.status)));
    await insertNotification(tx, { recipient, type: t.notification, invitationId: inv.id, now });
  });

  return ok({
    event: {
      recipient,
      actor,
      type: t.notification,
      invitationId: inv.id,
      title: inv.title,
      status: t.changes.status,
    },
  });
}
```

- [ ] **Step 5: Ruleaza testele**

Run: `npx vitest run lib/invitations`
Expected: PASS (inclusiv `service.int.test.ts` cu baza de test).

- [ ] **Step 6: Commit**

```bash
git add lib/invitations
git commit -m "feat: add invitation queries and services with notifications"
```

---

### Task 8: Componente comune si header cu badge

**Files:**
- Create: `components/ui/ActionButtonForm.tsx`, `components/StatusPill.tsx`, `components/InvitationCard.tsx`
- Modify: `components/AppHeader.tsx` (rescris), `app/(app)/layout.tsx` (rescris), `app/globals.css` (adaugare la final)

- [ ] **Step 1: Scrie `components/ui/ActionButtonForm.tsx`**

```tsx
'use client';

import { useActionState } from 'react';
import type { ActionState } from '@/lib/result';
import SubmitButton from './SubmitButton';

interface ActionButtonFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  label: string;
  pendingLabel?: string;
  variant?: 'primary' | 'ghost' | 'danger';
  confirmText?: string;
}

export default function ActionButtonForm({ action, label, pendingLabel, variant = 'ghost', confirmText }: ActionButtonFormProps) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirmText && !window.confirm(confirmText)) event.preventDefault();
      }}
    >
      <SubmitButton label={label} pendingLabel={pendingLabel} variant={variant} />
      {state && !state.ok && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && state.message && (
        <p className="form-success" role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Scrie `components/StatusPill.tsx` si `components/InvitationCard.tsx`**

`components/StatusPill.tsx`:

```tsx
import { STATUS_LABELS, type InvitationStatus } from '@/lib/domain';

export default function StatusPill({ status }: { status: InvitationStatus }) {
  return <span className={`status status-${status}`}>{STATUS_LABELS[status]}</span>;
}
```

`components/InvitationCard.tsx`:

```tsx
import Link from 'next/link';
import type { InvitationRow } from '@/lib/db/schema';
import type { UserId } from '@/lib/domain';
import { formatDateTimeRo } from '@/lib/time';
import StatusPill from './StatusPill';

type CardInvitation = Pick<
  InvitationRow,
  'id' | 'title' | 'location' | 'startsAt' | 'status' | 'fromUser' | 'toUser' | 'proposedAt'
>;

interface InvitationCardProps {
  invitation: CardInvitation;
  me: UserId;
  names: Record<UserId, string>;
}

export default function InvitationCard({ invitation, me, names }: InvitationCardProps) {
  const direction =
    invitation.fromUser === me ? `Pentru ${names[invitation.toUser]}` : `De la ${names[invitation.fromUser]}`;
  return (
    <Link href={`/invitatii/${invitation.id}`} className="card invitation-card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="eyebrow">{direction}</span>
        <StatusPill status={invitation.status} />
      </div>
      <h3>{invitation.title}</h3>
      <p className="muted">{formatDateTimeRo(invitation.startsAt)}</p>
      <p className="muted">{invitation.location}</p>
      {invitation.status === 'reschedule' && invitation.proposedAt && (
        <p>Ora propusa: {formatDateTimeRo(invitation.proposedAt)}</p>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Rescrie `components/AppHeader.tsx`**

```tsx
import Link from 'next/link';
import { logoutAction } from '@/app/(auth)/actions';

export interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

export function buildNav(unread: number): NavItem[] {
  return [
    { href: '/', label: 'Acasa' },
    { href: '/invitatii/noua', label: 'Invitatie noua' },
    { href: '/notificari', label: 'Notificari', badge: unread },
  ];
}

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
              <>
                <span className="badge" aria-hidden="true">
                  {item.badge}
                </span>
                <span className="sr-only">{item.badge} necitite</span>
              </>
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

- [ ] **Step 4: Rescrie `app/(app)/layout.tsx`**

```tsx
import type { ReactNode } from 'react';
import AppHeader, { buildNav } from '@/components/AppHeader';
import SkyBackground from '@/components/SkyBackground';
import { requireSession } from '@/lib/auth/require-session';
import { displayName } from '@/lib/auth/display-names';
import { getDb } from '@/lib/db/client';
import { countUnread } from '@/lib/notifications/queries';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await requireSession();
  const unread = await countUnread(getDb(), me);
  return (
    <>
      <SkyBackground theme="amandoua" />
      <div className="app-shell">
        <AppHeader name={displayName(me)} items={buildNav(unread)} />
        <main className="page">{children}</main>
      </div>
    </>
  );
}
```

- [ ] **Step 5: Adauga la finalul `app/globals.css`**

```css
/* Faza 2: invitatii si notificari */
.hero { display: grid; gap: 12px; padding: 32px; }
.invitation-card { display: grid; gap: 6px; text-decoration: none; transition: transform 150ms ease; }
.invitation-card:hover { transform: translateY(-2px); }
.invitation-message { white-space: pre-line; font-size: 1.1rem; }
.details-list { display: grid; gap: 10px; }
.details-list div { display: grid; grid-template-columns: 140px 1fr; gap: 8px; }
.details-list dt { font-weight: 600; color: var(--ink-soft); }
.notification-list { list-style: none; display: grid; gap: 10px; }
.notification { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; padding: 14px 18px; }
.notification.unread { border-left: 4px solid var(--pink-300); }
.notification a { text-decoration: none; font-weight: 500; }
@media (max-width: 640px) {
  .details-list div { grid-template-columns: 1fr; }
  .notification { flex-direction: column; }
  .hero { padding: 22px; }
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: fara erori.

- [ ] **Step 7: Commit**

```bash
git add components "app/(app)/layout.tsx" app/globals.css
git commit -m "feat: add invitation card, status pill and unread badge in header"
```

---

### Task 9: Dashboard

**Files:**
- Modify: `app/(app)/page.tsx` (rescris)

- [ ] **Step 1: Rescrie `app/(app)/page.tsx`**

```tsx
import Link from 'next/link';
import Countdown from '@/components/Countdown';
import InvitationCard from '@/components/InvitationCard';
import type { InvitationRow } from '@/lib/db/schema';
import { otherUser, type UserId } from '@/lib/domain';
import { requireSession } from '@/lib/auth/require-session';
import { displayNames } from '@/lib/auth/display-names';
import { getDb } from '@/lib/db/client';
import { listDashboardInvitations } from '@/lib/invitations/queries';
import { groupInvitations } from '@/lib/invitations/group';
import { formatDateTimeRo } from '@/lib/time';

interface SectionProps {
  title: string;
  items: InvitationRow[];
  empty?: string;
  me: UserId;
  names: Record<UserId, string>;
}

function InvitationSection({ title, items, empty, me, names }: SectionProps) {
  if (items.length === 0 && !empty) return null;
  return (
    <section className="stack" aria-label={title}>
      <h2>{title}</h2>
      {items.length > 0 ? (
        <div className="grid-2">
          {items.map((inv) => (
            <InvitationCard key={inv.id} invitation={inv} me={me} names={names} />
          ))}
        </div>
      ) : (
        <p className="muted">{empty}</p>
      )}
    </section>
  );
}

export default async function DashboardPage() {
  const me = await requireSession();
  const now = new Date();
  const groups = groupInvitations(await listDashboardInvitations(getDb(), now), me, now);
  const names = displayNames();
  const next = groups.next;

  return (
    <div className="stack">
      <section className="card hero">
        {next ? (
          <>
            <p className="eyebrow">Urmatorul date</p>
            <h1>{next.title}</h1>
            <p>
              {formatDateTimeRo(next.startsAt)} · {next.location}
            </p>
            <Countdown targetISO={next.startsAt.toISOString()} label="Mai sunt" completeLabel="E acum!" />
            <div className="row">
              <Link className="btn btn-primary" href={`/invitatii/${next.id}`}>
                Vezi invitatia
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">Salut, {names[me]}</p>
            <h1>Niciun date planificat</h1>
            <p className="muted">Hai sa schimbam asta.</p>
            <div className="row">
              <Link className="btn btn-primary" href="/invitatii/noua">
                Creeaza o invitatie
              </Link>
            </div>
          </>
        )}
      </section>

      <InvitationSection title="Asteapta raspunsul tau" items={groups.awaitingMe} me={me} names={names} />
      <InvitationSection title="Urmatoare" items={groups.upcoming} me={me} names={names} />
      <InvitationSection
        title={`Asteapta raspuns de la ${names[otherUser(me)]}`}
        items={groups.awaitingOther}
        me={me}
        names={names}
      />
      <InvitationSection title="Istoric" items={groups.history} empty="Inca nu aveti dateuri in istoric." me={me} names={names} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: fara erori.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/page.tsx"
git commit -m "feat: add grouped dashboard with next date countdown"
```

---

### Task 10: Pagina de creare invitatie

**Files:**
- Create: `app/(app)/invitatii/noua/actions.ts`, `app/(app)/invitatii/noua/InvitationForm.tsx`, `app/(app)/invitatii/noua/page.tsx`

- [ ] **Step 1: Scrie `actions.ts`**

```ts
'use server';

import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { createInvitation } from '@/lib/invitations/service';
import { sendNotificationEmail } from '@/lib/notifications/email';
import { invitationSchema } from '@/lib/validation';
import { pickStrings, toFieldErrors } from '@/lib/form';
import { log, errorName } from '@/lib/log';
import { GENERIC_ERROR, type ActionState } from '@/lib/result';

const FIELDS = ['title', 'message', 'location', 'startsAt', 'dressCode', 'theme', 'ideaId'] as const;

export async function createInvitationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireSession();
  const values = pickStrings(formData, FIELDS);
  const parsed = invitationSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: 'Verifica campurile marcate.', fields: toFieldErrors(parsed.error), values };
  }

  let id: string;
  try {
    const result = await createInvitation(getDb(), actor, parsed.data, new Date());
    if (!result.ok) return { ok: false, error: result.error, fields: result.fields, values };
    const { event } = result.value;
    after(() => sendNotificationEmail(event));
    id = result.value.id;
  } catch (err) {
    log('error', 'create_invitation_failed', { reason: errorName(err) });
    return { ok: false, error: GENERIC_ERROR, values };
  }

  revalidatePath('/');
  redirect(`/invitatii/${id}`);
}
```

- [ ] **Step 2: Scrie `InvitationForm.tsx`**

```tsx
'use client';

import { useActionState, useState } from 'react';
import { createInvitationAction } from './actions';
import Field from '@/components/ui/Field';
import SubmitButton from '@/components/ui/SubmitButton';
import { LIMITS, THEMES, THEME_LABELS, type ThemeId } from '@/lib/domain';

export interface InvitationDefaults {
  title: string;
  message: string;
  ideaId: string;
}

interface InvitationFormProps {
  defaults: InvitationDefaults;
  minDateTime: string;
}

function isTheme(value: string | undefined): value is ThemeId {
  return THEMES.includes(value as ThemeId);
}

export default function InvitationForm({ defaults, minDateTime }: InvitationFormProps) {
  const [state, formAction] = useActionState(createInvitationAction, null);
  const failed = state && !state.ok ? state : null;
  const value = (key: string, fallback = '') => failed?.values?.[key] ?? fallback;
  const error = (key: string) => failed?.fields?.[key];
  const submittedTheme = failed?.values?.theme;
  const [theme, setTheme] = useState<ThemeId>(isTheme(submittedTheme) ? submittedTheme : 'amandoua');

  return (
    <form action={formAction} className="card form">
      <input type="hidden" name="ideaId" defaultValue={value('ideaId', defaults.ideaId)} />

      <Field label="Titlu" htmlFor="title" error={error('title')}>
        <input
          id="title"
          name="title"
          required
          maxLength={LIMITS.titleMax}
          defaultValue={value('title', defaults.title)}
          aria-invalid={Boolean(error('title'))}
          placeholder="Cina la lumina lumanarilor"
        />
      </Field>

      <Field label="Mesaj" htmlFor="message" error={error('message')}>
        <textarea
          id="message"
          name="message"
          required
          maxLength={LIMITS.messageMax}
          defaultValue={value('message', defaults.message)}
          aria-invalid={Boolean(error('message'))}
        />
      </Field>

      <Field label="Unde" htmlFor="location" error={error('location')}>
        <input
          id="location"
          name="location"
          required
          maxLength={LIMITS.locationMax}
          defaultValue={value('location')}
          aria-invalid={Boolean(error('location'))}
        />
      </Field>

      <Field label="Cand" htmlFor="startsAt" error={error('startsAt')} hint="Ora Romaniei">
        <input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          required
          min={minDateTime}
          defaultValue={value('startsAt')}
          aria-invalid={Boolean(error('startsAt'))}
        />
      </Field>

      <Field label="Dress code (optional)" htmlFor="dressCode" error={error('dressCode')}>
        <input id="dressCode" name="dressCode" maxLength={LIMITS.dressCodeMax} defaultValue={value('dressCode')} />
      </Field>

      <fieldset className="field">
        <legend>Tema</legend>
        <div className="choice-grid">
          {THEMES.map((t) => (
            <label key={t} className="choice">
              <input type="radio" name="theme" value={t} checked={theme === t} onChange={() => setTheme(t)} />
              <span>{THEME_LABELS[t]}</span>
            </label>
          ))}
        </div>
        {error('theme') && <p className="field-error">{error('theme')}</p>}
      </fieldset>

      {failed && (
        <p className="form-error" role="alert">
          {failed.error}
        </p>
      )}
      <SubmitButton label="Trimite invitatia" />
    </form>
  );
}
```

- [ ] **Step 3: Scrie `page.tsx`**

```tsx
import { requireSession } from '@/lib/auth/require-session';
import { toLocalInputValue } from '@/lib/time';
import InvitationForm, { type InvitationDefaults } from './InvitationForm';

export default async function NewInvitationPage() {
  await requireSession();
  const defaults: InvitationDefaults = { title: '', message: '', ideaId: '' };
  return (
    <div className="stack">
      <h1>Invitatie noua</h1>
      <InvitationForm defaults={defaults} minDateTime={toLocalInputValue(new Date())} />
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: fara erori.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/invitatii/noua"
git commit -m "feat: add new invitation page"
```

---

### Task 11: Pagina invitatiei si actiunile

**Files:**
- Create: `app/(app)/invitatii/[id]/actions.ts`, `InvitationDetails.tsx`, `ResponsePanel.tsx`, `CreatorActions.tsx`, `page.tsx` (toate in `app/(app)/invitatii/[id]/`)

- [ ] **Step 1: Scrie `actions.ts`**

```ts
'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import type { UserId } from '@/lib/domain';
import { applyInvitationAction } from '@/lib/invitations/service';
import type { InvitationAction } from '@/lib/invitations/state-machine';
import { sendNotificationEmail } from '@/lib/notifications/email';
import { respondSchema } from '@/lib/validation';
import { pickStrings, toFieldErrors } from '@/lib/form';
import { log, errorName } from '@/lib/log';
import { GENERIC_ERROR, toActionState, type ActionState } from '@/lib/result';

async function perform(
  invitationId: string,
  actor: UserId,
  action: InvitationAction,
  note: string | null,
  successMessage: string,
): Promise<ActionState> {
  try {
    const result = await applyInvitationAction(getDb(), actor, invitationId, action, new Date(), note);
    if (!result.ok) {
      if (result.code === 'forbidden') log('warn', 'forbidden_action', { actor, action: action.type });
      return toActionState(result);
    }
    const { event } = result.value;
    after(() => sendNotificationEmail(event));
    revalidatePath(`/invitatii/${invitationId}`);
    revalidatePath('/');
    return { ok: true, message: successMessage };
  } catch (err) {
    log('error', 'invitation_action_failed', { action: action.type, reason: errorName(err) });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function respondAction(invitationId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireSession();
  const parsed = respondSchema.safeParse(pickStrings(formData, ['action', 'proposedAt', 'note']));
  if (!parsed.success) return { ok: false, error: 'Verifica raspunsul.', fields: toFieldErrors(parsed.error) };
  const input = parsed.data;
  const action: InvitationAction =
    input.action === 'reschedule' ? { type: 'reschedule', proposedAt: input.proposedAt } : { type: input.action };
  return perform(invitationId, actor, action, input.note, 'Raspuns trimis.');
}

export async function acceptProposalAction(invitationId: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const actor = await requireSession();
  return perform(invitationId, actor, { type: 'acceptProposal' }, null, 'Ora noua a fost acceptata.');
}

export async function cancelInvitationAction(invitationId: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const actor = await requireSession();
  return perform(invitationId, actor, { type: 'cancel' }, null, 'Invitatia a fost anulata.');
}
```

- [ ] **Step 2: Scrie `InvitationDetails.tsx`**

```tsx
import Countdown from '@/components/Countdown';
import StatusPill from '@/components/StatusPill';
import type { InvitationRow } from '@/lib/db/schema';
import type { UserId } from '@/lib/domain';
import { formatDateTimeRo } from '@/lib/time';

interface InvitationDetailsProps {
  invitation: InvitationRow;
  me: UserId;
  names: Record<UserId, string>;
  isFuture: boolean;
}

export default function InvitationDetails({ invitation, me, names, isFuture }: InvitationDetailsProps) {
  const heading =
    invitation.fromUser === me
      ? `Invitatia ta pentru ${names[invitation.toUser]}`
      : `Invitatie de la ${names[invitation.fromUser]}`;
  return (
    <article className="card stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="eyebrow">{heading}</p>
        <StatusPill status={invitation.status} />
      </div>
      <h1>{invitation.title}</h1>
      <p className="invitation-message">{invitation.message}</p>
      <dl className="details-list">
        <div>
          <dt>Unde</dt>
          <dd>{invitation.location}</dd>
        </div>
        <div>
          <dt>Cand</dt>
          <dd>{formatDateTimeRo(invitation.startsAt)}</dd>
        </div>
        {invitation.dressCode && (
          <div>
            <dt>Dress code</dt>
            <dd>{invitation.dressCode}</dd>
          </div>
        )}
        {invitation.status === 'reschedule' && invitation.proposedAt && (
          <div>
            <dt>Ora propusa</dt>
            <dd>{formatDateTimeRo(invitation.proposedAt)}</dd>
          </div>
        )}
        {invitation.responseNote && (
          <div>
            <dt>Mesaj la raspuns</dt>
            <dd>{invitation.responseNote}</dd>
          </div>
        )}
      </dl>
      {invitation.status === 'accepted' && isFuture && (
        <Countdown targetISO={invitation.startsAt.toISOString()} label="Mai sunt" completeLabel="E acum!" />
      )}
    </article>
  );
}
```

- [ ] **Step 3: Scrie `ResponsePanel.tsx`**

```tsx
'use client';

import { useActionState, useState } from 'react';
import Field from '@/components/ui/Field';
import SubmitButton from '@/components/ui/SubmitButton';
import { LIMITS } from '@/lib/domain';
import type { ActionState } from '@/lib/result';

type Choice = 'accept' | 'decline' | 'reschedule';

const OPTIONS: { value: Choice; label: string }[] = [
  { value: 'accept', label: 'Da, abia astept' },
  { value: 'decline', label: 'Nu pot de data asta' },
  { value: 'reschedule', label: 'Propun alta ora' },
];

interface ResponsePanelProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  minDateTime: string;
}

export default function ResponsePanel({ action, minDateTime }: ResponsePanelProps) {
  const [state, formAction] = useActionState(action, null);
  const [choice, setChoice] = useState<Choice>('accept');
  const failed = state && !state.ok ? state : null;

  return (
    <form action={formAction} className="card form response-panel">
      <h2>Raspunsul tau</h2>
      <fieldset className="field">
        <legend className="sr-only">Alege raspunsul</legend>
        <div className="choice-grid">
          {OPTIONS.map((option) => (
            <label key={option.value} className="choice">
              <input
                type="radio"
                name="action"
                value={option.value}
                checked={choice === option.value}
                onChange={() => setChoice(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {choice === 'reschedule' && (
        <Field label="Ce ora ti-ar conveni?" htmlFor="proposedAt" error={failed?.fields?.proposedAt} hint="Ora Romaniei">
          <input id="proposedAt" name="proposedAt" type="datetime-local" required min={minDateTime} />
        </Field>
      )}

      <Field label="Un mesaj (optional)" htmlFor="note" error={failed?.fields?.note}>
        <textarea id="note" name="note" maxLength={LIMITS.responseNoteMax} />
      </Field>

      {failed && (
        <p className="form-error" role="alert">
          {failed.error}
        </p>
      )}
      {state?.ok && (
        <p className="form-success" role="status">
          {state.message}
        </p>
      )}
      <SubmitButton label="Trimite raspunsul" />
    </form>
  );
}
```

- [ ] **Step 4: Scrie `CreatorActions.tsx`**

```tsx
import ActionButtonForm from '@/components/ui/ActionButtonForm';
import type { ActionState } from '@/lib/result';

type BoundAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

interface CreatorActionsProps {
  acceptProposal: BoundAction | null;
  cancel: BoundAction | null;
}

export default function CreatorActions({ acceptProposal, cancel }: CreatorActionsProps) {
  if (!acceptProposal && !cancel) return null;
  return (
    <section className="card row" aria-label="Actiuni">
      {acceptProposal && <ActionButtonForm action={acceptProposal} label="Accept ora propusa" variant="primary" />}
      {cancel && (
        <ActionButtonForm
          action={cancel}
          label="Anulez invitatia"
          variant="danger"
          confirmText="Sigur anulezi invitatia?"
        />
      )}
    </section>
  );
}
```

- [ ] **Step 5: Scrie `page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/require-session';
import { displayNames } from '@/lib/auth/display-names';
import { getDb } from '@/lib/db/client';
import { getInvitation } from '@/lib/invitations/queries';
import { canPerform } from '@/lib/invitations/state-machine';
import { markReadForInvitation } from '@/lib/notifications/queries';
import { toLocalInputValue } from '@/lib/time';
import InvitationDetails from './InvitationDetails';
import ResponsePanel from './ResponsePanel';
import CreatorActions from './CreatorActions';
import { respondAction, acceptProposalAction, cancelInvitationAction } from './actions';

export default async function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireSession();
  const { id } = await params;
  const db = getDb();
  const invitation = await getInvitation(db, id);
  if (!invitation) notFound();

  const now = new Date();
  await markReadForInvitation(db, me, invitation.id, now);
  const names = displayNames();
  const canRespond = canPerform(invitation, me, 'accept', now);

  return (
    <div className="stack">
      <InvitationDetails
        invitation={invitation}
        me={me}
        names={names}
        isFuture={invitation.startsAt.getTime() > now.getTime()}
      />
      {canRespond && (
        <ResponsePanel action={respondAction.bind(null, invitation.id)} minDateTime={toLocalInputValue(now)} />
      )}
      <CreatorActions
        acceptProposal={
          canPerform(invitation, me, 'acceptProposal', now) ? acceptProposalAction.bind(null, invitation.id) : null
        }
        cancel={canPerform(invitation, me, 'cancel', now) ? cancelInvitationAction.bind(null, invitation.id) : null}
      />
    </div>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: fara erori.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/invitatii/[id]"
git commit -m "feat: add invitation detail page with response and creator actions"
```

---

### Task 12: Pagina de notificari

**Files:**
- Create: `app/(app)/notificari/actions.ts`, `app/(app)/notificari/page.tsx`

- [ ] **Step 1: Scrie `actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { markAllRead } from '@/lib/notifications/queries';
import { log, errorName } from '@/lib/log';
import { GENERIC_ERROR, type ActionState } from '@/lib/result';

export async function markAllReadAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  const me = await requireSession();
  try {
    await markAllRead(getDb(), me, new Date());
  } catch (err) {
    log('error', 'mark_all_read_failed', { reason: errorName(err) });
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}
```

- [ ] **Step 2: Scrie `page.tsx`**

```tsx
import Link from 'next/link';
import ActionButtonForm from '@/components/ui/ActionButtonForm';
import { requireSession } from '@/lib/auth/require-session';
import { displayNames } from '@/lib/auth/display-names';
import { getDb } from '@/lib/db/client';
import { otherUser } from '@/lib/domain';
import { listNotifications } from '@/lib/notifications/queries';
import { describeNotification, notificationHref } from '@/lib/notifications/describe';
import { formatShortRo } from '@/lib/time';
import { markAllReadAction } from './actions';

export default async function NotificationsPage() {
  const me = await requireSession();
  const list = await listNotifications(getDb(), me);
  const actorName = displayNames()[otherUser(me)];
  const hasUnread = list.some((n) => !n.readAt);

  return (
    <section className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Notificari</h1>
        {hasUnread && <ActionButtonForm action={markAllReadAction} label="Marcheaza tot citit" />}
      </div>
      {list.length === 0 ? (
        <p className="card muted">Nicio notificare inca.</p>
      ) : (
        <ul className="notification-list">
          {list.map((n) => (
            <li key={n.id} className={`card notification${n.readAt ? '' : ' unread'}`}>
              <Link href={notificationHref(n.type, n.invitationId)}>
                {describeNotification({ type: n.type, actorName, title: n.title, status: n.status ?? undefined })}
              </Link>
              <time className="muted" dateTime={n.createdAt.toISOString()}>
                {formatShortRo(n.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Verify si build**

Run: `npm run verify`
Expected: typecheck OK, toate testele PASS, audit fara high / critical.

Run: `npm run build`
Expected: build reusit.

- [ ] **Step 4: Smoke test manual (cu `.env.local` si migrari aplicate)**

`npm run dev`, apoi:
1. Login ca el -> "Invitatie noua" -> completeaza cu o data din trecut -> eroare pe campul "Cand"
2. Completeaza corect -> redirect la invitatie, status "In asteptare", buton "Anulez invitatia"
3. Verifica ca in inbox-ul `EMAIL_EL` NU a venit email (destinatarul e "ea")
4. Iesi -> login ca ea -> badge "1" la Notificari -> dashboard: invitatia apare la "Asteapta raspunsul tau"
5. Deschide-o -> badge dispare la urmatoarea navigare -> alege "Propun alta ora" + ora -> "Raspuns trimis."
6. Iesi -> login ca el -> email primit in inbox-ul `EMAIL_EL` -> "Accept ora propusa" -> status "Acceptata", countdown vizibil
7. Dashboard: hero cu "Urmatorul date"

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/notificari"
git commit -m "feat: add notifications page with mark all read"
```
