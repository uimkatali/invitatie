'use client';

import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { cameraOnPath, CAMERA_START_Z } from '@/lib/scene/camera';
import type { SceneMode } from '@/lib/scene/store';
import { decayWind, pointer, readScrollProgress } from './input';

export default function CameraRig({ mode, reduced }: { mode: SceneMode; reduced: boolean }) {
  const camera = useThree((state) => state.camera);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    decayWind(delta);
    const follow = 1 - Math.exp(-delta * 3);
    const base = mode === 'experience' && !reduced ? cameraOnPath(readScrollProgress()) : { x: 0, y: 0, z: CAMERA_START_Z };
    const parallaxX = reduced ? 0 : pointer.x * 0.6;
    const parallaxY = reduced ? 0 : pointer.y * 0.4;

    camera.position.x += (base.x + parallaxX - camera.position.x) * follow;
    camera.position.y += (base.y + parallaxY - camera.position.y) * follow;
    camera.position.z += (base.z - camera.position.z) * follow;
    target.set(base.x * 0.5, base.y * 0.5, base.z - 6);
    camera.lookAt(target);
  });

  return null;
}
