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
});
