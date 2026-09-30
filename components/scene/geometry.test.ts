import { describe, it, expect } from 'vitest';
import { createLeafGeometry, createSnowflakeGeometry, createHeartGeometry } from './geometry';

describe.each([
  ['leaf', createLeafGeometry],
  ['snowflake', createSnowflakeGeometry],
  ['heart', createHeartGeometry],
])('%s geometry', (_name, create) => {
  it('has vertices and fits in a unit-ish box around the origin', () => {
    const geometry = create();
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.max.x).toBeLessThanOrEqual(1.3);
    expect(box.min.x).toBeGreaterThanOrEqual(-1.3);
    expect(Math.abs(box.max.y + box.min.y)).toBeLessThan(0.3);
    geometry.dispose();
  });
});
