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
