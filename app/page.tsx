import { sql } from '@vercel/postgres';
import { getPublicSettings } from '../lib/get-public-settings';
import { getThemeForId } from '../lib/themes';
import HomeClient from '../components/HomeClient';
import type { MediaItem, MediaZone } from '../lib/media';

// Settings live in the database and can change at any time via the admin panel;
// force-dynamic also avoids build-time prerendering trying to hit the DB.
export const dynamic = 'force-dynamic';

function rowToMediaItem(row: any): MediaItem {
  return {
    id: row.id,
    url: row.url,
    zone: row.zone as MediaZone,
    createdAt: row.created_at,
  };
}

export default async function Home() {
  const settings = await getPublicSettings();
  const theme = getThemeForId(settings.activeThemeId, settings.themeColorOverrides);
  const { rows } = await sql`SELECT * FROM media ORDER BY created_at DESC`;
  const media = rows.map(rowToMediaItem);

  return <HomeClient settings={settings} theme={theme} media={media} />;
}
