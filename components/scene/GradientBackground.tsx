'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** Cerul ca textura de fundal: canvas opac, deci bloom-ul nu inegreste fundalul. */
export default function GradientBackground({ top, bottom }: { top: string; bottom: string }) {
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
    return () => {
      scene.background = null;
      texture.dispose();
    };
  }, [scene, top, bottom]);

  return null;
}
