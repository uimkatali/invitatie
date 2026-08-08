import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { validateSettings, SettingsRow } from '../../../../lib/settings';

function rowToSettings(row: any): SettingsRow {
  return {
    recipientName: row.recipient_name,
    senderName: row.sender_name,
    eventDateIso: row.event_date_iso,
    websiteIntroLine: row.website_intro_line,
    websiteTapPrompt: row.website_tap_prompt,
    websiteRevealSteps: row.website_reveal_steps,
    websiteCountdownLabel: row.website_countdown_label,
    websiteCountdownCompleteLabel: row.website_countdown_complete_label,
    emailSubject: row.email_subject,
    emailPreheader: row.email_preheader,
    emailBodyParagraphs: row.email_body_paragraphs,
    emailCtaText: row.email_cta_text,
    emailCtaUrl: row.email_cta_url,
    loginTitle: row.login_title,
    loginHint: row.login_hint,
    loginUsernameLabel: row.login_username_label,
    loginPasswordLabel: row.login_password_label,
    loginSubmitText: row.login_submit_text,
    loginErrorText: row.login_error_text,
    loginExpectedUsername: row.login_expected_username,
    loginExpectedPassword: row.login_expected_password,
    activeThemeId: row.active_theme_id,
    themeColorOverrides: row.theme_color_overrides,
  };
}

export async function GET() {
  const { rows } = await sql`SELECT * FROM settings ORDER BY id LIMIT 1`;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No settings row found. Run the seed script.' }, { status: 500 });
  }
  return NextResponse.json(rowToSettings(rows[0]));
}

export async function PUT(request: NextRequest) {
  const body: SettingsRow = await request.json();
  const errors = validateSettings(body);
  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  await sql`
    UPDATE settings SET
      recipient_name = ${body.recipientName},
      sender_name = ${body.senderName},
      event_date_iso = ${body.eventDateIso},
      website_intro_line = ${body.websiteIntroLine},
      website_tap_prompt = ${body.websiteTapPrompt},
      website_reveal_steps = ${JSON.stringify(body.websiteRevealSteps)},
      website_countdown_label = ${body.websiteCountdownLabel},
      website_countdown_complete_label = ${body.websiteCountdownCompleteLabel},
      email_subject = ${body.emailSubject},
      email_preheader = ${body.emailPreheader},
      email_body_paragraphs = ${JSON.stringify(body.emailBodyParagraphs)},
      email_cta_text = ${body.emailCtaText},
      email_cta_url = ${body.emailCtaUrl},
      login_title = ${body.loginTitle},
      login_hint = ${body.loginHint},
      login_username_label = ${body.loginUsernameLabel},
      login_password_label = ${body.loginPasswordLabel},
      login_submit_text = ${body.loginSubmitText},
      login_error_text = ${body.loginErrorText},
      login_expected_username = ${body.loginExpectedUsername},
      login_expected_password = ${body.loginExpectedPassword},
      active_theme_id = ${body.activeThemeId},
      theme_color_overrides = ${body.themeColorOverrides ? JSON.stringify(body.themeColorOverrides) : null},
      updated_at = now()
    WHERE id = (SELECT id FROM settings ORDER BY id LIMIT 1)
  `;

  return NextResponse.json({ ok: true });
}
