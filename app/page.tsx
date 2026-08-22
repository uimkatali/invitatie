import { getContent } from '../lib/content';
import { getThemeForId } from '../lib/themes';
import { getActiveThemeId } from '../lib/edge-config';
import HomeClient from '../components/HomeClient';

// Reads the active theme from Edge Config on every request, so a theme change
// from /tema shows up for her without a redeploy.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const content = getContent();
  const activeThemeId = await getActiveThemeId();
  const theme = getThemeForId(activeThemeId, null);

  return <HomeClient content={content} theme={theme} />;
}
