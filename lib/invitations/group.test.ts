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
