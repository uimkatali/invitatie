import { get } from '@vercel/edge-config';
import { THEME_CONFIGS } from './themes';

export const DEFAULT_THEME_ID = THEME_CONFIGS[0].id;

export function resolveThemeId(rawValue: unknown): string {
  return typeof rawValue === 'string' && rawValue.length > 0 ? rawValue : DEFAULT_THEME_ID;
}

export async function getActiveThemeId(): Promise<string> {
  if (!process.env.EDGE_CONFIG) {
    return DEFAULT_THEME_ID;
  }
  try {
    const value = await get('activeTheme');
    return resolveThemeId(value);
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export async function setActiveThemeId(id: string): Promise<void> {
  const configId = process.env.EDGE_CONFIG_ID;
  const token = process.env.VERCEL_API_TOKEN;
  if (!configId || !token) {
    throw new Error('EDGE_CONFIG_ID sau VERCEL_API_TOKEN lipsesc din variabilele de mediu.');
  }

  const response = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items: [{ operation: 'upsert', key: 'activeTheme', value: id }] }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Scrierea in Edge Config a esuat (${response.status}): ${body}`);
  }
}
