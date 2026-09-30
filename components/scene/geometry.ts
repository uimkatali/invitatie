import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function createLeafGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -1);
  shape.bezierCurveTo(0.55, -0.6, 0.7, 0.3, 0, 1);
  shape.bezierCurveTo(-0.7, 0.3, -0.55, -0.6, 0, -1);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geometry.center();
  return geometry;
}

export function createSnowflakeGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const arm = new THREE.BoxGeometry(0.1, 1, 0.05).translate(0, 0.5, 0);
    const left = new THREE.BoxGeometry(0.07, 0.34, 0.05).rotateZ(Math.PI / 4).translate(-0.12, 0.62, 0);
    const right = new THREE.BoxGeometry(0.07, 0.34, 0.05).rotateZ(-Math.PI / 4).translate(0.12, 0.62, 0);
    for (const piece of [arm, left, right]) parts.push(piece.rotateZ(angle));
  }
  const merged = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error('Geometria fulgului nu a putut fi construita');
  merged.center();
  return merged;
}

export function createHeartGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0, -0.35, -0.6, -0.35, -0.6, 0);
  shape.bezierCurveTo(-0.6, 0.3, -0.3, 0.5, 0, 0.75);
  shape.bezierCurveTo(0.3, 0.5, 0.6, 0.3, 0.6, 0);
  shape.bezierCurveTo(0.6, -0.35, 0, -0.35, 0, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 3,
  });
  geometry.rotateZ(Math.PI);
  geometry.center();
  return geometry;
}
