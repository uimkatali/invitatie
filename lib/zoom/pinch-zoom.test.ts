import { describe, it, expect } from 'vitest';
import {
  MIN_SCALE,
  MAX_SCALE,
  DOUBLE_TAP_SCALE,
  clampScale,
  distanceBetween,
  midpoint,
  pinchScale,
  nextDoubleTapScale,
  clampPan,
  zoomAround,
  isTap,
  isDoubleTap,
  wheelScale,
} from './pinch-zoom';

const container = { width: 400, height: 800 };

describe('clampScale', () => {
  it('keeps values inside [1, 4]', () => {
    expect(clampScale(0.2)).toBe(MIN_SCALE);
    expect(clampScale(2)).toBe(2);
    expect(clampScale(9)).toBe(MAX_SCALE);
  });

  it('falls back to the minimum for NaN or infinity', () => {
    expect(clampScale(Number.NaN)).toBe(MIN_SCALE);
    expect(clampScale(Number.POSITIVE_INFINITY)).toBe(MIN_SCALE);
  });
});

describe('distanceBetween / midpoint', () => {
  it('computes the euclidean distance', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('computes the middle point', () => {
    expect(midpoint({ x: 0, y: 10 }, { x: 10, y: 30 })).toEqual({ x: 5, y: 20 });
  });
});

describe('pinchScale', () => {
  it('scales proportionally to the finger distance, clamped', () => {
    expect(pinchScale(100, 200, 1)).toBe(2);
    expect(pinchScale(100, 50, 2)).toBe(1);
    expect(pinchScale(100, 1000, 1)).toBe(MAX_SCALE);
  });

  it('ignores a zero start distance', () => {
    expect(pinchScale(0, 200, 1.5)).toBe(1.5);
  });
});

describe('nextDoubleTapScale', () => {
  it('zooms in from 1x and resets from a zoomed state', () => {
    expect(nextDoubleTapScale(1)).toBe(DOUBLE_TAP_SCALE);
    expect(nextDoubleTapScale(1.005)).toBe(DOUBLE_TAP_SCALE);
    expect(nextDoubleTapScale(2.5)).toBe(MIN_SCALE);
    expect(nextDoubleTapScale(4)).toBe(MIN_SCALE);
  });
});

describe('clampPan', () => {
  it('forces zero pan at 1x', () => {
    expect(clampPan({ x: 50, y: -50 }, 1, container)).toEqual({ x: 0, y: 0 });
  });

  it('limits the pan to half of the extra size per axis', () => {
    // la 2x, surplusul e jumatate din dimensiune pe fiecare parte: 400*(2-1)/2 = 200
    expect(clampPan({ x: 999, y: 999 }, 2, container)).toEqual({ x: 200, y: 400 });
    expect(clampPan({ x: -999, y: -999 }, 2, container)).toEqual({ x: -200, y: -400 });
    expect(clampPan({ x: 10, y: -20 }, 2, container)).toEqual({ x: 10, y: -20 });
  });
});

describe('zoomAround', () => {
  it('keeps the anchored point fixed on screen', () => {
    const view = { scale: 1, pan: { x: 0, y: 0 } };
    const anchor = { x: 100, y: 0 };
    const next = zoomAround(view, 2, anchor, container);
    // punctul de sub ancora: q = (a - pan) / scale = 100; dupa zoom: a - 2*q + ... = -100 => pan.x = -100
    expect(next.scale).toBe(2);
    expect(next.pan.x).toBe(-100);
    expect(next.pan.y).toBe(0);
  });

  it('returns to the origin when zooming back out to 1x', () => {
    const zoomed = zoomAround({ scale: 1, pan: { x: 0, y: 0 } }, 3, { x: 80, y: 40 }, container);
    const reset = zoomAround(zoomed, 1, { x: 80, y: 40 }, container);
    expect(reset).toEqual({ scale: 1, pan: { x: 0, y: 0 } });
  });

  it('clamps the requested scale', () => {
    const next = zoomAround({ scale: 1, pan: { x: 0, y: 0 } }, 50, { x: 0, y: 0 }, container);
    expect(next.scale).toBe(MAX_SCALE);
  });
});

describe('isTap', () => {
  it('is a tap only for a short, almost motionless press', () => {
    expect(isTap({ x: 0, y: 0 }, { x: 3, y: 4 }, 120)).toBe(true);
    expect(isTap({ x: 0, y: 0 }, { x: 30, y: 0 }, 120)).toBe(false);
    expect(isTap({ x: 0, y: 0 }, { x: 0, y: 0 }, 700)).toBe(false);
  });
});

describe('isDoubleTap', () => {
  it('needs a second tap soon and close to the first', () => {
    const first = { time: 1000, x: 100, y: 100 };
    expect(isDoubleTap(first, { time: 1200, x: 110, y: 105 })).toBe(true);
    expect(isDoubleTap(first, { time: 1500, x: 100, y: 100 })).toBe(false);
    expect(isDoubleTap(first, { time: 1200, x: 300, y: 100 })).toBe(false);
    expect(isDoubleTap(null, { time: 1200, x: 100, y: 100 })).toBe(false);
  });
});

describe('wheelScale', () => {
  it('zooms in on scroll up and out on scroll down', () => {
    expect(wheelScale(2, -100)).toBeGreaterThan(2);
    expect(wheelScale(2, 100)).toBeLessThan(2);
    expect(wheelScale(1, 100)).toBe(MIN_SCALE);
  });
});
