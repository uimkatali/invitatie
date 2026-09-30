import { REVEAL_TITLE_DELAY_S } from './particles';

/** Daca canvas-ul nu porneste reveal-ul in acest timp, titlul apare oricum. */
export const REVEAL_FALLBACK_MS = 1500;

export interface TitleTimingInput {
  reduced: boolean;
  webgl: boolean | null;
  revealAt: number | null;
  now: number;
}

/**
 * Dupa cate milisecunde apare titlul: 0 fara animatie (reduced motion / fara WebGL),
 * `null` cat timp asteptam ca primul cadru al canvas-ului sa porneasca reveal-ul.
 */
export function titleDelayMs({ reduced, webgl, revealAt, now }: TitleTimingInput): number | null {
  if (reduced || webgl === false) return 0;
  if (revealAt === null) return null;
  return Math.max(0, (revealAt + REVEAL_TITLE_DELAY_S - now) * 1000);
}
