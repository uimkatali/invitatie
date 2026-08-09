import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import fs from 'node:fs';
import path from 'node:path';
import { getPublicSettings } from '../../../../lib/get-public-settings';
import { renderTemplate } from '../../../../scripts/build-email.mjs';

export async function POST(request: NextRequest) {
  const { to } = await request.json();
  if (!to) {
    return NextResponse.json({ error: 'Adresa destinatarului este obligatorie.' }, { status: 400 });
  }

  const settings = await getPublicSettings();
  const templatePath = path.join(process.cwd(), 'email', 'template.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  const bodyHtml = settings.email.bodyParagraphs
    .map((paragraph) => `<p style="margin:0 0 16px; font-size:16px; line-height:1.6;">${paragraph}</p>`)
    .join('\n');

  const html = renderTemplate(template, {
    recipientName: settings.recipientName,
    senderName: settings.senderName,
    subject: settings.email.subject,
    preheader: settings.email.preheader,
    bodyHtml,
    ctaText: settings.email.ctaText,
    ctaUrl: settings.email.ctaUrl,
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: 'invitatie@resend.dev',
    to,
    subject: settings.email.subject,
    html,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
