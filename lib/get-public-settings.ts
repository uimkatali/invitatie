import { sql } from '@vercel/postgres';

export interface PublicSettings {
  recipientName: string;
  senderName: string;
  eventDateIso: string;
  website: {
    introLine: string;
    tapPrompt: string;
    revealSteps: string[];
    countdownLabel: string;
    countdownCompleteLabel: string;
  };
  login: {
    title: string;
    hint: string;
    usernameLabel: string;
    passwordLabel: string;
    submitText: string;
    errorText: string;
    expectedUsername: string;
    expectedPassword: string;
  };
  email: {
    subject: string;
    preheader: string;
    bodyParagraphs: string[];
    ctaText: string;
    ctaUrl: string;
  };
  activeThemeId: string;
  themeColorOverrides: Record<string, string> | null;
}

export function mapSettingsRow(row: any): PublicSettings {
  return {
    recipientName: row.recipient_name,
    senderName: row.sender_name,
    eventDateIso: row.event_date_iso,
    website: {
      introLine: row.website_intro_line,
      tapPrompt: row.website_tap_prompt,
      revealSteps: row.website_reveal_steps,
      countdownLabel: row.website_countdown_label,
      countdownCompleteLabel: row.website_countdown_complete_label,
    },
    login: {
      title: row.login_title,
      hint: row.login_hint,
      usernameLabel: row.login_username_label,
      passwordLabel: row.login_password_label,
      submitText: row.login_submit_text,
      errorText: row.login_error_text,
      expectedUsername: row.login_expected_username,
      expectedPassword: row.login_expected_password,
    },
    email: {
      subject: row.email_subject,
      preheader: row.email_preheader,
      bodyParagraphs: row.email_body_paragraphs,
      ctaText: row.email_cta_text,
      ctaUrl: row.email_cta_url,
    },
    activeThemeId: row.active_theme_id,
    themeColorOverrides: row.theme_color_overrides,
  };
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const { rows } = await sql`SELECT * FROM settings ORDER BY id LIMIT 1`;
  if (rows.length === 0) {
    throw new Error('No settings row found. Run `npm run db:seed`.');
  }
  return mapSettingsRow(rows[0]);
}
