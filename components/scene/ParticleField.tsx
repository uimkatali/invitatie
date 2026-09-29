'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '@/lib/scene/random';
import {
  WORLD_BOUNDS,
  HEART_Z,
  burstStrength,
  createParticles,
  heartPoint,
  revealMix,
  stepParticle,
  type StepInput,
} from '@/lib/scene/particles';
import { nowSeconds, sceneStore } from '@/lib/scene/store';
import type { ParticleKind } from '@/lib/scene/themes';
import { createLeafGeometry, createSnowflakeGeometry } from './geometry';
import { pointer } from './input';

interface ParticleFieldProps {
  kind: ParticleKind;
  count: number;
  palette: string[];
  seed: number;
  reduced: boolean;
}

export default function ParticleField({ kind, count, palette, seed, reduced }: ParticleFieldProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => (kind === 'leaf' ? createLeafGeometry() : createSnowflakeGeometry()), [kind]);
  const random = useMemo(() => mulberry32(seed), [seed]);
  const particles = useMemo(() => createParticles(count, kind, WORLD_BOUNDS, random), [count, kind, random]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const input = useMemo<StepInput>(() => ({ dt: 0, time: 0, wind: 0, speed: 1, swirl: 0, burst: 0 }), []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const color = new THREE.Color();
    particles.forEach((p, i) => {
      color.set(palette[p.colorIndex % palette.length]);
      instanced.setColorAt(i, color);
    });
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, [particles, palette]);

  useFrame((_, delta) => {
    const instanced = mesh.current;
    if (!instanced) return;
    const scene = sceneStore.get();
    const now = nowSeconds();
    const reveal = reduced || scene.revealAt === null ? 0 : revealMix(now - scene.revealAt);
    const burst = reduced || scene.burstAt === null ? 0 : burstStrength(now - scene.burstAt);

    input.dt = Math.min(delta, 0.05);
    input.time = now;
    input.wind = reduced ? 0 : pointer.wind;
    input.speed = (reduced ? 0.3 : 1) * (scene.settle ? 0.35 : 1);
    input.swirl = scene.swirl && !reduced ? 1 : 0;
    input.burst = burst;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      stepParticle(p, input, WORLD_BOUNDS, random);
      let { x, y, z } = p;
      if (reveal > 0) {
        const target = heartPoint((i / particles.length) * Math.PI * 2);
        x += (target.x - x) * reveal;
        y += (target.y - y) * reveal;
        z += (HEART_Z - z) * reveal;
      }
      dummy.position.set(x, y, z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
  });

  const isSnow = kind === 'snowflake';
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshPhysicalMaterial
        color="#ffffff"
        roughness={0.45}
        sheen={1}
        sheenColor="#ffffff"
        iridescence={0.6}
        iridescenceIOR={1.3}
        emissive={isSnow ? '#ffffff' : '#000000'}
        emissiveIntensity={isSnow ? 0.25 : 0}
        transparent
        opacity={isSnow ? 0.9 : 0.95}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}
