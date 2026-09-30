'use client';

import { useEffect } from 'react';
import type { ThemeId } from '@/lib/domain';
import { sceneStore, type SceneMode } from '@/lib/scene/store';

/** Pusa intr-o pagina, seteaza tema / modul scenei cat timp pagina e montata. */
export default function SceneController({ theme, mode = 'ambient' }: { theme: ThemeId; mode?: SceneMode }) {
  useEffect(() => {
    sceneStore.set({ theme, mode });
  }, [theme, mode]);

  useEffect(() => () => sceneStore.reset(), []);

  return null;
}
