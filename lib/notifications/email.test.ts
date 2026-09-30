import { describe, it, expect, vi, beforeEach } from 'vitest';

const cfg = vi.hoisted(() => ({
  current: {
    GMAIL_USER: 'sender@gmail.com' as string | null,
    GMAIL_APP_PASSWORD: 'abcdefghijklmnop' as string | null,
    EMAIL_EL: 'el@example.com' as string | null,
    EMAIL_EA: 'ea@example.com' as string | null,
  },
}));

vi.mock('../env', () => ({ env: () => cfg.current }));
vi.mock('../auth/display-names', () => ({ displayName: (user: string) => (user === 'el' ? 'Catalin' : 'Ana') }));

import { shouldEmail, buildNotificationEmail, sendNotificationEmail, type NotificationEvent, type TransportFactory } from './email';

const event: NotificationEvent = {
  recipient: 'el',
  actor: 'ea',
  type: 'invite_new',
  invitationId: '11111111-1111-4111-8111-111111111111',
  title: '<script>alert(1)</script>\r\nBcc:\tx@evil.com\u2028Subject: alta',
};

const recipients = { el: 'el@example.com', ea: 'ea@example.com' };

describe('shouldEmail', () => {
  it('emails both partners for invitation events', () => {
    expect(shouldEmail(event, recipients)).toBe(true);
    expect(shouldEmail({ ...event, recipient: 'ea' }, recipients)).toBe(true);
  });

  it('only emails invitation events', () => {
    expect(shouldEmail({ ...event, type: 'idea_added' }, recipients)).toBe(false);
    expect(shouldEmail({ ...event, type: 'memory_added' }, recipients)).toBe(false);
    for (const type of ['invite_new', 'invite_response', 'reschedule_accepted', 'invite_cancelled'] as const) {
      expect(shouldEmail({ ...event, type }, recipients)).toBe(true);
    }
  });

  it('skips a user without a configured address', () => {
    expect(shouldEmail(event, { el: null, ea: 'ea@example.com' })).toBe(false);
    expect(shouldEmail({ ...event, recipient: 'ea' }, { el: 'el@example.com', ea: null })).toBe(false);
    expect(shouldEmail({ ...event, recipient: 'ea' }, { el: 'el@example.com', ea: '' })).toBe(false);
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

describe('sendNotificationEmail', () => {
  let sendMail: ReturnType<typeof vi.fn>;
  let createTransport: ReturnType<typeof vi.fn>;
  const factory = () => createTransport as unknown as TransportFactory;

  beforeEach(() => {
    cfg.current = {
      GMAIL_USER: 'sender@gmail.com',
      GMAIL_APP_PASSWORD: 'abcdefghijklmnop',
      EMAIL_EL: 'el@example.com',
      EMAIL_EA: 'ea@example.com',
    };
    sendMail = vi.fn().mockResolvedValue({ messageId: 'x' });
    createTransport = vi.fn(() => ({ sendMail }));
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('sends to the recipient of the event, from the Gmail sender, with safe content', async () => {
    await sendNotificationEmail(event, factory());
    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0][0];
    expect(message.to).toBe('el@example.com');
    expect(message.from).toEqual({ name: 'Dateurile noastre', address: 'sender@gmail.com' });
    expect(message.subject).not.toMatch(/[\u0000-\u001f\u007f\u0085\u2028\u2029]/);
    expect(message.subject).toContain('Ana');
    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.text).toContain('/invitatii/11111111-1111-4111-8111-111111111111');
  });

  it('configures the Gmail SMTP transport with the compact app password', async () => {
    await sendNotificationEmail(event, factory());
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: 'sender@gmail.com', pass: 'abcdefghijklmnop' },
      }),
    );
  });

  it('emails the other partner too (both users receive mail)', async () => {
    await sendNotificationEmail({ ...event, recipient: 'ea', actor: 'el' }, factory());
    expect(sendMail.mock.calls[0][0].to).toBe('ea@example.com');
  });

  it('does nothing for non-email events or a recipient without an address', async () => {
    await sendNotificationEmail({ ...event, type: 'idea_added' }, factory());
    cfg.current.EMAIL_EA = null;
    await sendNotificationEmail({ ...event, recipient: 'ea' }, factory());
    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('is disabled without Gmail credentials and warns only once per process', async () => {
    vi.resetModules();
    const fresh = await import('./email');
    cfg.current.GMAIL_APP_PASSWORD = null;
    await fresh.sendNotificationEmail(event, factory());
    await fresh.sendNotificationEmail(event, factory());
    cfg.current.GMAIL_APP_PASSWORD = 'abcdefghijklmnop';
    cfg.current.GMAIL_USER = null;
    await fresh.sendNotificationEmail(event, factory());
    expect(createTransport).not.toHaveBeenCalled();
    const logged = vi.mocked(console.warn).mock.calls.flat().filter((line) => String(line).includes('email_disabled'));
    expect(logged).toHaveLength(1);
  });

  it('never throws and logs only the type and a coarse code when sending fails', async () => {
    const secretError = Object.assign(new Error('535 bad credentials for el@example.com secret-subject'), { code: 'EAUTH' });
    sendMail.mockRejectedValue(secretError);
    await expect(sendNotificationEmail(event, factory())).resolves.toBeUndefined();

    const logged = vi.mocked(console.error).mock.calls.flat().join(' ');
    expect(logged).toContain('email_failed');
    expect(logged).toContain('invite_new');
    expect(logged).toContain('EAUTH');
    for (const secret of ['el@example.com', 'ea@example.com', 'sender@gmail.com', 'abcdefghijklmnop', 'secret-subject', 'Bcc']) {
      expect(logged).not.toContain(secret);
    }
  });

  it('never throws when the transport cannot even be created', async () => {
    createTransport.mockImplementation(() => {
      throw new Error('boom with sender@gmail.com');
    });
    await expect(sendNotificationEmail(event, factory())).resolves.toBeUndefined();
    const logged = vi.mocked(console.error).mock.calls.flat().join(' ');
    expect(logged).toContain('email_failed');
    expect(logged).not.toContain('sender@gmail.com');
  });
});
