import type { ThemeId } from '@/lib/domain';

/** Gradientul de fundal. In Faza 4 canvas-ul 3D se aseaza peste el. */
export default function SkyBackground({ theme }: { theme: ThemeId }) {
  return <div className="sky" data-theme={theme} aria-hidden="true" />;
}
