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
