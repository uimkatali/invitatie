import type { ThemeId } from '../domain';

export type SceneMode = 'ambient' | 'experience';

export interface SceneState {
  theme: ThemeId;
  mode: SceneMode;
  /** Particulele se rotesc in jurul axei camerei (sectiunea "Unde"). */
  swirl: boolean;
  /** Particulele incetinesc (sectiunea de raspuns). */
  settle: boolean;
  /** Momentul (secunde, performance.now) cand a pornit reveal-ul cu inima. */
  revealAt: number | null;
  /** Momentul rafalei de la "Da". */
  burstAt: number | null;
}

export const DEFAULT_SCENE_STATE: SceneState = {
  theme: 'amandoua',
  mode: 'ambient',
  swirl: false,
  settle: false,
  revealAt: null,
  burstAt: null,
};

let state: SceneState = DEFAULT_SCENE_STATE;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const sceneStore = {
  get(): SceneState {
    return state;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  set(patch: Partial<SceneState>): void {
    state = { ...state, ...patch };
    emit();
  },
  /** Revine la ambient; rafala in curs continua (pagina se schimba chiar dupa "Da"). */
  reset(): void {
    state = { ...DEFAULT_SCENE_STATE, burstAt: state.burstAt };
    emit();
  },
};

export function nowSeconds(): number {
  return performance.now() / 1000;
}

export function triggerBurst(at: number = nowSeconds()): void {
  sceneStore.set({ burstAt: at });
}
