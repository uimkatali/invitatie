'use client';

import { useSyncExternalStore } from 'react';
import { DEFAULT_SCENE_STATE, sceneStore, type SceneState } from '@/lib/scene/store';

export function useSceneState(): SceneState {
  return useSyncExternalStore(sceneStore.subscribe, sceneStore.get, () => DEFAULT_SCENE_STATE);
}
