import { describe, it, expect } from 'vitest';
import { mulberry32 } from './random';
import {
  WORLD_BOUNDS,
  createParticles,
  stepParticle,
  heartPoint,
  revealMix,
  burstStrength,
  REVEAL_TITLE_DELAY_S,
  HEART_SCALE,
  heartScaleFor,
  type StepInput,
} from './particles';

const calm: StepInput = { dt: 1 / 60, time: 0, wind: 0, speed: 1, swirl: 0, burst: 0 };

describe('createParticles', () => {
  it('creates deterministic particles inside the world', () => {
    const a = createParticles(50, 'leaf', WORLD_BOUNDS, mulberry32(3));
    const b = createParticles(50, 'leaf', WORLD_BOUNDS, mulberry32(3));
    expect(a).toEqual(b);
    for (const p of a) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(WORLD_BOUNDS.x);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(WORLD_BOUNDS.y);
      expect(p.z).toBeLessThanOrEqual(WORLD_BOUNDS.zNear);
      expect(p.z).toBeGreaterThanOrEqual(WORLD_BOUNDS.zFar);
    }
  });

  it('makes leaves fall faster than snowflakes on average', () => {
    const avg = (kind: 'leaf' | 'snowflake') => {
      const list = createParticles(200, kind, WORLD_BOUNDS, mulberry32(9));
      return list.reduce((s, p) => s + p.fall, 0) / list.length;
    };
    expect(avg('leaf')).toBeGreaterThan(avg('snowflake'));
  });
});

describe('stepParticle', () => {
  it('moves particles down', () => {
    const random = mulberry32(5);
    const [p] = createParticles(1, 'snowflake', WORLD_BOUNDS, random);
    const y = p.y;
    stepParticle(p, calm, WORLD_BOUNDS, random);
    expect(p.y).toBeLessThan(y);
  });

  it('wraps particles that fall below the world back to the top', () => {
    const random = mulberry32(5);
    const [p] = createParticles(1, 'leaf', WORLD_BOUNDS, random);
    p.y = -WORLD_BOUNDS.y - 0.01;
    stepParticle(p, calm, WORLD_BOUNDS, random);
    expect(p.y).toBe(WORLD_BOUNDS.y);
  });

  it('pushes particles away from the center during a burst', () => {
    const random = mulberry32(5);
    const [p] = createParticles(1, 'leaf', WORLD_BOUNDS, random);
    p.x = 1;
    p.y = 0;
    p.fall = 0;
    p.swayAmp = 0;
    stepParticle(p, { ...calm, burst: 1 }, WORLD_BOUNDS, random);
    expect(p.x).toBeGreaterThan(1);
  });

  it('does not move when speed is zero', () => {
    const random = mulberry32(5);
    const [p] = createParticles(1, 'leaf', WORLD_BOUNDS, random);
    const before = { ...p };
    stepParticle(p, { ...calm, speed: 0 }, WORLD_BOUNDS, random);
    expect(p.x).toBe(before.x);
    expect(p.y).toBe(before.y);
  });
});

describe('heartPoint', () => {
  it('is symmetric around the vertical axis', () => {
    const a = heartPoint(1);
    const b = heartPoint(-1);
    expect(a.x).toBeCloseTo(-b.x);
    expect(a.y).toBeCloseTo(b.y);
  });
});

describe('revealMix', () => {
  it('rises to 1, holds, then releases before the title appears', () => {
    expect(revealMix(-1)).toBe(0);
    expect(revealMix(0)).toBe(0);
    expect(revealMix(1)).toBeCloseTo(0.5);
    expect(revealMix(2.4)).toBe(1);
    expect(revealMix(REVEAL_TITLE_DELAY_S + 1)).toBe(0);
  });
});

describe('burstStrength', () => {
  it('decays from 1 to 0', () => {
    expect(burstStrength(0)).toBe(1);
    expect(burstStrength(0.8)).toBeCloseTo(0.5);
    expect(burstStrength(2)).toBe(0);
    expect(burstStrength(-0.1)).toBe(0);
  });
});

describe('heartScaleFor', () => {
  it('is capped at the default scale on wide screens', () => {
    expect(heartScaleFor(16 / 9, 6, 55)).toBe(HEART_SCALE);
  });

  it('shrinks on portrait screens so the heart fits the width', () => {
    const landscape = heartScaleFor(16 / 9, 6, 55);
    const portrait = heartScaleFor(9 / 19, 6, 55);
    expect(portrait).toBeLessThan(landscape);
    // Semilatimea inimii (16 * scale) ramane in 85% din semilatimea vizibila.
    const halfWidth = 6 * Math.tan((55 * Math.PI) / 360) * (9 / 19);
    expect(16 * portrait).toBeLessThanOrEqual(halfWidth * 0.85 + 1e-9);
  });

  it('never returns a negative or zero scale', () => {
    expect(heartScaleFor(0.0001, 6, 55)).toBeGreaterThan(0);
  });
});
