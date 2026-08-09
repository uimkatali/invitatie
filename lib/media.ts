export const MEDIA_ZONES = ['heroBackground', 'revealBackground', 'gallery'] as const;
export type MediaZone = (typeof MEDIA_ZONES)[number];

export function isValidZone(zone: string): zone is MediaZone {
  return (MEDIA_ZONES as readonly string[]).includes(zone);
}

export interface MediaItem {
  id: number;
  url: string;
  zone: MediaZone;
  createdAt: string;
}
