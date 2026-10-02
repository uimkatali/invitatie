export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
export const DOUBLE_TAP_SCALE = 2.5;

/** Un tap e scurt si aproape nemiscat; altfel e tragere sau apasare lunga. */
const TAP_MAX_MOVE_PX = 10;
const TAP_MAX_DURATION_MS = 300;
/** Al doilea tap trebuie sa vina repede si aproape de primul. */
export const DOUBLE_TAP_MAX_GAP_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE_PX = 40;

const WHEEL_PIXEL_SENSITIVITY = 0.0015;
const WHEEL_LINE_SENSITIVITY = 0.05;
const WHEEL_PAGE_SENSITIVITY = 1;
/** Pinch-ul de pe trackpad vine ca wheel cu ctrlKey si delte mici. */
const WHEEL_PINCH_BOOST = 10;

const KEY_ZOOM_STEP = 1.25;
const KEY_PAN_PX = 40;

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * Transformarea aplicata imaginii: translate(pan) scale(scale), cu originea in centrul scenei.
 * `pan` e in pixeli de ecran, relativ la centrul scenei.
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

/** Starea la inceputul unui pinch: pe ea se calculeaza fiecare pas, ca sa nu se acumuleze erori. */
export interface PinchStart {
  distance: number;
  scale: number;
  mid: Point;
  pan: Point;
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

function clampAxis(value: number, contentSize: number, containerSize: number, scale: number): number {
  // Surplusul fiecarei parti dupa zoom; daca imaginea mareste inca incape in scena, nu se poate trage deloc.
  const max = Math.max(0, (contentSize * scale - containerSize) / 2);
  if (!Number.isFinite(value)) return 0;
  // `+ 0` normalizeaza -0 la 0.
  return Math.min(max, Math.max(-max, value)) + 0;
}

/**
 * Limiteaza tragerea dupa marimea REALA a imaginii (nu a scenei), pe fiecare axa separat:
 * o poza landscape pe un telefon portret are benzi libere sus si jos si nu trebuie sa poata iesi din ecran.
 */
export function clampPan(pan: Point, scale: number, content: Size, container: Size): Point {
  return {
    x: clampAxis(pan.x, content.width, container.width, scale),
    y: clampAxis(pan.y, content.height, container.height, scale),
  };
}

/**
 * Schimba scala pastrand fix, pe ecran, punctul de sub `anchor` (relativ la centrul scenei).
 * Din p = pan + scale * q rezulta pan' = anchor - (nouaScala / scala) * (anchor - pan).
 */
export function zoomAround(view: View, nextScale: number, anchor: Point, content: Size, container: Size): View {
  const scale = clampScale(nextScale);
  const ratio = scale / view.scale;
  const pan = clampPan(
    {
      x: anchor.x - ratio * (anchor.x - view.pan.x),
      y: anchor.y - ratio * (anchor.y - view.pan.y),
    },
    scale,
    content,
    container,
  );
  return { scale, pan };
}

/**
 * Starea la un pas de pinch, calculata din starea de la inceputul gestului:
 * zoom ancorat pe mijlocul de la inceput + deplasarea mijlocului curent (pan cu doua degete).
 */
export function pinchView(start: PinchStart, distance: number, mid: Point, content: Size, container: Size): View {
  const scale = pinchScale(start.distance, distance, start.scale);
  const ratio = scale / start.scale;
  const pan = clampPan(
    {
      x: mid.x - ratio * (start.mid.x - start.pan.x),
      y: mid.y - ratio * (start.mid.y - start.pan.y),
    },
    scale,
    content,
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

/**
 * Rotita de mouse: derulare in sus mareste, in jos micsoreaza (deltaY negativ = in sus).
 * deltaMode: 0 = pixeli, 1 = linii (Firefox), 2 = pagini. Pinch-ul de trackpad (ctrlKey) merge mai repede.
 */
export function wheelScale(current: number, deltaY: number, deltaMode = 0, ctrlKey = false): number {
  const unit =
    deltaMode === 1 ? WHEEL_LINE_SENSITIVITY : deltaMode === 2 ? WHEEL_PAGE_SENSITIVITY : WHEEL_PIXEL_SENSITIVITY;
  const delta = Number.isFinite(deltaY) ? deltaY : 0;
  return clampScale(current * Math.exp(-delta * unit * (ctrlKey ? WHEEL_PINCH_BOOST : 1)));
}

/**
 * Zoom si pan de la tastatura: + / = mareste, - micsoreaza, 0 reseteaza, sagetile trag poza cand e marita.
 * Intoarce null pentru orice alta tasta.
 */
export function keyboardView(view: View, key: string, content: Size, container: Size): View | null {
  const center = { x: 0, y: 0 };
  switch (key) {
    case '+':
    case '=':
      return zoomAround(view, view.scale * KEY_ZOOM_STEP, center, content, container);
    case '-':
    case '_':
      return zoomAround(view, view.scale / KEY_ZOOM_STEP, center, content, container);
    case '0':
      return { scale: MIN_SCALE, pan: { x: 0, y: 0 } };
  }
  if (view.scale <= MIN_SCALE) return null;
  const delta: Record<string, Point> = {
    ArrowLeft: { x: KEY_PAN_PX, y: 0 },
    ArrowRight: { x: -KEY_PAN_PX, y: 0 },
    ArrowUp: { x: 0, y: KEY_PAN_PX },
    ArrowDown: { x: 0, y: -KEY_PAN_PX },
  };
  const step = delta[key];
  if (!step) return null;
  return {
    scale: view.scale,
    pan: clampPan({ x: view.pan.x + step.x, y: view.pan.y + step.y }, view.scale, content, container),
  };
}
