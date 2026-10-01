export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
export const DOUBLE_TAP_SCALE = 2.5;

/** Un tap e scurt si aproape nemiscat; altfel e tragere sau apasare lunga. */
const TAP_MAX_MOVE_PX = 10;
const TAP_MAX_DURATION_MS = 300;
/** Al doilea tap trebuie sa vina repede si aproape de primul. */
const DOUBLE_TAP_MAX_GAP_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE_PX = 40;
const WHEEL_SENSITIVITY = 0.0015;

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * Transformarea aplicata imaginii: translate(pan) scale(scale), cu originea in centrul containerului.
 * `pan` e in pixeli de ecran, relativ la centrul containerului.
 */
export interface View {
  scale: number;
  pan: Point;
}

export interface TapRecord {
  time: number;
  x: number;
  y: number;
}

export function clampScale(scale: number, min = MIN_SCALE, max = MAX_SCALE): number {
  if (!Number.isFinite(scale)) return min;
  return Math.min(max, Math.max(min, scale));
}

export function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Scala noua dupa un pinch: proportionala cu raportul distantelor dintre degete. */
export function pinchScale(startDistance: number, currentDistance: number, startScale: number): number {
  if (startDistance <= 0) return clampScale(startScale);
  return clampScale(startScale * (currentDistance / startDistance));
}

/** Dublu-tap: din starea nemarita mareste, din orice stare marita revine la 1x. */
export function nextDoubleTapScale(current: number): number {
  return current > MIN_SCALE + 0.01 ? MIN_SCALE : DOUBLE_TAP_SCALE;
}

/** Zona maxima de tras: jumatate din surplusul de marime pe fiecare parte; la 1x nu se poate trage. */
export function clampPan(pan: Point, scale: number, container: Size): Point {
  const maxX = (container.width * (scale - 1)) / 2;
  const maxY = (container.height * (scale - 1)) / 2;
  if (maxX <= 0 || maxY <= 0) return { x: 0, y: 0 };
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

/**
 * Schimba scala pastrand fix, pe ecran, punctul de sub `anchor` (relativ la centrul containerului).
 * Din p = pan + scale * q rezulta pan' = anchor - (nouaScala / scala) * (anchor - pan).
 */
export function zoomAround(view: View, nextScale: number, anchor: Point, container: Size): View {
  const scale = clampScale(nextScale);
  const ratio = scale / view.scale;
  const pan = clampPan(
    {
      x: anchor.x - ratio * (anchor.x - view.pan.x),
      y: anchor.y - ratio * (anchor.y - view.pan.y),
    },
    scale,
    container,
  );
  return { scale, pan };
}

export function isTap(down: Point, up: Point, durationMs: number): boolean {
  return distanceBetween(down, up) <= TAP_MAX_MOVE_PX && durationMs <= TAP_MAX_DURATION_MS;
}

export function isDoubleTap(previous: TapRecord | null, current: TapRecord): boolean {
  if (!previous) return false;
  return (
    current.time - previous.time <= DOUBLE_TAP_MAX_GAP_MS &&
    distanceBetween(previous, current) <= DOUBLE_TAP_MAX_DISTANCE_PX
  );
}

/** Rotita de mouse: derulare in sus mareste, in jos micsoreaza (deltaY negativ = in sus). */
export function wheelScale(current: number, deltaY: number): number {
  return clampScale(current * Math.exp(-deltaY * WHEEL_SENSITIVITY));
}
