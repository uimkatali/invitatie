import { describe, it, expect } from 'vitest';
import {
  MIN_SCALE,
  MAX_SCALE,
  DOUBLE_TAP_SCALE,
  DOUBLE_TAP_MAX_GAP_MS,
  clampScale,
  distanceBetween,
  midpoint,
  pinchScale,
  pinchView,
  nextDoubleTapScale,
  clampPan,
  zoomAround,
  isTap,
  isDoubleTap,
  wheelScale,
  keyboardView,
} from './pinch-zoom';

// Imaginea umple scena (cazul simplu)...
const container = { width: 400, height: 800 };
const fills = { width: 400, height: 800 };
// ...sau e incadrata: poza landscape 400x300 intr-o scena portret 400x800 (benzi sus si jos).
const letterboxed = { width: 400, height: 300 };

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

  it('ignores a zero start distance and bad current distances', () => {
    expect(pinchScale(0, 200, 1.5)).toBe(1.5);
    expect(pinchScale(100, Number.NaN, 2)).toBe(MIN_SCALE);
    expect(pinchScale(100, -50, 2)).toBe(MIN_SCALE);
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
    expect(clampPan({ x: 50, y: -50 }, 1, fills, container)).toEqual({ x: 0, y: 0 });
  });

  it('limits the pan to half of the extra size per axis when the image fills the stage', () => {
    // la 2x: 400*(2-1)/2 = 200 pe X, 800*(2-1)/2 = 400 pe Y
    expect(clampPan({ x: 999, y: 999 }, 2, fills, container)).toEqual({ x: 200, y: 400 });
    expect(clampPan({ x: -999, y: -999 }, 2, fills, container)).toEqual({ x: -200, y: -400 });
    expect(clampPan({ x: 10, y: -20 }, 2, fills, container)).toEqual({ x: 10, y: -20 });
  });

  it('clamps by the real image size, so a letterboxed photo cannot leave the screen', () => {
    // la 4x: X = (400*4 - 400)/2 = 600, Y = (300*4 - 800)/2 = 200 (nu 1200, cat ar da dimensiunea scenei)
    expect(clampPan({ x: 9999, y: 9999 }, 4, letterboxed, container)).toEqual({ x: 600, y: 200 });
    expect(clampPan({ x: -9999, y: -9999 }, 4, letterboxed, container)).toEqual({ x: -600, y: -200 });
  });

  it('allows no pan on an axis where the zoomed image still fits', () => {
    // la 2x poza are 600px inaltime, scena 800: Y blocat; X liber
    expect(clampPan({ x: 150, y: 150 }, 2, letterboxed, container)).toEqual({ x: 150, y: 0 });
  });

  it('never returns NaN', () => {
    expect(clampPan({ x: Number.NaN, y: 10 }, 2, fills, container)).toEqual({ x: 0, y: 10 });
    expect(clampPan({ x: 5, y: 5 }, 2, { width: 0, height: 0 }, { width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe('zoomAround', () => {
  it('keeps the anchored point fixed on screen', () => {
    const view = { scale: 1, pan: { x: 0, y: 0 } };
    const next = zoomAround(view, 2, { x: 100, y: 0 }, fills, container);
    expect(next.scale).toBe(2);
    expect(next.pan.x).toBe(-100);
    expect(next.pan.y).toBe(0);
  });

  it('keeps the anchor fixed from a non-trivial state, zooming in and out', () => {
    const anchor = { x: 60, y: -120 };
    const start = { scale: 2, pan: { x: 40, y: -30 } };
    for (const target of [3, 1.5]) {
      const next = zoomAround(start, target, anchor, fills, container);
      // punctul de continut de sub ancora: q = (a - pan) / s; pe ecran: pan' + s' * q trebuie sa ramana a
      const q = { x: (anchor.x - start.pan.x) / start.scale, y: (anchor.y - start.pan.y) / start.scale };
      expect(next.pan.x + next.scale * q.x).toBeCloseTo(anchor.x, 6);
      expect(next.pan.y + next.scale * q.y).toBeCloseTo(anchor.y, 6);
    }
  });

  it('returns to the origin when zooming back out to 1x', () => {
    const zoomed = zoomAround({ scale: 1, pan: { x: 0, y: 0 } }, 3, { x: 80, y: 40 }, fills, container);
    const reset = zoomAround(zoomed, 1, { x: 80, y: 40 }, fills, container);
    expect(reset).toEqual({ scale: 1, pan: { x: 0, y: 0 } });
  });

  it('clamps the requested scale and stays in bounds for a letterboxed photo', () => {
    const next = zoomAround({ scale: 1, pan: { x: 0, y: 0 } }, 50, { x: 0, y: 700 }, letterboxed, container);
    expect(next.scale).toBe(MAX_SCALE);
    expect(Math.abs(next.pan.y)).toBeLessThanOrEqual(200);
  });
});

describe('pinchView', () => {
  const start = { distance: 100, scale: 1, mid: { x: 50, y: 0 }, pan: { x: 0, y: 0 } };

  it('zooms around the starting midpoint when the fingers stay centered there', () => {
    const view = pinchView(start, 200, { x: 50, y: 0 }, fills, container);
    expect(view.scale).toBe(2);
    expect(view.pan.x).toBe(-50);
  });

  it('also pans when both fingers move together', () => {
    const still = pinchView(start, 200, { x: 50, y: 0 }, fills, container);
    const moved = pinchView(start, 200, { x: 80, y: 0 }, fills, container);
    expect(moved.pan.x - still.pan.x).toBe(30);
  });

  it('is exact on reversal: pinching back to the start distance restores the start view', () => {
    const view = pinchView(start, 100, { x: 50, y: 0 }, fills, container);
    expect(view).toEqual({ scale: 1, pan: { x: 0, y: 0 } });
  });
});

describe('isTap', () => {
  it('is a tap only for a short, almost motionless press', () => {
    expect(isTap({ x: 0, y: 0 }, { x: 3, y: 4 }, 120)).toBe(true);
    expect(isTap({ x: 0, y: 0 }, { x: 30, y: 0 }, 120)).toBe(false);
    expect(isTap({ x: 0, y: 0 }, { x: 0, y: 0 }, 700)).toBe(false);
  });

  it('accepts the exact limits (10px, 300ms)', () => {
    expect(isTap({ x: 0, y: 0 }, { x: 10, y: 0 }, 300)).toBe(true);
    expect(isTap({ x: 0, y: 0 }, { x: 10.5, y: 0 }, 300)).toBe(false);
    expect(isTap({ x: 0, y: 0 }, { x: 0, y: 0 }, 301)).toBe(false);
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

  it('accepts the exact limits (gap and 40px)', () => {
    const first = { time: 1000, x: 0, y: 0 };
    expect(isDoubleTap(first, { time: 1000 + DOUBLE_TAP_MAX_GAP_MS, x: 40, y: 0 })).toBe(true);
    expect(isDoubleTap(first, { time: 1000 + DOUBLE_TAP_MAX_GAP_MS + 1, x: 0, y: 0 })).toBe(false);
    expect(isDoubleTap(first, { time: 1100, x: 41, y: 0 })).toBe(false);
  });
});

describe('wheelScale', () => {
  it('zooms in on scroll up and out on scroll down', () => {
    expect(wheelScale(2, -100)).toBeGreaterThan(2);
    expect(wheelScale(2, 100)).toBeLessThan(2);
    expect(wheelScale(1, 100)).toBe(MIN_SCALE);
  });

  it('treats line-based wheels (Firefox) as bigger steps than pixel-based ones', () => {
    expect(wheelScale(2, -3, 1)).toBeGreaterThan(wheelScale(2, -3, 0));
  });

  it('zooms faster for a trackpad pinch (ctrlKey) than for a plain wheel', () => {
    expect(wheelScale(2, -5, 0, true)).toBeGreaterThan(wheelScale(2, -5, 0, false));
  });

  it('keeps the scale on NaN input', () => {
    expect(wheelScale(2, Number.NaN)).toBe(2);
  });
});

describe('keyboardView', () => {
  const view = { scale: 2, pan: { x: 0, y: 0 } };

  it('zooms with + and - and resets with 0', () => {
    expect(keyboardView({ scale: 1, pan: { x: 0, y: 0 } }, '+', fills, container)?.scale).toBe(1.25);
    expect(keyboardView(view, '=', fills, container)?.scale).toBe(2.5);
    expect(keyboardView(view, '-', fills, container)?.scale).toBe(1.6);
    expect(keyboardView(view, '0', fills, container)).toEqual({ scale: 1, pan: { x: 0, y: 0 } });
  });

  it('pans with arrows only while zoomed', () => {
    expect(keyboardView(view, 'ArrowLeft', fills, container)?.pan).toEqual({ x: 40, y: 0 });
    expect(keyboardView(view, 'ArrowDown', fills, container)?.pan).toEqual({ x: 0, y: -40 });
    expect(keyboardView({ scale: 1, pan: { x: 0, y: 0 } }, 'ArrowLeft', fills, container)).toBeNull();
  });

  it('ignores other keys', () => {
    expect(keyboardView(view, 'a', fills, container)).toBeNull();
    expect(keyboardView(view, 'Tab', fills, container)).toBeNull();
  });
});
