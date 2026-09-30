import { describe, it, expect } from 'vitest';
import { transition, canPerform, isTooFarInFuture, MAX_FUTURE_MS, type InvitationState } from './state-machine';

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

  it('rejects a proposal further than 2 years away', () => {
    const tooFar = new Date(NOW.getTime() + MAX_FUTURE_MS + 24 * 60 * 60 * 1000);
    const r = transition(inv(), 'ea', { type: 'reschedule', proposedAt: tooFar }, NOW);
    expect(r).toMatchObject({
      ok: false,
      code: 'invalid',
      fields: { proposedAt: 'Alege o data in urmatorii 2 ani' },
    });
  });

  it('accepts a proposal right at the edge of the 2-year window', () => {
    const edge = new Date(NOW.getTime() + MAX_FUTURE_MS - 1000);
    const r = transition(inv(), 'ea', { type: 'reschedule', proposedAt: edge }, NOW);
    expect(r.ok).toBe(true);
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

  it('cannot cancel an expired pending invitation', () => {
    expect(transition(inv({ status: 'pending', startsAt: PAST }), 'el', { type: 'cancel' }, NOW).ok).toBe(false);
  });

  it('cannot cancel a reschedule whose proposed time already passed, even if startsAt is future', () => {
    expect(
      transition(inv({ status: 'reschedule', startsAt: FUTURE, proposedAt: PAST }), 'el', { type: 'cancel' }, NOW).ok,
    ).toBe(false);
  });

  it('can cancel a reschedule without a proposedAt while startsAt is future', () => {
    expect(
      transition(inv({ status: 'reschedule', startsAt: FUTURE, proposedAt: null }), 'el', { type: 'cancel' }, NOW).ok,
    ).toBe(true);
  });

  it.each(['declined', 'cancelled'] as const)('cannot cancel a %s invitation', (status) => {
    expect(transition(inv({ status }), 'el', { type: 'cancel' }, NOW).ok).toBe(false);
  });

  it('forbids the recipient from cancelling', () => {
    expect(transition(inv(), 'ea', { type: 'cancel' }, NOW)).toMatchObject({ ok: false, code: 'forbidden' });
  });

  it('returns a fresh forbidden result on every call (no shared mutable object)', () => {
    const a = transition(inv(), 'ea', { type: 'cancel' }, NOW);
    const b = transition(inv(), 'ea', { type: 'cancel' }, NOW);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

describe('isTooFarInFuture', () => {
  it('flags dates beyond the 2-year horizon', () => {
    expect(isTooFarInFuture(new Date(NOW.getTime() + MAX_FUTURE_MS + 1), NOW)).toBe(true);
    expect(isTooFarInFuture(new Date(NOW.getTime() + MAX_FUTURE_MS - 1), NOW)).toBe(false);
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
