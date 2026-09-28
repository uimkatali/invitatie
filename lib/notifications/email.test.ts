import { describe, it, expect } from 'vitest';
import { shouldEmail, buildNotificationEmail, type NotificationEvent } from './email';

const event: NotificationEvent = {
  recipient: 'el',
  actor: 'ea',
  type: 'invite_new',
  invitationId: '11111111-1111-4111-8111-111111111111',
  title: '<script>alert(1)</script>\r\nBcc:\tx@evil.com\u2028Subject: alta',
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
    // Nu doar \r\n: si tab-uri si separatori Unicode de linie/paragraf (U+2028/U+2029)
    // pot rupe subiectul unui email pe mai multe randuri la unele clienti.
    expect(email.subject).not.toMatch(/[\u0000-\u001f\u007f\u0085\u2028\u2029]/);
  });

  it('links to the invitation', () => {
    expect(email.text).toContain('https://noi.example.com/invitatii/11111111-1111-4111-8111-111111111111');
  });
});
