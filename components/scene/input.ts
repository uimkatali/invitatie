/** Starea mutabila a input-ului, citita in useFrame (fara re-randari React). */
export const pointer = { x: 0, y: 0, wind: 0 };

let lastX = 0;
let lastTime = 0;

export function onPointerMove(event: PointerEvent): void {
  const x = (event.clientX / window.innerWidth) * 2 - 1;
  const y = -((event.clientY / window.innerHeight) * 2 - 1);
  const now = performance.now();
  const dt = Math.max(16, now - lastTime) / 1000;
  const velocity = (x - lastX) / dt;
  pointer.wind = Math.max(-1.5, Math.min(1.5, pointer.wind + velocity * 0.15));
  pointer.x = x;
  pointer.y = y;
  lastX = x;
  lastTime = now;
}

/** Vantul se stinge treptat cand mouse-ul sta. */
export function decayWind(dt: number): void {
  pointer.wind *= Math.exp(-dt * 1.5);
}

export function readScrollProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / max));
}
