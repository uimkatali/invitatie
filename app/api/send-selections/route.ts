import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import fs from 'node:fs';
import path from 'node:path';
import { validateSelections, isValid, locationLabel, type Selections } from '../../../lib/selections';
import { renderTemplate } from '../../../scripts/build-email.mjs';
import { getContent } from '../../../lib/content';

const NOTIFY_EMAIL = 'miu.catalinm@gmail.com';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corp de cerere invalid.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Corp de cerere invalid.' }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;

  const selections: Selections = {
    location: asString(raw.location) as Selections['location'],
    customLocation: asString(raw.customLocation),
    preferredTime: asString(raw.preferredTime),
    homeDetails: asString(raw.homeDetails),
    email: asString(raw.email),
  };

  const errors = validateSelections(selections);
  if (!isValid(errors)) {
    return NextResponse.json({ error: 'Completeaza toate campurile obligatorii.', fields: errors }, { status: 400 });
  }

  try {
    const content = getContent();
    const templatePath = path.join(process.cwd(), 'email', 'selections-template.html');
    const template = fs.readFileSync(templatePath, 'utf-8');

    const rows: string[] = [
      `<p style="margin:0 0 12px;"><strong>Loc / activitate:</strong> ${escapeHtml(locationLabel(selections.location))}</p>`,
    ];
    if (selections.customLocation) {
      rows.push(`<p style="margin:0 0 12px;"><strong>Idee:</strong> ${escapeHtml(selections.customLocation)}</p>`);
    }
    rows.push(`<p style="margin:0 0 12px;"><strong>Ora preferata:</strong> ${escapeHtml(selections.preferredTime)}</p>`);
    if (selections.homeDetails) {
      rows.push(`<p style="margin:0 0 12px;"><strong>De pregatit:</strong> ${escapeHtml(selections.homeDetails)}</p>`);
    }

    const html = renderTemplate(template, {
      subject: content.selectionsEmail.subject,
      preheader: content.selectionsEmail.preheader,
      bodyHtml: rows.join('\n'),
      replyEmail: escapeHtml(selections.email),
    });

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: '"Fata mea misterioasa" <onboarding@resend.dev>',
      to: NOTIFY_EMAIL,
      replyTo: selections.email,
      subject: content.selectionsEmail.subject,
      html,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Missing API key')) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY nu e configurat. Adauga-l in variabilele de mediu.' },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: 'Trimiterea a esuat.' }, { status: 500 });
  }
}
