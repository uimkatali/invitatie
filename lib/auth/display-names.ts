import type { UserId } from '../domain';
import { env } from '../env';

export function formatDisplayName(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function displayNames(): Record<UserId, string> {
  const e = env();
  return { el: formatDisplayName(e.USER_EL_NAME), ea: formatDisplayName(e.USER_EA_NAME) };
}

export function displayName(user: UserId): string {
  return displayNames()[user];
}
