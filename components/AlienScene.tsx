'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';

const ALIEN_COUNT = 18;

interface AlienCreatureProps {
  position: [number, number, number];
  speed: number;
  color: string;
}

function AlienCreature({ position, speed, color }: AlienCreatureProps) {
  const group = useRef<Group>(null);
  const baseY = position[1];

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime() * speed;
    group.current.position.y = baseY + Math.sin(t) * 0.3;
    group.current.rotation.z = Math.sin(t) * 0.08;
  });

  return (
    <group ref={group} position={position}>
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.4, 0.35, 0]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.4, 0.35, 0]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.16, 0.05, 0.42]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#1d1d1f" />
      </mesh>
      <mesh position={[0.16, 0.05, 0.42]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#1d1d1f" />
      </mesh>
    </group>
  );
}

interface AlienSceneProps {
  bgColor?: string;
  accentColor?: string;
}

export default function AlienScene({
  bgColor = '#2a1f3d',
  accentColor = '#7fc4e8',
}: AlienSceneProps) {
  const aliens = useMemo(
    () =>
      Array.from({ length: ALIEN_COUNT }, () => ({
        position: [
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6 - 2,
        ] as [number, number, number],
        speed: 0.4 + Math.random() * 0.6,
      })),
    []
  );

  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 1.5]}>
      <color attach="background" args={[bgColor]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[5, 5, 5]} intensity={1.2} />
      <Stars radius={50} depth={30} count={1500} factor={3} fade speed={0.5} />
      {aliens.map((alien, i) => (
        <AlienCreature key={i} position={alien.position} speed={alien.speed} color={accentColor} />
      ))}
    </Canvas>
  );
}
