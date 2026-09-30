import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { hasTestDb, testDb, resetDb } from '@/test/db';
import { notifications } from '@/lib/db/schema';
import { createInvitation, applyInvitationAction } from './service';
import { getInvitation, listDashboardInvitations } from './queries';
import { countUnread, listNotifications, markReadForInvitation } from '../notifications/queries';
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

  it('rejects a start date more than 2 years in the future', async () => {
    const tooFar = new Date(NOW.getTime() + 2 * 365 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
    const r = await createInvitation(db, 'el', { ...input, startsAt: tooFar }, NOW);
    expect(r).toMatchObject({
      ok: false,
      code: 'invalid',
      fields: { startsAt: 'Alege o data in urmatorii 2 ani' },
    });
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

  it('keeps the notified status frozen at notification time (reschedule, not the later accepted status)', async () => {
    const id = await created();
    const proposedAt = new Date('2026-10-06T18:00:00Z');
    expect((await applyInvitationAction(db, 'ea', id, { type: 'reschedule', proposedAt }, NOW)).ok).toBe(true);
    expect((await applyInvitationAction(db, 'el', id, { type: 'acceptProposal' }, NOW)).ok).toBe(true);

    // Invitatia e acum 'accepted', dar notificarea de raspuns trebuie sa pastreze
    // statusul de la momentul in care a fost creata: 'reschedule'.
    const list = await listNotifications(db, 'el');
    const response = list.find((n) => n.type === 'invite_response');
    expect(response).toMatchObject({ status: 'reschedule' });
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
    expect(await markReadForInvitation(db, 'ea', id, NOW)).toBe(1);
    expect(await countUnread(db, 'ea')).toBe(0);
    // A doua citire nu mai gaseste nimic necitit: pagina nu trebuie sa ceara un refresh.
    expect(await markReadForInvitation(db, 'ea', id, NOW)).toBe(0);
    const rows = await db.select().from(notifications).where(eq(notifications.invitationId, id));
    expect(rows[0].readAt).not.toBeNull();
  });

  it('rejects a second action once the status has already moved on (stale status)', async () => {
    const id = await created();
    const first = await applyInvitationAction(db, 'ea', id, { type: 'accept' }, NOW);
    expect(first.ok).toBe(true);

    const second = await applyInvitationAction(db, 'ea', id, { type: 'decline' }, NOW);
    expect(second).toMatchObject({ ok: false, code: 'invalid' });

    expect((await getInvitation(db, id))?.status).toBe('accepted');
    // Doar notificarea din primul accept: a doua incercare nu a inserat nimic.
    const rows = await db.select().from(notifications).where(eq(notifications.invitationId, id));
    expect(rows.filter((r) => r.type === 'invite_response')).toHaveLength(1);
  });

  it('lets exactly one of two concurrent responses win', async () => {
    const id = await created();
    const [a, b] = await Promise.all([
      applyInvitationAction(db, 'ea', id, { type: 'accept' }, NOW),
      applyInvitationAction(db, 'ea', id, { type: 'decline' }, NOW),
    ]);
    const results = [a, b];
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toHaveLength(1);

    const inv = await getInvitation(db, id);
    expect(['accepted', 'declined']).toContain(inv?.status);

    const rows = await db.select().from(notifications).where(eq(notifications.invitationId, id));
    expect(rows.filter((r) => r.type === 'invite_response')).toHaveLength(1);
  });
});
