'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { sceneStore } from '@/lib/scene/store';
import { useSceneState } from './useSceneState';

const SceneCanvas = dynamic(() => import('./SceneCanvas'), { ssr: false });

/** Sonda de o singura data; contextul de proba e eliberat imediat. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as
      | WebGLRenderingContext
      | WebGL2RenderingContext
      | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Cerul CSS e mereu prezent (fallback fara WebGL si cat se incarca 3D-ul); canvas-ul vine peste el. */
export default function SceneRoot() {
  const { theme, webgl } = useSceneState();
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    // WebGL se detecteaza o singura data; restul aplicatiei (ex. experienta invitatiei) citeste rezultatul din store.
    if (sceneStore.get().webgl === null) sceneStore.set({ webgl: hasWebGL() });
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return (
    <>
      <div className="sky" data-theme={theme} aria-hidden="true" />
      {webgl === true && reduced !== null && (
        <div className="scene-layer" aria-hidden="true">
          <SceneCanvas reduced={reduced} />
        </div>
      )}
    </>
  );
}
