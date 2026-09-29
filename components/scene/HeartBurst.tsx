'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32, range } from '@/lib/scene/random';
import { BURST_DURATION_S, HEART_Z } from '@/lib/scene/particles';
import { nowSeconds, sceneStore } from '@/lib/scene/store';
import { createHeartGeometry } from './geometry';

const COUNT = 40;

export default function HeartBurst() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useRef<THREE.MeshPhysicalMaterial>(null);
  const geometry = useMemo(() => createHeartGeometry(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const directions = useMemo(() => {
    const random = mulberry32(21);
    return Array.from({ length: COUNT }, () => {
      const angle = range(random, 0, Math.PI * 2);
      return { x: Math.cos(angle), y: Math.sin(angle), speed: range(random, 3, 7), spin: range(random, -4, 4) };
    });
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const instanced = mesh.current;
    if (!instanced || !material.current) return;
    const { burstAt } = sceneStore.get();
    const elapsed = burstAt === null ? Infinity : nowSeconds() - burstAt;
    const active = elapsed >= 0 && elapsed <= BURST_DURATION_S;
    instanced.visible = active;
    if (!active) return;

    const progress = elapsed / BURST_DURATION_S;
    material.current.opacity = 1 - progress;
    directions.forEach((d, i) => {
      const distance = d.speed * elapsed;
      dummy.position.set(d.x * distance, d.y * distance + progress * 1.5, HEART_Z);
      dummy.rotation.set(0, 0, d.spin * elapsed);
      dummy.scale.setScalar(0.35 * (1 - progress * 0.6));
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, COUNT]} frustumCulled={false} visible={false}>
      <meshPhysicalMaterial ref={material} color="#FFAFCC" roughness={0.3} clearcoat={0.8} transparent />
    </instancedMesh>
  );
}
