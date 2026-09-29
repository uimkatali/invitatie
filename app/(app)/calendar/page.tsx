import Link from 'next/link';
import { requireSession } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import type { InvitationRow } from '@/lib/db/schema';
import { STATUS_LABELS } from '@/lib/domain';
import { listInvitationsBetween } from '@/lib/invitations/queries';
import {
  formatMonthParam,
  gridRangeUtc,
  isMonthInRange,
  monthGrid,
  monthLabelRo,
  parseMonthParam,
  shiftMonth,
} from '@/lib/calendar';
import { formatDateTimeRo, localDateKey } from '@/lib/time';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa', 'Du'];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ luna?: string }> }) {
  await requireSession();
  const { luna } = await searchParams;
  const now = new Date();
  // parseMonthParam accepta doar YYYY-MM valid si cade pe luna curenta pentru orice altceva.
  const ref = parseMonthParam(typeof luna === 'string' ? luna : undefined, now);
  const weeks = monthGrid(ref);
  const { from, to } = gridRangeUtc(weeks);
  const invitations = await listInvitationsBetween(getDb(), from, to);

  const byDay = new Map<string, InvitationRow[]>();
  for (const inv of invitations) {
    const key = localDateKey(inv.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), inv]);
  }
  const todayKey = localDateKey(now);
  const monthPrefix = formatMonthParam(ref);
  const prev = shiftMonth(ref, -1);
  const next = shiftMonth(ref, 1);
  const inThisMonth = invitations.filter((inv) => localDateKey(inv.startsAt).startsWith(monthPrefix));

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="calendar-title">{monthLabelRo(ref)}</h1>
        <div className="row">
          {isMonthInRange(prev) && (
            <Link className="btn btn-ghost" href={`/calendar?luna=${formatMonthParam(prev)}`}>
              ‹ Luna trecuta
            </Link>
          )}
          <Link className="btn btn-ghost" href="/calendar">
            Azi
          </Link>
          {isMonthInRange(next) && (
            <Link className="btn btn-ghost" href={`/calendar?luna=${formatMonthParam(next)}`}>
              Luna viitoare ›
            </Link>
          )}
        </div>
      </div>

      <div className="card calendar-card">
        <table className="calendar">
          <thead>
            <tr>
              {WEEKDAYS.map((d) => (
                <th key={d} scope="col">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0].key}>
                {week.map((day) => (
                  <td
                    key={day.key}
                    className={`${day.inMonth ? '' : 'out'} ${day.key === todayKey ? 'today' : ''}`}
                    aria-current={day.key === todayKey ? 'date' : undefined}
                  >
                    <span className="day-number">{day.day}</span>
                    {(byDay.get(day.key) ?? []).map((inv) => (
                      <Link key={inv.id} href={`/invitatii/${inv.id}`} className={`calendar-event status-${inv.status}`}>
                        {inv.title}
                      </Link>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="stack" aria-label="Dateurile lunii">
        <h2>In {monthLabelRo(ref)}</h2>
        {inThisMonth.length === 0 ? (
          <p className="muted">Niciun date luna aceasta.</p>
        ) : (
          <ul className="notification-list">
            {inThisMonth.map((inv) => (
              <li key={inv.id} className="card notification">
                <Link href={`/invitatii/${inv.id}`}>{inv.title}</Link>
                <span className="muted">
                  {formatDateTimeRo(inv.startsAt)} · {STATUS_LABELS[inv.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
