import { getPublicSettings } from '../lib/get-public-settings';
import { getThemeForId } from '../lib/themes';
import HomeClient from '../components/HomeClient';

// Settings live in the database and can change at any time via the admin panel;
// force-dynamic also avoids build-time prerendering trying to hit the DB.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const settings = await getPublicSettings();
  const theme = getThemeForId(settings.activeThemeId, settings.themeColorOverrides);

  return <HomeClient settings={settings} theme={theme} />;
}
