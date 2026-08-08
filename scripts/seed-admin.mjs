import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error('Set ADMIN_USERNAME and ADMIN_PASSWORD in your environment before running this script.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

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
