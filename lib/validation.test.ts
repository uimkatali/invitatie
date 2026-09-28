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

  it('normalizes an uppercase idea id to lowercase', () => {
    const r = invitationSchema.safeParse({ ...base, ideaId: '550E8400-E29B-41D4-A716-446655440000' });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.ideaId).toBe('550e8400-e29b-41d4-a716-446655440000');
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
    const r = respondSchema.safeParse({ action: 'cancel', note: '' });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues[0]?.message).toBe('Alege un raspuns');
  });
});
