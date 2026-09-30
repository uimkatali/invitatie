import { describe, it, expect } from 'vitest';
import { cameraOnPath, CAMERA_START_Z, CAMERA_TRAVEL } from './camera';

describe('cameraOnPath', () => {
  it('starts at the ambient position and travels forward', () => {
    expect(cameraOnPath(0)).toEqual({ x: 0, y: 0, z: CAMERA_START_Z });
    expect(cameraOnPath(1).z).toBeCloseTo(CAMERA_START_Z - CAMERA_TRAVEL);
    expect(cameraOnPath(0.5).z).toBeLessThan(cameraOnPath(0.25).z);
  });

  it('clamps progress outside [0, 1]', () => {
    expect(cameraOnPath(-3)).toEqual(cameraOnPath(0));
    expect(cameraOnPath(7)).toEqual(cameraOnPath(1));
  });
});
