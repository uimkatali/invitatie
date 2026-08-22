'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { useRef } from 'react';
import { DoubleSide, type Group } from 'three';
import type { LocationId } from '../lib/selections';

// Small original mascots/motifs for each date-planning option — built from
// simple primitives in the same visual language as the site's main 3D scene
// (glassy/iridescent materials, rounded silhouettes), never a copy of any
// licensed character.

function Spin({ children, speed = 0.4 }: { children: React.ReactNode; speed?: number }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = clock.getElapsedTime() * speed;
    }
  });
  return <group ref={group}>{children}</group>;
}

function Glass({ color }: { color: string }) {
  return <meshPhysicalMaterial color={color} iridescence={1} iridescenceIOR={1.3} roughness={0.25} metalness={0.1} clearcoat={0.6} />;
}

function MountainIcon() {
  return (
    <Spin>
      <mesh position={[0, -0.15, 0]}>
        <coneGeometry args={[0.55, 0.9, 4]} />
        <Glass color="#8f6a5c" />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <coneGeometry args={[0.2, 0.3, 4]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
    </Spin>
  );
}

function SeaIcon() {
  return (
    <Spin speed={0.6}>
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[0.4, 0.14, 16, 32]} />
        <Glass color="#4fd1c5" />
      </mesh>
      <mesh position={[0.05, 0.35, 0.1]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <Glass color="#bfe3ff" />
      </mesh>
    </Spin>
  );
}

function RoadTripIcon() {
  return (
    <Spin speed={0.5}>
      <RoundedBox args={[0.8, 0.35, 0.4]} radius={0.12} smoothness={4} position={[0, -0.05, 0]}>
        <Glass color="#ff9a8b" />
      </RoundedBox>
      <mesh position={[-0.25, -0.28, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.08, 16]} />
        <meshStandardMaterial color="#241f30" roughness={0.6} />
      </mesh>
      <mesh position={[0.25, -0.28, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.08, 16]} />
        <meshStandardMaterial color="#241f30" roughness={0.6} />
      </mesh>
      <mesh position={[-0.25, -0.28, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.08, 16]} />
        <meshStandardMaterial color="#241f30" roughness={0.6} />
      </mesh>
      <mesh position={[0.25, -0.28, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.08, 16]} />
        <meshStandardMaterial color="#241f30" roughness={0.6} />
      </mesh>
    </Spin>
  );
}

function LandmarkIcon() {
  return (
    <Spin speed={0.35}>
      <RoundedBox args={[0.5, 0.6, 0.5]} radius={0.06} smoothness={4} position={[0, -0.1, 0]}>
        <Glass color="#e8b84b" />
      </RoundedBox>
      <mesh position={[0, 0.35, 0]}>
        <coneGeometry args={[0.4, 0.4, 4]} />
        <Glass color="#c05a4a" />
      </mesh>
    </Spin>
  );
}

function CozyHouseIcon({ warm }: { warm: boolean }) {
  return (
    <Spin speed={0.35}>
      <RoundedBox args={[0.55, 0.5, 0.5]} radius={0.08} smoothness={4} position={[0, -0.12, 0]}>
        <Glass color={warm ? '#e0864f' : '#c6a3e8'} />
      </RoundedBox>
      <mesh position={[0, 0.28, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.45, 0.35, 4]} />
        <Glass color={warm ? '#ff9ab0' : '#ffc4dd'} />
      </mesh>
    </Spin>
  );
}

function CompassIcon() {
  return (
    <Spin speed={0.5}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.06, 16, 32]} />
        <Glass color="#f4c95d" />
      </mesh>
      <mesh>
        <octahedronGeometry args={[0.28, 0]} />
        <Glass color="#ff8fab" />
      </mesh>
    </Spin>
  );
}

function SteeringWheelIcon() {
  return (
    <Spin speed={0.7}>
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[0.42, 0.09, 16, 32]} />
        <Glass color="#241f30" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
          <cylinderGeometry args={[0.05, 0.05, 0.42, 8]} />
          <meshStandardMaterial color="#d8c3ff" roughness={0.5} />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.14, 16, 16]} />
        <Glass color="#ff9ab0" />
      </mesh>
    </Spin>
  );
}

// A small, original pink elephant holding a chocolate square — not a copy of
// any branded mascot, just a cute rounded silhouette in the site's palette.
function ElephantIcon() {
  return (
    <Spin speed={0.4}>
      <mesh>
        <sphereGeometry args={[0.34, 20, 20]} />
        <Glass color="#ffc4dd" />
      </mesh>
      <mesh position={[0.3, 0.16, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <Glass color="#ffc4dd" />
      </mesh>
      <mesh position={[0.24, 0.36, 0.14]} rotation={[0, 0, -0.3]}>
        <circleGeometry args={[0.16, 16]} />
        <meshStandardMaterial color="#ffe0ef" side={DoubleSide} roughness={0.6} />
      </mesh>
      <mesh position={[0.24, 0.36, -0.14]} rotation={[0, 0, -0.3]}>
        <circleGeometry args={[0.16, 16]} />
        <meshStandardMaterial color="#ffe0ef" side={DoubleSide} roughness={0.6} />
      </mesh>
      <mesh position={[0.46, 0.05, 0]} rotation={[0, 0, -0.6]}>
        <cylinderGeometry args={[0.05, 0.06, 0.3, 8]} />
        <Glass color="#ffc4dd" />
      </mesh>
      <mesh position={[0.1, -0.24, 0.2]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.16, 0.12, 0.08]} />
        <meshStandardMaterial color="#7a4a2b" roughness={0.5} />
      </mesh>
    </Spin>
  );
}

const ICONS: Record<LocationId, () => React.ReactElement> = {
  munte: MountainIcon,
  mare: SeaIcon,
  'road-trip': RoadTripIcon,
  vizitat: LandmarkIcon,
  'acasa-parinti': () => <CozyHouseIcon warm />,
  explorat: CompassIcon,
  'scoala-soferi': SteeringWheelIcon,
  acasa: () => <CozyHouseIcon warm={false} />,
  'dupa-pofta-inimii': ElephantIcon,
};

interface OptionIconProps {
  kind: LocationId;
}

export default function OptionIcon({ kind }: OptionIconProps) {
  const Icon = ICONS[kind];
  return (
    <Canvas camera={{ position: [0, 0, 2.4], fov: 40 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.8} />
      <pointLight position={[2, 2, 2]} intensity={1.1} />
      <pointLight position={[-2, -1, 1]} intensity={0.4} color="#ffb6c9" />
      <Icon />
    </Canvas>
  );
}
