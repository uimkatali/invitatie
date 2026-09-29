'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useSceneState } from './useSceneState';

const SceneCanvas = dynamic(() => import('./SceneCanvas'), { ssr: false });

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

interface Support {
  webgl: boolean;
  reduced: boolean;
}

/** Cerul CSS e mereu prezent (fallback fara WebGL si cat se incarca 3D-ul); canvas-ul vine peste el. */
export default function SceneRoot() {
  const { theme } = useSceneState();
  const [support, setSupport] = useState<Support | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSupport({ webgl: hasWebGL(), reduced: query.matches });
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return (
    <>
      <div className="sky" data-theme={theme} aria-hidden="true" />
      {support?.webgl && (
        <div className="scene-layer" aria-hidden="true">
          <SceneCanvas reduced={support.reduced} />
        </div>
      )}
    </>
  );
}
