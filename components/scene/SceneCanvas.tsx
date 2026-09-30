'use client';

import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { SCENE_THEMES, TOTAL_PARTICLES, particleCounts } from '@/lib/scene/themes';
import ParticleField from './ParticleField';
import HeartBurst from './HeartBurst';
import GradientBackground from './GradientBackground';
import CameraRig from './CameraRig';
import { onPointerMove, trackScrollExtent } from './input';
import { useSceneState } from './useSceneState';

export default function SceneCanvas({ reduced }: { reduced: boolean }) {
  const { theme, mode } = useSceneState();
  const config = SCENE_THEMES[theme];
  const [isMobile] = useState(() => window.innerWidth < 768);
  const [visible, setVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    const stopTracking = trackScrollExtent();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      stopTracking();
    };
  }, []);

  // Cu composer, anti-aliasing-ul vine din multisampling; fara composer (mobil / reduced) il pastreaza canvas-ul.
  const useComposer = !reduced && !isMobile;
  const budget = reduced ? TOTAL_PARTICLES.reduced : isMobile ? TOTAL_PARTICLES.mobile : TOTAL_PARTICLES.desktop;
  const counts = particleCounts(config, budget);

  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={visible ? 'always' : 'never'}
      gl={{ antialias: !useComposer, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 8], fov: 55, near: 0.1, far: 60 }}
    >
      <GradientBackground top={config.sky.top} bottom={config.sky.bottom} />
      <fog attach="fog" args={[config.fog, 8, 36]} />
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#ffd6e7', '#cfe8ff', 0.8]} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} color="#fff0f6" />
      <CameraRig mode={mode} reduced={reduced} />
      {config.kinds.map((kind) => (
        <ParticleField
          key={`${theme}-${kind}-${counts[kind]}`}
          kind={kind}
          count={counts[kind]}
          palette={config.palette[kind]}
          seed={kind === 'leaf' ? 7 : 13}
          reduced={reduced}
        />
      ))}
      {!reduced && <HeartBurst />}
      {useComposer && (
        <EffectComposer multisampling={4}>
          <Bloom intensity={0.35} luminanceThreshold={0.95} mipmapBlur />
        </EffectComposer>
      )}
    </Canvas>
  );
}
