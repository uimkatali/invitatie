import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Duplicated from lib/password.ts's SALT_ROUNDS. This script is plain JS (run
// directly via `node`, no ts-node/tsx loader in this project — see
// scripts/build-email.mjs and scripts/migrate.mjs for the same convention),
// so it can't import the TypeScript module directly. Keep this in sync with
// lib/password.ts if that value ever changes.
const SALT_ROUNDS = 12; // must match lib/password.ts's SALT_ROUNDS

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedSettingsFromContentJson() {
  const { rows } = await sql`SELECT id FROM settings LIMIT 1`;
  if (rows.length > 0) {
    console.log('Settings row already exists, skipping content.json seed.');
    return;
  }

  const contentPath = path.join(__dirname, '..', 'content.json');
  const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));

  await sql`
    INSERT INTO settings (
      recipient_name, sender_name, event_date_iso,
      website_intro_line, website_tap_prompt, website_reveal_steps,
      website_countdown_label, website_countdown_complete_label,
      email_subject, email_preheader, email_body_paragraphs, email_cta_text, email_cta_url,
      login_title, login_hint, login_username_label, login_password_label,
      login_submit_text, login_error_text, login_expected_username, login_expected_password,
      active_theme_id
    ) VALUES (
      ${content.recipientName}, ${content.senderName}, ${content.eventDateISO},
      ${content.website.introLine}, ${content.website.tapPrompt}, ${JSON.stringify(content.website.revealSteps)},
      ${content.website.countdownLabel}, ${content.website.countdownCompleteLabel},
      ${content.email.subject}, ${content.email.preheader}, ${JSON.stringify(content.email.bodyParagraphs)}, ${content.email.ctaText}, ${content.email.ctaUrl},
      ${content.login.title}, ${content.login.hint}, ${content.login.usernameLabel}, ${content.login.passwordLabel},
      ${content.login.submitText}, ${content.login.errorText}, ${content.login.expectedUsername}, ${content.login.expectedPassword},
      'alien-field'
    )
  `;
  console.log('Settings seeded from content.json.');
}

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error('Set ADMIN_USERNAME and ADMIN_PASSWORD in your environment before running this script.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await sql`
    INSERT INTO admin_user (username, password_hash)
    VALUES (${username}, ${passwordHash})
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `;

  console.log(`Admin user "${username}" seeded.`);

  await seedSettingsFromContentJson();
}

seedAdmin().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
