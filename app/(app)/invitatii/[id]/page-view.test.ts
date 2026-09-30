import { describe, it, expect } from 'vitest';
import type { InvitationState } from '@/lib/invitations/state-machine';
import { pageView } from './page-view';

const now = new Date('2026-06-01T10:00:00Z');
const future = new Date('2026-07-01T10:00:00Z');

const pending: InvitationState = {
  fromUser: 'el',
  toUser: 'ea',
  status: 'pending',
  startsAt: future,
  proposedAt: null,
};

describe('pageView', () => {
  it('shows the response experience to a recipient with a pending invitation', () => {
    expect(pageView(pending, 'ea', now, undefined)).toBe('experience-respond');
  });

  it('shows the response experience even when the replay flag is set and a response is possible', () => {
    expect(pageView(pending, 'ea', now, '1')).toBe('experience-respond');
  });

  it('replays for a recipient who already answered and asks for it', () => {
    expect(pageView({ ...pending, status: 'accepted' }, 'ea', now, '1')).toBe('experience-replay');
  });

  it('shows the summary for a creator, even with the replay flag', () => {
    expect(pageView(pending, 'el', now, '1')).toBe('summary');
    expect(pageView({ ...pending, status: 'accepted' }, 'el', now, '1')).toBe('summary');
  });

  it('shows the summary for a recipient after answering, without the replay flag', () => {
    expect(pageView({ ...pending, status: 'accepted' }, 'ea', now, undefined)).toBe('summary');
    expect(pageView({ ...pending, status: 'accepted' }, 'ea', now, '0')).toBe('summary');
  });

  it('never replays a cancelled invitation', () => {
    expect(pageView({ ...pending, status: 'cancelled' }, 'ea', now, '1')).toBe('summary');
  });
});
