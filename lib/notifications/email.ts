import nodemailer from 'nodemailer';
import type { InvitationStatus, NotificationType, UserId } from '../domain';
import { env } from '../env';
import { escapeHtml } from '../escape';
import { appUrl } from '../app-url';
import { log, errorInfo } from '../log';
import { displayName } from '../auth/display-names';
import { describeNotification, notificationHref } from './describe';
import { gmailSmtpOptions, smtpErrorCode } from './smtp.mjs';

export interface NotificationEvent {
  recipient: UserId;
  actor: UserId;
  type: NotificationType;
  invitationId: string | null;
  title: string | null;
  status?: InvitationStatus;
}

const EMAIL_TYPES = new Set<NotificationType>(['invite_new', 'invite_response', 'reschedule_accepted', 'invite_cancelled']);

/** Adresa de email a fiecarui utilizator (EMAIL_EL / EMAIL_EA); null sau gol = acel utilizator nu primeste email. */
export type Recipients = Record<UserId, string | null>;

/** Ambii parteneri primesc email pentru evenimentele de invitatie, daca au o adresa configurata. */
export function shouldEmail(event: NotificationEvent, recipients: Recipients): boolean {
  return EMAIL_TYPES.has(event.type) && Boolean(recipients[event.recipient]);
}

// Orice caracter de control (inclusiv \r\n\t), NEL (U+0085) sau separatorii Unicode de
// linie/paragraf (U+2028/U+2029): titlul invitatiei e text introdus de utilizator si nu
// trebuie sa poata rupe subiectul emailului pe mai multe randuri sau injecta antete noi.
const LINE_BREAKING_CHARS = /[\u0000-\u001f\u007f\u0085\u2028\u2029]+/g;

export function buildNotificationEmail(event: NotificationEvent, actorName: string, baseUrl: string) {
  const summary = describeNotification({ type: event.type, actorName, title: event.title, status: event.status });
  const oneLine = summary.replace(LINE_BREAKING_CHARS, ' ');
  const link = `${baseUrl}${notificationHref(event.type, event.invitationId)}`;
  const html = `<!doctype html>
<html lang="ro"><body style="margin:0;padding:24px;background:#fff8fb;font-family:Arial,sans-serif;color:#3a2540;">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px;">
<p style="font-size:18px;line-height:1.5;margin:0 0 20px;">${escapeHtml(oneLine)}</p>
<a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#ffafcc;color:#3a2540;text-decoration:none;font-weight:bold;">Deschide in aplicatie</a>
</div></body></html>`;
  return { subject: oneLine, html, text: `${oneLine}\n\n${link}` };
}

export interface MailMessage {
  from: { name: string; address: string };
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Partea din nodemailer de care avem nevoie (injectabila in teste). */
export interface MailTransport {
  sendMail(message: MailMessage): Promise<unknown>;
}

export type TransportFactory = (options: ReturnType<typeof gmailSmtpOptions>) => MailTransport;

const gmailTransport: TransportFactory = (options) => nodemailer.createTransport(options);

// Lipsa configuratiei nu e o eroare: emailurile sunt doar dezactivate. Logam o singura data pe proces.
let loggedDisabled = false;

/**
 * Nu arunca niciodata: esecul emailului nu trebuie sa strice actiunea. Nu logheaza adrese, parola sau
 * continutul mesajului, doar tipul evenimentului si un cod scurt (EAUTH, ECONNECTION...).
 */
export async function sendNotificationEmail(
  event: NotificationEvent,
  createTransport: TransportFactory = gmailTransport,
): Promise<void> {
  try {
    const e = env();
    if (!EMAIL_TYPES.has(event.type)) return;
    if (!e.GMAIL_USER || !e.GMAIL_APP_PASSWORD) {
      if (!loggedDisabled) {
        loggedDisabled = true;
        log('warn', 'email_disabled');
      }
      return;
    }
    const to = event.recipient === 'el' ? e.EMAIL_EL : e.EMAIL_EA;
    if (!shouldEmail(event, { el: e.EMAIL_EL, ea: e.EMAIL_EA }) || !to) return;

    const email = buildNotificationEmail(event, displayName(event.actor), appUrl());
    await createTransport(gmailSmtpOptions(e.GMAIL_USER, e.GMAIL_APP_PASSWORD)).sendMail({
      from: { name: 'Dateurile noastre', address: e.GMAIL_USER },
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  } catch (err) {
    const code = smtpErrorCode(err);
    log('error', 'email_failed', { type: event.type, ...errorInfo(err), ...(code && { smtpCode: code }) });
  }
}
