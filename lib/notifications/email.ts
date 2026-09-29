import { Resend } from 'resend';
import type { InvitationStatus, NotificationType, UserId } from '../domain';
import { env } from '../env';
import { escapeHtml } from '../escape';
import { appUrl } from '../app-url';
import { log, errorInfo } from '../log';
import { displayName } from '../auth/display-names';
import { describeNotification, notificationHref } from './describe';

export interface NotificationEvent {
  recipient: UserId;
  actor: UserId;
  type: NotificationType;
  invitationId: string | null;
  title: string | null;
  status?: InvitationStatus;
}

const EMAIL_TYPES = new Set<NotificationType>(['invite_new', 'invite_response', 'reschedule_accepted', 'invite_cancelled']);

/** Resend e in sandbox: poate trimite doar la adresa contului (EMAIL_EL). */
export function shouldEmail(event: NotificationEvent): boolean {
  return event.recipient === 'el' && EMAIL_TYPES.has(event.type);
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

/** Nu arunca niciodata: esecul emailului nu trebuie sa strice actiunea. */
export async function sendNotificationEmail(event: NotificationEvent): Promise<void> {
  if (!shouldEmail(event)) return;
  try {
    const e = env();
    const email = buildNotificationEmail(event, displayName(event.actor), appUrl());
    const { error } = await new Resend(e.RESEND_API_KEY).emails.send({
      from: 'Dateurile noastre <onboarding@resend.dev>',
      to: e.EMAIL_EL,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) log('error', 'email_failed', { type: event.type, reason: error.name });
  } catch (err) {
    log('error', 'email_failed', { type: event.type, ...errorInfo(err) });
  }
}
