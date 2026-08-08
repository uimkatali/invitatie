import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

// Duplicated from lib/password.ts's SALT_ROUNDS. This script is plain JS (run
// directly via `node`, no ts-node/tsx loader in this project — see
// scripts/build-email.mjs and scripts/migrate.mjs for the same convention),
// so it can't import the TypeScript module directly. Keep this in sync with
// lib/password.ts if that value ever changes.
const SALT_ROUNDS = 12; // must match lib/password.ts's SALT_ROUNDS

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
}

seedAdmin().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
