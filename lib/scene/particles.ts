import type { ParticleKind } from './themes';
import { range, type Random } from './random';

export interface Bounds {
  x: number;
  y: number;
  zNear: number;
  zFar: number;
}

/** Volumul prin care cad particulele; camera experientei calatoreste de la z=8 la z=-26. */
export const WORLD_BOUNDS: Bounds = { x: 10, y: 7, zNear: 5, zFar: -40 };

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  fall: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  scale: number;
  colorIndex: number;
}

const PROFILES: Record<ParticleKind, { fall: [number, number]; sway: [number, number]; freq: [number, number]; scale: [number, number]; spin: number }> = {
  leaf: { fall: [0.35, 0.65], sway: [0.5, 1.0], freq: [0.6, 1.2], scale: [0.28, 0.45], spin: 1.4 },
  snowflake: { fall: [0.12, 0.28], sway: [0.15, 0.35], freq: [0.3, 0.6], scale: [0.12, 0.22], spin: 0.5 },
};

export function createParticles(count: number, kind: ParticleKind, bounds: Bounds, random: Random): Particle[] {
  const profile = PROFILES[kind];
  return Array.from({ length: count }, () => ({
    kind,
    x: range(random, -bounds.x, bounds.x),
    y: range(random, -bounds.y, bounds.y),
    z: range(random, bounds.zFar, bounds.zNear),
    rx: range(random, 0, Math.PI * 2),
    ry: range(random, 0, Math.PI * 2),
    rz: range(random, 0, Math.PI * 2),
    spinX: range(random, -profile.spin, profile.spin),
    spinY: range(random, -profile.spin, profile.spin),
    spinZ: range(random, -profile.spin, profile.spin),
    fall: range(random, ...profile.fall),
    swayAmp: range(random, ...profile.sway),
    swayFreq: range(random, ...profile.freq),
    phase: range(random, 0, Math.PI * 2),
    scale: range(random, ...profile.scale),
    colorIndex: Math.floor(random() * 1000),
  }));
}

export interface StepInput {
  dt: number;
  time: number;
  /** Vant orizontal din miscarea mouse-ului, aprox. [-1.5, 1.5]. */
  wind: number;
  /** Multiplicator global de viteza (reduced motion, settle). */
  speed: number;
  /** 0..1, rotatie in jurul axei camerei. */
  swirl: number;
  /** 0..1, impingere radiala (rafala). */
  burst: number;
}

/** Un pas de simulare, pe loc (fara alocari: ruleaza pentru sute de particule la 60 fps). */
export function stepParticle(p: Particle, input: StepInput, bounds: Bounds, random: Random): void {
  const { dt, time, wind, speed, swirl, burst } = input;
  const step = dt * speed;

  p.y -= p.fall * step;
  p.x += (Math.sin(time * p.swayFreq + p.phase) * p.swayAmp * 0.6 + wind) * step;

  if (swirl > 0) {
    const angle = swirl * 0.8 * step;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = p.x * cos - p.y * sin;
    p.y = p.x * sin + p.y * cos;
    p.x = x;
  }

  if (burst > 0) {
    const length = Math.hypot(p.x, p.y) || 1;
    p.x += (p.x / length) * burst * 6 * dt;
    p.y += (p.y / length) * burst * 6 * dt;
  }

  p.rx += p.spinX * step;
  p.ry += p.spinY * step;
  p.rz += p.spinZ * step;

  if (p.y < -bounds.y) {
    p.y = bounds.y;
    p.x = range(random, -bounds.x, bounds.x);
  } else if (p.y > bounds.y + 2) {
    p.y = -bounds.y;
  }
  if (p.x > bounds.x + 1) p.x = -bounds.x;
  else if (p.x < -bounds.x - 1) p.x = bounds.x;
}

export const HEART_Z = 2;

/** Curba clasica a inimii, scalata la cateva unitati. */
export function heartPoint(t: number, scale = 0.16): { x: number; y: number } {
  const x = 16 * Math.sin(t) ** 3;
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x: x * scale, y: y * scale + 0.4 };
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export const REVEAL_TITLE_DELAY_S = 2.9;

/** Cat de mult sunt trase particulele in forma de inima, la `elapsed` secunde de la deschidere. */
export function revealMix(elapsed: number): number {
  if (elapsed <= 0) return 0;
  if (elapsed < 2) return easeInOut(elapsed / 2);
  if (elapsed < 2.6) return 1;
  if (elapsed < 3.4) return 1 - easeInOut((elapsed - 2.6) / 0.8);
  return 0;
}

export const BURST_DURATION_S = 1.6;

export function burstStrength(elapsed: number): number {
  if (elapsed < 0 || elapsed > BURST_DURATION_S) return 0;
  return 1 - elapsed / BURST_DURATION_S;
}
