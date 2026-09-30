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
