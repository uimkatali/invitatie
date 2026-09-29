export const CAMERA_START_Z = 8;
export const CAMERA_TRAVEL = 34;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Pozitia camerei in modul experienta, dupa progresul scroll-ului (0..1). */
export function cameraOnPath(progress: number): { x: number; y: number; z: number } {
  const t = clamp01(progress);
  return {
    x: Math.sin(t * Math.PI * 2) * 1.2,
    y: Math.cos(t * Math.PI * 1.5) * 0.6 - 0.6,
    z: CAMERA_START_Z - t * CAMERA_TRAVEL,
  };
}
