'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useMemo, useRef, useEffect, useState } from 'react';
import type { Group } from 'three';
import * as THREE from 'three';
import type { ResolvedTheme, ParticleShape, MotionPattern, MaterialKind } from '../lib/themes';

// ---------- Geometry helpers ----------

function heartShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const x = 0;
  const y = 0;
  shape.moveTo(x, y);
  shape.bezierCurveTo(x, y - 0.35, x - 0.6, y - 0.35, x - 0.6, y);
  shape.bezierCurveTo(x - 0.6, y + 0.3, x - 0.3, y + 0.5, x, y + 0.75);
  shape.bezierCurveTo(x + 0.3, y + 0.5, x + 0.6, y + 0.3, x + 0.6, y);
  shape.bezierCurveTo(x + 0.6, y - 0.35, x, y - 0.35, x, y);
  return shape;
}

function starShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const spikes = 5;
  const outerR = 0.5;
  const innerR = 0.22;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  }
  shape.closePath();
  return shape;
}

const extrudeSettings = { depth: 0.14, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 };

// ---------- Material ----------

function ParticleMaterial({ material, color }: { material: MaterialKind; color: string }) {
  if (material === 'glass') {
    return (
      <MeshTransmissionMaterial
        color={color}
        thickness={0.5}
        roughness={0.05}
        transmission={1}
        ior={1.3}
        chromaticAberration={0.04}
        anisotropy={0.2}
        distortion={0.15}
        distortionScale={0.2}
        temporalDistortion={0.1}
        backside
      />
    );
  }
  return (
    <meshPhysicalMaterial
      color={color}
      iridescence={1}
      iridescenceIOR={1.3}
      iridescenceThicknessRange={[100, 400]}
      roughness={0.25}
      metalness={0.1}
      clearcoat={0.6}
    />
  );
}

// ---------- Shapes ----------

interface ShapeProps {
  color: string;
  secondaryColor: string;
}

function AlienCreatureShape({ color }: ShapeProps) {
  return (
    <>
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshPhysicalMaterial color={color} iridescence={1} iridescenceIOR={1.3} roughness={0.3} clearcoat={0.5} />
      </mesh>
      <mesh position={[-0.4, 0.35, 0]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshPhysicalMaterial color={color} iridescence={1} iridescenceIOR={1.3} roughness={0.3} clearcoat={0.5} />
      </mesh>
      <mesh position={[0.4, 0.35, 0]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshPhysicalMaterial color={color} iridescence={1} iridescenceIOR={1.3} roughness={0.3} clearcoat={0.5} />
      </mesh>
      <mesh position={[-0.16, 0.05, 0.42]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#1d1d1f" />
      </mesh>
      <mesh position={[0.16, 0.05, 0.42]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#1d1d1f" />
      </mesh>
    </>
  );
}

function ShapeGeometry({ shape, material, color, secondaryColor }: ShapeProps & { shape: ParticleShape; material: MaterialKind }) {
  switch (shape) {
    case 'alienCreature':
      return <AlienCreatureShape color={color} secondaryColor={secondaryColor} />;
    case 'crystal':
      return (
        <mesh>
          <icosahedronGeometry args={[0.45, 0]} />
          <ParticleMaterial material={material} color={color} />
        </mesh>
      );
    case 'ribbon':
      return (
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[1.1, 0.22]} />
          <ParticleMaterial material={material} color={color} />
        </mesh>
      );
    case 'ring':
      return (
        <mesh rotation={[Math.PI / 2.2, 0, 0]}>
          <torusGeometry args={[0.45, 0.11, 16, 32]} />
          <ParticleMaterial material={material} color={color} />
        </mesh>
      );
    case 'blob':
      return (
        <group>
          <mesh>
            <sphereGeometry args={[0.4, 20, 20]} />
            <ParticleMaterial material={material} color={color} />
          </mesh>
          <mesh position={[0.28, 0.14, 0.1]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <ParticleMaterial material={material} color={secondaryColor} />
          </mesh>
          <mesh position={[-0.24, -0.16, -0.08]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <ParticleMaterial material={material} color={color} />
          </mesh>
        </group>
      );
    case 'heart':
      return (
        <mesh scale={0.7}>
          <extrudeGeometry args={[heartShape(), extrudeSettings]} />
          <ParticleMaterial material={material} color={color} />
        </mesh>
      );
    case 'star':
      return (
        <mesh scale={0.9}>
          <extrudeGeometry args={[starShape(), extrudeSettings]} />
          <ParticleMaterial material={material} color={color} />
        </mesh>
      );
    default:
      return null;
  }
}

// ---------- Motion ----------

interface ParticleInstance {
  position: [number, number, number];
  speed: number;
  phase: number;
  radius: number;
}

function Particle({
  instance,
  shape,
  material,
  motion,
  color,
  secondaryColor,
}: {
  instance: ParticleInstance;
  shape: ParticleShape;
  material: MaterialKind;
  motion: MotionPattern;
  color: string;
  secondaryColor: string;
}) {
  const group = useRef<Group>(null);
  const base = instance.position;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime() * instance.speed + instance.phase;

    switch (motion) {
      case 'driftParallax':
        group.current.position.set(base[0], base[1] + Math.sin(t) * 0.3, base[2]);
        group.current.rotation.z = Math.sin(t) * 0.08;
        group.current.rotation.y = t * 0.15;
        break;
      case 'orbit': {
        const r = instance.radius;
        group.current.position.set(Math.cos(t) * r, base[1] + Math.sin(t * 0.6) * 0.2, Math.sin(t) * r);
        group.current.rotation.y = t;
        break;
      }
      case 'fall': {
        const span = 7;
        const y = ((base[1] - t * instance.speed * 0.6) % span + span) % span - span / 2;
        group.current.position.set(base[0] + Math.sin(t * 0.5) * 0.4, y, base[2]);
        group.current.rotation.x = t * 0.3;
        group.current.rotation.z = t * 0.2;
        break;
      }
      case 'swirl': {
        const r = instance.radius;
        const swirlT = t * 0.5;
        group.current.position.set(Math.cos(swirlT) * r, base[1] + Math.sin(swirlT * 1.3) * 0.6, Math.sin(swirlT) * r);
        group.current.rotation.z = swirlT;
        group.current.rotation.x = swirlT * 0.4;
        break;
      }
    }
  });

  return (
    <group ref={group} position={base}>
      <ShapeGeometry shape={shape} material={material} color={color} secondaryColor={secondaryColor} />
    </group>
  );
}

function Particles({ theme }: { theme: ResolvedTheme }) {
  const instances = useMemo<ParticleInstance[]>(
    () =>
      Array.from({ length: theme.count }, () => ({
        position: [
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6 - 2,
        ] as [number, number, number],
        speed: 0.35 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        radius: 1.5 + Math.random() * 2.5,
      })),
    [theme.count]
  );

  return (
    <>
      {instances.map((instance, i) => (
        <Particle
          key={i}
          instance={instance}
          shape={theme.particleShape}
          material={theme.material}
          motion={theme.motionPattern}
          color={theme.colors.accentPrimary}
          secondaryColor={theme.colors.accentSecondary}
        />
      ))}
    </>
  );
}

// ---------- Parallax (pointer / device-tilt) ----------

function Parallax() {
  const { camera } = useThree();
  const target = useRef({ x: 0, y: 0 });
  const basePosition = useRef({ x: camera.position.x, y: camera.position.y, z: camera.position.z });

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = (event.clientY / window.innerHeight) * 2 - 1;
      target.current = { x: nx, y: ny };
    }

    function handleOrientation(event: DeviceOrientationEvent) {
      if (event.gamma === null || event.beta === null) return;
      const nx = THREE.MathUtils.clamp(event.gamma / 30, -1, 1);
      const ny = THREE.MathUtils.clamp((event.beta - 45) / 30, -1, 1);
      target.current = { x: nx, y: ny };
    }

    window.addEventListener('pointermove', handlePointerMove);

    let orientationAttached = false;
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      try {
        window.addEventListener('deviceorientation', handleOrientation);
        orientationAttached = true;
      } catch {
        // Device orientation unavailable — silently fall back to pointer-only parallax.
      }
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (orientationAttached) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  useFrame(() => {
    const b = basePosition.current;
    const desiredX = b.x + target.current.x * 0.6;
    const desiredY = b.y - target.current.y * 0.4;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, desiredX, 0.04);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, desiredY, 0.04);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ---------- Scene root ----------

interface ParticleSceneProps {
  theme: ResolvedTheme;
}

export default function ParticleScene({ theme }: ParticleSceneProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 1.5]}>
      <color attach="background" args={[theme.colors.bgDark]} />
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={1.2} />
      <pointLight position={[-5, -3, 2]} intensity={0.5} color={theme.colors.accentSecondary} />
      {theme.starfield && <Stars radius={50} depth={30} count={1500} factor={3} fade speed={0.5} />}
      <Particles theme={theme} />
      {mounted && <Parallax />}
      {theme.postProcessing.bloom && theme.postProcessing.vignette && (
        <EffectComposer>
          <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} intensity={0.6} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.6} />
        </EffectComposer>
      )}
      {theme.postProcessing.bloom && !theme.postProcessing.vignette && (
        <EffectComposer>
          <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} intensity={0.6} mipmapBlur />
        </EffectComposer>
      )}
      {!theme.postProcessing.bloom && theme.postProcessing.vignette && (
        <EffectComposer>
          <Vignette eskil={false} offset={0.2} darkness={0.6} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
