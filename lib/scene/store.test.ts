import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sceneStore, triggerBurst, DEFAULT_SCENE_STATE } from './store';

describe('sceneStore', () => {
  beforeEach(() => sceneStore.reset());

  it('merges patches and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = sceneStore.subscribe(listener);
    sceneStore.set({ theme: 'iarna', mode: 'experience' });
    expect(sceneStore.get()).toMatchObject({ theme: 'iarna', mode: 'experience' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    sceneStore.set({ swirl: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('reset restores defaults but keeps a running burst', () => {
    sceneStore.set({ theme: 'toamna', swirl: true });
    triggerBurst(12.5);
    sceneStore.reset();
    expect(sceneStore.get()).toEqual({ ...DEFAULT_SCENE_STATE, burstAt: 12.5 });
  });

  it('starts with unknown webgl support and no pending reveal', () => {
    expect(DEFAULT_SCENE_STATE.webgl).toBeNull();
    expect(DEFAULT_SCENE_STATE.revealPending).toBe(false);
  });

  it('reset keeps the detected webgl support but clears the reveal', () => {
    sceneStore.set({ webgl: true, revealPending: true, revealAt: 3 });
    sceneStore.reset();
    expect(sceneStore.get()).toMatchObject({ webgl: true, revealPending: false, revealAt: null });
    sceneStore.set({ webgl: null });
  });

  it('does not emit or replace the state when a patch changes nothing', () => {
    const listener = vi.fn();
    sceneStore.set({ theme: 'iarna' });
    const before = sceneStore.get();
    const unsubscribe = sceneStore.subscribe(listener);
    sceneStore.set({ theme: 'iarna' });
    sceneStore.set({});
    expect(listener).not.toHaveBeenCalled();
    expect(sceneStore.get()).toBe(before);
    sceneStore.set({ theme: 'toamna' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
