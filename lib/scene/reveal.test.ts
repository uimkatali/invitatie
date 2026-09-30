import { describe, it, expect } from 'vitest';
import { REVEAL_TITLE_DELAY_S } from './particles';
import { titleDelayMs } from './reveal';

describe('titleDelayMs', () => {
  it('shows the title immediately for reduced motion', () => {
    expect(titleDelayMs({ reduced: true, webgl: true, revealAt: null, now: 10 })).toBe(0);
  });

  it('shows the title immediately when WebGL is unavailable', () => {
    expect(titleDelayMs({ reduced: false, webgl: false, revealAt: null, now: 10 })).toBe(0);
  });

  it('waits (null) while the canvas has not started the reveal', () => {
    expect(titleDelayMs({ reduced: false, webgl: true, revealAt: null, now: 10 })).toBeNull();
    expect(titleDelayMs({ reduced: false, webgl: null, revealAt: null, now: 10 })).toBeNull();
  });

  it('counts the delay from the moment the reveal started', () => {
    expect(titleDelayMs({ reduced: false, webgl: true, revealAt: 10, now: 10 })).toBeCloseTo(REVEAL_TITLE_DELAY_S * 1000);
    expect(titleDelayMs({ reduced: false, webgl: true, revealAt: 10, now: 11 })).toBeCloseTo((REVEAL_TITLE_DELAY_S - 1) * 1000);
  });

  it('never returns a negative delay', () => {
    expect(titleDelayMs({ reduced: false, webgl: true, revealAt: 0, now: 100 })).toBe(0);
  });
});
