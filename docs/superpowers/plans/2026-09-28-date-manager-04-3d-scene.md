# Faza 4: Scena 3D - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fundal 3D cu frunze si fulgi pastel (roz -> baby blue) pe toate paginile si experienta scroll-driven la deschiderea unei invitatii primite: reveal cu inima, camera care calatoreste prin particule, rafala la "Da".

**Architecture:** Un singur `<Canvas>` persistent (in layout-uri), montat prin `next/dynamic` fara SSR. Starea scenei (tema, mod, efecte) sta intr-un store mic, fara React, citit in `useFrame`; paginile il controleaza prin `<SceneController>` sau `<InvitationExperience>`. Toata matematica (particule, inima, rafala, camera) e in functii pure din `lib/scene/`, testate. Experienta foloseste scroll-ul nativ al paginii: sectiunile HTML sunt normale, canvas-ul e fix in spate si citeste progresul scroll-ului.

**Tech Stack:** three, @react-three/fiber, @react-three/postprocessing, IntersectionObserver, Vitest.

**Prerequisite:** Fazele 1-3 terminate. Spec sectiunea 9. Abaterea 4 din `2026-09-28-date-manager-00-overview.md`.

---

## File map (Faza 4)

| Fisier | Responsabilitate |
|---|---|
| `lib/scene/themes.ts` | configuratia vizuala per tema + buget de particule |
| `lib/scene/random.ts` | PRNG determinist |
| `lib/scene/particles.ts` | creare / pas de simulare, inima, reveal, rafala |
| `lib/scene/camera.ts` | traseul camerei in modul experienta |
| `lib/scene/store.ts` | store-ul scenei |
| `components/scene/geometry.ts` | geometriile frunza / fulg / inima |
| `components/scene/input.ts` | pointer, vant, progres scroll (DOM) |
| `components/scene/useSceneState.ts` | hook React peste store |
| `components/scene/ParticleField.tsx` | un `InstancedMesh` animat |
| `components/scene/HeartBurst.tsx` | inimile de la "Da" |
| `components/scene/GradientBackground.tsx` | cerul in scena |
| `components/scene/CameraRig.tsx` | parallax + traseu |
| `components/scene/SceneCanvas.tsx` | canvas, lumini, fog, bloom |
| `components/scene/SceneRoot.tsx` | detectie WebGL / reduced motion, fallback CSS |
| `components/scene/SceneController.tsx` | seteaza tema / modul dintr-o pagina |
| `components/scene/InvitationExperience.tsx` | sectiunile scroll-driven |
| `components/SkyBackground.tsx` | sters (inlocuit de `SceneRoot`) |

---

### Task 1: Teme, PRNG si store

**Files:**
- Create: `lib/scene/themes.ts`, `lib/scene/random.ts`, `lib/scene/store.ts`
- Test: `lib/scene/themes.test.ts`, `lib/scene/random.test.ts`, `lib/scene/store.test.ts`

- [ ] **Step 1: Scrie testele**

`lib/scene/themes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SCENE_THEMES, particleCounts, TOTAL_PARTICLES } from './themes';
import { THEMES } from '../domain';

describe('SCENE_THEMES', () => {
  it('configures every theme with a palette for each of its kinds', () => {
    for (const id of THEMES) {
      const theme = SCENE_THEMES[id];
      expect(theme.kinds.length).toBeGreaterThan(0);
      for (const kind of theme.kinds) expect(theme.palette[kind].length).toBeGreaterThan(0);
    }
  });

  it('uses only leaves for toamna and only snowflakes for iarna', () => {
    expect(SCENE_THEMES.toamna.kinds).toEqual(['leaf']);
    expect(SCENE_THEMES.iarna.kinds).toEqual(['snowflake']);
    expect(SCENE_THEMES.amandoua.kinds).toEqual(['leaf', 'snowflake']);
  });
});

describe('particleCounts', () => {
  it('splits the budget exactly across the theme kinds', () => {
    const counts = particleCounts(SCENE_THEMES.amandoua, TOTAL_PARTICLES.desktop);
    expect(counts.leaf + counts.snowflake).toBe(TOTAL_PARTICLES.desktop);
    expect(particleCounts(SCENE_THEMES.iarna, 81)).toEqual({ leaf: 0, snowflake: 81 });
  });
});
```

`lib/scene/random.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mulberry32, range } from './random';

describe('mulberry32', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('range maps into [min, max)', () => {
    const r = mulberry32(1);
    for (let i = 0; i < 50; i++) {
      const v = range(r, 2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThan(5);
    }
  });
});
```

`lib/scene/store.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sceneStore, triggerBurst, DEFAULT_SCENE_STATE } from './store';

describe('sceneStore', () => {
  beforeEach(() => sceneStore.reset());

  it('merges patches and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = sceneStore.subscribe(listener);
    sceneStore.set({ theme: 'iarna', mode: 'experience' });
    expect(sceneStore.get()).toMatchObject({ theme: 'iarna', mode: 'experience' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    sceneStore.set({ swirl: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('reset restores defaults but keeps a running burst', () => {
    sceneStore.set({ theme: 'toamna', swirl: true });
    triggerBurst(12.5);
    sceneStore.reset();
    expect(sceneStore.get()).toEqual({ ...DEFAULT_SCENE_STATE, burstAt: 12.5 });
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/scene`
Expected: FAIL.

- [ ] **Step 3: Implementeaza**

`lib/scene/themes.ts`:

```ts
import type { ThemeId } from '../domain';

export type ParticleKind = 'leaf' | 'snowflake';

export interface SceneTheme {
  id: ThemeId;
  kinds: ParticleKind[];
  palette: Record<ParticleKind, string[]>;
  sky: { top: string; bottom: string };
  fog: string;
}

export const SCENE_THEMES: Record<ThemeId, SceneTheme> = {
  toamna: {
    id: 'toamna',
    kinds: ['leaf'],
    palette: { leaf: ['#FFAFCC', '#FFC8DD', '#FFD6C2', '#F9A8C0', '#FFE0EC'], snowflake: [] },
    sky: { top: '#FFC8DD', bottom: '#FFF8FB' },
    fog: '#FFE3EE',
  },
  iarna: {
    id: 'iarna',
    kinds: ['snowflake'],
    palette: { leaf: [], snowflake: ['#FFFFFF', '#E3F1FF', '#BDE0FE', '#A2D2FF'] },
    sky: { top: '#A2D2FF', bottom: '#FFFFFF' },
    fog: '#E3F1FF',
  },
  amandoua: {
    id: 'amandoua',
    kinds: ['leaf', 'snowflake'],
    palette: { leaf: ['#FFAFCC', '#FFC8DD', '#FFD6C2'], snowflake: ['#FFFFFF', '#BDE0FE', '#A2D2FF'] },
    sky: { top: '#FFC8DD', bottom: '#BDE0FE' },
    fog: '#EAD9F2',
  },
};

export const TOTAL_PARTICLES = { desktop: 220, mobile: 80, reduced: 12 } as const;

export function particleCounts(theme: SceneTheme, budget: number): Record<ParticleKind, number> {
  const counts: Record<ParticleKind, number> = { leaf: 0, snowflake: 0 };
  const share = Math.floor(budget / theme.kinds.length);
  theme.kinds.forEach((kind, index) => {
    counts[kind] = index === 0 ? budget - share * (theme.kinds.length - 1) : share;
  });
  return counts;
}
```

`lib/scene/random.ts`:

```ts
export type Random = () => number;

/** PRNG mic si determinist: aceeasi scena la fiecare incarcare, teste reproductibile. */
export function mulberry32(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(random: Random, min: number, max: number): number {
  return min + random() * (max - min);
}
```

`lib/scene/store.ts`:

```ts
import type { ThemeId } from '../domain';

export type SceneMode = 'ambient' | 'experience';

export interface SceneState {
  theme: ThemeId;
  mode: SceneMode;
  /** Particulele se rotesc in jurul axei camerei (sectiunea "Unde"). */
  swirl: boolean;
  /** Particulele incetinesc (sectiunea de raspuns). */
  settle: boolean;
  /** Momentul (secunde, performance.now) cand a pornit reveal-ul cu inima. */
  revealAt: number | null;
  /** Momentul rafalei de la "Da". */
  burstAt: number | null;
}

export const DEFAULT_SCENE_STATE: SceneState = {
  theme: 'amandoua',
  mode: 'ambient',
  swirl: false,
  settle: false,
  revealAt: null,
  burstAt: null,
};

let state: SceneState = DEFAULT_SCENE_STATE;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const sceneStore = {
  get(): SceneState {
    return state;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  set(patch: Partial<SceneState>): void {
    state = { ...state, ...patch };
    emit();
  },
  /** Revine la ambient; rafala in curs continua (pagina se schimba chiar dupa "Da"). */
  reset(): void {
    state = { ...DEFAULT_SCENE_STATE, burstAt: state.burstAt };
    emit();
  },
};

export function nowSeconds(): number {
  return performance.now() / 1000;
}

export function triggerBurst(at: number = nowSeconds()): void {
  sceneStore.set({ burstAt: at });
}
```

- [ ] **Step 4: Ruleaza testele**

Run: `npx vitest run lib/scene`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/scene
git commit -m "feat: add scene themes, deterministic random and scene store"
```

---

### Task 2: Simulare particule si traseul camerei

**Files:**
- Create: `lib/scene/particles.ts`, `lib/scene/camera.ts`
- Test: `lib/scene/particles.test.ts`, `lib/scene/camera.test.ts`

- [ ] **Step 1: Scrie testele**

`lib/scene/particles.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mulberry32 } from './random';
import {
  WORLD_BOUNDS,
  createParticles,
  stepParticle,
  heartPoint,
  revealMix,
  burstStrength,
  REVEAL_TITLE_DELAY_S,
  type StepInput,
} from './particles';

const calm: StepInput = { dt: 1 / 60, time: 0, wind: 0, speed: 1, swirl: 0, burst: 0 };

describe('createParticles', () => {
  it('creates deterministic particles inside the world', () => {
    const a = createParticles(50, 'leaf', WORLD_BOUNDS, mulberry32(3));
    const b = createParticles(50, 'leaf', WORLD_BOUNDS, mulberry32(3));
    expect(a).toEqual(b);
    for (const p of a) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(WORLD_BOUNDS.x);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(WORLD_BOUNDS.y);
      expect(p.z).toBeLessThanOrEqual(WORLD_BOUNDS.zNear);
      expect(p.z).toBeGreaterThanOrEqual(WORLD_BOUNDS.zFar);
    }
  });

  it('makes leaves fall faster than snowflakes on average', () => {
    const avg = (kind: 'leaf' | 'snowflake') => {
      const list = createParticles(200, kind, WORLD_BOUNDS, mulberry32(9));
      return list.reduce((s, p) => s + p.fall, 0) / list.length;
    };
    expect(avg('leaf')).toBeGreaterThan(avg('snowflake'));
  });
});

describe('stepParticle', () => {
  it('moves particles down', () => {
    const random = mulberry32(5);
    const [p] = createParticles(1, 'snowflake', WORLD_BOUNDS, random);
    const y = p.y;
    stepParticle(p, calm, WORLD_BOUNDS, random);
    expect(p.y).toBeLessThan(y);
  });

  it('wraps particles that fall below the world back to the top', () => {
    const random = mulberry32(5);
    const [p] = createParticles(1, 'leaf', WORLD_BOUNDS, random);
    p.y = -WORLD_BOUNDS.y - 0.01;
    stepParticle(p, calm, WORLD_BOUNDS, random);
    expect(p.y).toBe(WORLD_BOUNDS.y);
  });

  it('pushes particles away from the center during a burst', () => {
    const random = mulberry32(5);
    const [p] = createParticles(1, 'leaf', WORLD_BOUNDS, random);
    p.x = 1;
    p.y = 0;
    p.fall = 0;
    p.swayAmp = 0;
    stepParticle(p, { ...calm, burst: 1 }, WORLD_BOUNDS, random);
    expect(p.x).toBeGreaterThan(1);
  });

  it('does not move when speed is zero', () => {
    const random = mulberry32(5);
    const [p] = createParticles(1, 'leaf', WORLD_BOUNDS, random);
    const before = { ...p };
    stepParticle(p, { ...calm, speed: 0 }, WORLD_BOUNDS, random);
    expect(p.x).toBe(before.x);
    expect(p.y).toBe(before.y);
  });
});

describe('heartPoint', () => {
  it('is symmetric around the vertical axis', () => {
    const a = heartPoint(1);
    const b = heartPoint(-1);
    expect(a.x).toBeCloseTo(-b.x);
    expect(a.y).toBeCloseTo(b.y);
  });
});

describe('revealMix', () => {
  it('rises to 1, holds, then releases before the title appears', () => {
    expect(revealMix(-1)).toBe(0);
    expect(revealMix(0)).toBe(0);
    expect(revealMix(1)).toBeCloseTo(0.5);
    expect(revealMix(2.4)).toBe(1);
    expect(revealMix(REVEAL_TITLE_DELAY_S + 1)).toBe(0);
  });
});

describe('burstStrength', () => {
  it('decays from 1 to 0', () => {
    expect(burstStrength(0)).toBe(1);
    expect(burstStrength(0.8)).toBeCloseTo(0.5);
    expect(burstStrength(2)).toBe(0);
    expect(burstStrength(-0.1)).toBe(0);
  });
});
```

`lib/scene/camera.test.ts`:

```ts
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
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/scene`
Expected: FAIL (module noi inexistente).

- [ ] **Step 3: Implementeaza**

`lib/scene/particles.ts`:

```ts
import type { ParticleKind } from './themes';
import { range, type Random } from './random';

export interface Bounds {
  x: number;
  y: number;
  zNear: number;
  zFar: number;
}

/** Volumul prin care cad particulele; camera experientei calatoreste de la z=8 la z=-26. */
export const WORLD_BOUNDS: Bounds = { x: 10, y: 7, zNear: 5, zFar: -40 };

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  fall: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  scale: number;
  colorIndex: number;
}

const PROFILES: Record<ParticleKind, { fall: [number, number]; sway: [number, number]; freq: [number, number]; scale: [number, number]; spin: number }> = {
  leaf: { fall: [0.35, 0.65], sway: [0.5, 1.0], freq: [0.6, 1.2], scale: [0.28, 0.45], spin: 1.4 },
  snowflake: { fall: [0.12, 0.28], sway: [0.15, 0.35], freq: [0.3, 0.6], scale: [0.12, 0.22], spin: 0.5 },
};

export function createParticles(count: number, kind: ParticleKind, bounds: Bounds, random: Random): Particle[] {
  const profile = PROFILES[kind];
  return Array.from({ length: count }, () => ({
    kind,
    x: range(random, -bounds.x, bounds.x),
    y: range(random, -bounds.y, bounds.y),
    z: range(random, bounds.zFar, bounds.zNear),
    rx: range(random, 0, Math.PI * 2),
    ry: range(random, 0, Math.PI * 2),
    rz: range(random, 0, Math.PI * 2),
    spinX: range(random, -profile.spin, profile.spin),
    spinY: range(random, -profile.spin, profile.spin),
    spinZ: range(random, -profile.spin, profile.spin),
    fall: range(random, ...profile.fall),
    swayAmp: range(random, ...profile.sway),
    swayFreq: range(random, ...profile.freq),
    phase: range(random, 0, Math.PI * 2),
    scale: range(random, ...profile.scale),
    colorIndex: Math.floor(random() * 1000),
  }));
}

export interface StepInput {
  dt: number;
  time: number;
  /** Vant orizontal din miscarea mouse-ului, aprox. [-1.5, 1.5]. */
  wind: number;
  /** Multiplicator global de viteza (reduced motion, settle). */
  speed: number;
  /** 0..1, rotatie in jurul axei camerei. */
  swirl: number;
  /** 0..1, impingere radiala (rafala). */
  burst: number;
}

/** Un pas de simulare, pe loc (fara alocari: ruleaza pentru sute de particule la 60 fps). */
export function stepParticle(p: Particle, input: StepInput, bounds: Bounds, random: Random): void {
  const { dt, time, wind, speed, swirl, burst } = input;
  const step = dt * speed;

  p.y -= p.fall * step;
  p.x += (Math.sin(time * p.swayFreq + p.phase) * p.swayAmp * 0.6 + wind) * step;

  if (swirl > 0) {
    const angle = swirl * 0.8 * step;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = p.x * cos - p.y * sin;
    p.y = p.x * sin + p.y * cos;
    p.x = x;
  }

  if (burst > 0) {
    const length = Math.hypot(p.x, p.y) || 1;
    p.x += (p.x / length) * burst * 6 * dt;
    p.y += (p.y / length) * burst * 6 * dt;
  }

  p.rx += p.spinX * step;
  p.ry += p.spinY * step;
  p.rz += p.spinZ * step;

  if (p.y < -bounds.y) {
    p.y = bounds.y;
    p.x = range(random, -bounds.x, bounds.x);
  } else if (p.y > bounds.y + 2) {
    p.y = -bounds.y;
  }
  if (p.x > bounds.x + 1) p.x = -bounds.x;
  else if (p.x < -bounds.x - 1) p.x = bounds.x;
}

export const HEART_Z = 2;

/** Curba clasica a inimii, scalata la cateva unitati. */
export function heartPoint(t: number, scale = 0.16): { x: number; y: number } {
  const x = 16 * Math.sin(t) ** 3;
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x: x * scale, y: y * scale + 0.4 };
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export const REVEAL_TITLE_DELAY_S = 2.9;

/** Cat de mult sunt trase particulele in forma de inima, la `elapsed` secunde de la deschidere. */
export function revealMix(elapsed: number): number {
  if (elapsed <= 0) return 0;
  if (elapsed < 2) return easeInOut(elapsed / 2);
  if (elapsed < 2.6) return 1;
  if (elapsed < 3.4) return 1 - easeInOut((elapsed - 2.6) / 0.8);
  return 0;
}

export const BURST_DURATION_S = 1.6;

export function burstStrength(elapsed: number): number {
  if (elapsed < 0 || elapsed > BURST_DURATION_S) return 0;
  return 1 - elapsed / BURST_DURATION_S;
}
```

`lib/scene/camera.ts`:

```ts
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
```

- [ ] **Step 4: Ruleaza testele**

Run: `npx vitest run lib/scene`
Expected: PASS. (La `cameraOnPath(0)`, `x` poate iesi `0` sau `-0`; daca `toEqual` pica din cauza `-0`, inlocuieste in implementare `Math.sin(t * Math.PI * 2) * 1.2` cu `(Math.sin(t * Math.PI * 2) * 1.2) + 0`.)

- [ ] **Step 5: Commit**

```bash
git add lib/scene
git commit -m "feat: add particle simulation, heart reveal, burst and camera path"
```

---

### Task 3: Geometrii

**Files:**
- Create: `components/scene/geometry.ts`
- Test: `components/scene/geometry.test.ts`

- [ ] **Step 1: Scrie testul**

```ts
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
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run components/scene/geometry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementeaza `components/scene/geometry.ts`**

```ts
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
```

- [ ] **Step 4: Ruleaza testul**

Run: `npx vitest run components/scene/geometry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/scene/geometry.ts components/scene/geometry.test.ts
git commit -m "feat: add leaf, snowflake and heart geometries"
```

---

### Task 4: Componentele scenei

**Files:**
- Create: `components/scene/input.ts`, `components/scene/useSceneState.ts`, `components/scene/ParticleField.tsx`, `components/scene/HeartBurst.tsx`, `components/scene/GradientBackground.tsx`, `components/scene/CameraRig.tsx`, `components/scene/SceneCanvas.tsx`, `components/scene/SceneRoot.tsx`, `components/scene/SceneController.tsx`

- [ ] **Step 1: Scrie `components/scene/input.ts`**

```ts
/** Starea mutabila a input-ului, citita in useFrame (fara re-randari React). */
export const pointer = { x: 0, y: 0, wind: 0 };

let lastX = 0;
let lastTime = 0;

export function onPointerMove(event: PointerEvent): void {
  const x = (event.clientX / window.innerWidth) * 2 - 1;
  const y = -((event.clientY / window.innerHeight) * 2 - 1);
  const now = performance.now();
  const dt = Math.max(16, now - lastTime) / 1000;
  const velocity = (x - lastX) / dt;
  pointer.wind = Math.max(-1.5, Math.min(1.5, pointer.wind + velocity * 0.15));
  pointer.x = x;
  pointer.y = y;
  lastX = x;
  lastTime = now;
}

/** Vantul se stinge treptat cand mouse-ul sta. */
export function decayWind(dt: number): void {
  pointer.wind *= Math.exp(-dt * 1.5);
}

export function readScrollProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / max));
}
```

- [ ] **Step 2: Scrie `components/scene/useSceneState.ts`**

```ts
'use client';

import { useSyncExternalStore } from 'react';
import { DEFAULT_SCENE_STATE, sceneStore, type SceneState } from '@/lib/scene/store';

export function useSceneState(): SceneState {
  return useSyncExternalStore(sceneStore.subscribe, sceneStore.get, () => DEFAULT_SCENE_STATE);
}
```

- [ ] **Step 3: Scrie `components/scene/ParticleField.tsx`**

```tsx
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
```

- [ ] **Step 4: Scrie `components/scene/HeartBurst.tsx`**

```tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32, range } from '@/lib/scene/random';
import { BURST_DURATION_S, HEART_Z } from '@/lib/scene/particles';
import { nowSeconds, sceneStore } from '@/lib/scene/store';
import { createHeartGeometry } from './geometry';

const COUNT = 40;

export default function HeartBurst() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useRef<THREE.MeshPhysicalMaterial>(null);
  const geometry = useMemo(() => createHeartGeometry(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const directions = useMemo(() => {
    const random = mulberry32(21);
    return Array.from({ length: COUNT }, () => {
      const angle = range(random, 0, Math.PI * 2);
      return { x: Math.cos(angle), y: Math.sin(angle), speed: range(random, 3, 7), spin: range(random, -4, 4) };
    });
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const instanced = mesh.current;
    if (!instanced || !material.current) return;
    const { burstAt } = sceneStore.get();
    const elapsed = burstAt === null ? Infinity : nowSeconds() - burstAt;
    const active = elapsed >= 0 && elapsed <= BURST_DURATION_S;
    instanced.visible = active;
    if (!active) return;

    const progress = elapsed / BURST_DURATION_S;
    material.current.opacity = 1 - progress;
    directions.forEach((d, i) => {
      const distance = d.speed * elapsed;
      dummy.position.set(d.x * distance, d.y * distance + progress * 1.5, HEART_Z);
      dummy.rotation.set(0, 0, d.spin * elapsed);
      dummy.scale.setScalar(0.35 * (1 - progress * 0.6));
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, COUNT]} frustumCulled={false} visible={false}>
      <meshPhysicalMaterial ref={material} color="#FFAFCC" roughness={0.3} clearcoat={0.8} transparent />
    </instancedMesh>
  );
}
```

- [ ] **Step 5: Scrie `components/scene/GradientBackground.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** Cerul ca textura de fundal: canvas opac, deci bloom-ul nu inegreste fundalul. */
export default function GradientBackground({ top, bottom }: { top: string; bottom: string }) {
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
    return () => {
      scene.background = null;
      texture.dispose();
    };
  }, [scene, top, bottom]);

  return null;
}
```

- [ ] **Step 6: Scrie `components/scene/CameraRig.tsx`**

```tsx
'use client';

import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { cameraOnPath, CAMERA_START_Z } from '@/lib/scene/camera';
import type { SceneMode } from '@/lib/scene/store';
import { decayWind, pointer, readScrollProgress } from './input';

export default function CameraRig({ mode, reduced }: { mode: SceneMode; reduced: boolean }) {
  const camera = useThree((state) => state.camera);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    decayWind(delta);
    const follow = 1 - Math.exp(-delta * 3);
    const base = mode === 'experience' && !reduced ? cameraOnPath(readScrollProgress()) : { x: 0, y: 0, z: CAMERA_START_Z };
    const parallaxX = reduced ? 0 : pointer.x * 0.6;
    const parallaxY = reduced ? 0 : pointer.y * 0.4;

    camera.position.x += (base.x + parallaxX - camera.position.x) * follow;
    camera.position.y += (base.y + parallaxY - camera.position.y) * follow;
    camera.position.z += (base.z - camera.position.z) * follow;
    target.set(base.x * 0.5, base.y * 0.5, base.z - 6);
    camera.lookAt(target);
  });

  return null;
}
```

- [ ] **Step 7: Scrie `components/scene/SceneCanvas.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { SCENE_THEMES, TOTAL_PARTICLES, particleCounts } from '@/lib/scene/themes';
import ParticleField from './ParticleField';
import HeartBurst from './HeartBurst';
import GradientBackground from './GradientBackground';
import CameraRig from './CameraRig';
import { onPointerMove } from './input';
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
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  const budget = reduced ? TOTAL_PARTICLES.reduced : isMobile ? TOTAL_PARTICLES.mobile : TOTAL_PARTICLES.desktop;
  const counts = particleCounts(config, budget);

  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={visible ? 'always' : 'never'}
      gl={{ antialias: !isMobile, powerPreference: 'high-performance' }}
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
      {!reduced && !isMobile && (
        <EffectComposer>
          <Bloom intensity={0.35} luminanceThreshold={0.8} mipmapBlur />
        </EffectComposer>
      )}
    </Canvas>
  );
}
```

- [ ] **Step 8: Scrie `components/scene/SceneRoot.tsx`**

```tsx
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useSceneState } from './useSceneState';

const SceneCanvas = dynamic(() => import('./SceneCanvas'), { ssr: false });

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

interface Support {
  webgl: boolean;
  reduced: boolean;
}

/** Cerul CSS e mereu prezent (fallback fara WebGL si cat se incarca 3D-ul); canvas-ul vine peste el. */
export default function SceneRoot() {
  const { theme } = useSceneState();
  const [support, setSupport] = useState<Support | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSupport({ webgl: hasWebGL(), reduced: query.matches });
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return (
    <>
      <div className="sky" data-theme={theme} aria-hidden="true" />
      {support?.webgl && (
        <div className="scene-layer" aria-hidden="true">
          <SceneCanvas reduced={support.reduced} />
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 9: Scrie `components/scene/SceneController.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import type { ThemeId } from '@/lib/domain';
import { sceneStore, type SceneMode } from '@/lib/scene/store';

/** Pusa intr-o pagina, seteaza tema / modul scenei cat timp pagina e montata. */
export default function SceneController({ theme, mode = 'ambient' }: { theme: ThemeId; mode?: SceneMode }) {
  useEffect(() => {
    sceneStore.set({ theme, mode });
  }, [theme, mode]);

  useEffect(() => () => sceneStore.reset(), []);

  return null;
}
```

- [ ] **Step 10: Typecheck**

Run: `npx tsc --noEmit`
Expected: fara erori.

- [ ] **Step 11: Commit**

```bash
git add components/scene
git commit -m "feat: add instanced particle scene with camera rig and heart burst"
```

---

### Task 5: Montarea scenei in layout-uri

**Files:**
- Modify: `app/(app)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/globals.css`
- Delete: `components/SkyBackground.tsx`

- [ ] **Step 1: In `app/(app)/layout.tsx`**, inlocuieste `import SkyBackground from '@/components/SkyBackground';` cu `import SceneRoot from '@/components/scene/SceneRoot';` si `<SkyBackground theme="amandoua" />` cu `<SceneRoot />`.

- [ ] **Step 2: In `app/(auth)/login/page.tsx`**, acelasi lucru: import `SceneRoot` si inlocuieste `<SkyBackground theme="amandoua" />` cu `<SceneRoot />`.

- [ ] **Step 3: Sterge componenta veche**

```bash
git rm -q components/SkyBackground.tsx
```

Run: `npx tsc --noEmit`
Expected: fara erori (nicio referinta ramasa la `SkyBackground`).

- [ ] **Step 4: Adauga la finalul `app/globals.css`**

```css
/* Faza 4: scena 3D */
.scene-layer { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
.scene-layer canvas { width: 100% !important; height: 100% !important; display: block; }
```

- [ ] **Step 5: Verificare vizuala**

`npm run dev` -> `/login` si dashboard:
- se vad frunze roz si fulgi care cad peste gradientul roz -> baby blue
- miscarea mouse-ului misca usor camera si "sufla" particulele
- DevTools -> Rendering -> "Emulate CSS prefers-reduced-motion: reduce" -> reload -> doar ~12 particule lente, camera fixa
- DevTools -> Performance (sau Rendering -> Frame rendering stats): ~60 fps pe desktop; cu Device toolbar pe un telefon mediu si CPU throttling 4x ramane fluid (fara bloom, 80 particule)
- tab ascuns -> revino: animatia continua fara salt urias (dt e limitat la 50 ms)

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/layout.tsx" "app/(auth)/login/page.tsx" app/globals.css
git commit -m "feat: mount the 3D scene behind the app and login pages"
```

---

### Task 6: Experienta scroll-driven, preview de tema si rafala

**Files:**
- Create: `components/scene/InvitationExperience.tsx`
- Modify: `app/(app)/invitatii/[id]/page.tsx` (rescris), `app/(app)/invitatii/[id]/ResponsePanel.tsx`, `app/(app)/invitatii/noua/InvitationForm.tsx`, `app/globals.css`

> **Nota (fixuri UI dupa Faza 2):** `ResponsePanel.tsx`, `InvitationForm.tsx` si `page.tsx` contin deja: radio-uri necontrolate (`defaultChecked`, ca sa supravietuiasca reset-ului formularului din React 19), `maxDateTime`, valorile ecou-ate la eroare, `RefreshOnMount` (badge) si mesajul flash `?mesaj=`. Modificarile de mai jos se aplica peste acel cod; nu le inlocui cu variante controlate (`checked=`).

- [ ] **Step 1: Scrie `components/scene/InvitationExperience.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Countdown from '@/components/Countdown';
import type { ThemeId } from '@/lib/domain';
import { REVEAL_TITLE_DELAY_S } from '@/lib/scene/particles';
import { nowSeconds, sceneStore } from '@/lib/scene/store';

export interface ExperienceInvitation {
  title: string;
  message: string;
  location: string;
  startsAtISO: string;
  startsAtLabel: string;
  dressCode: string | null;
  fromName: string;
}

interface InvitationExperienceProps {
  invitation: ExperienceInvitation;
  theme: ThemeId;
  children: ReactNode;
}

export default function InvitationExperience({ invitation, theme, children }: InvitationExperienceProps) {
  const root = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo(0, 0);
    sceneStore.set({ theme, mode: 'experience', revealAt: nowSeconds() });
    const timer = window.setTimeout(() => setRevealed(true), reduced ? 0 : REVEAL_TITLE_DELAY_S * 1000);
    return () => {
      window.clearTimeout(timer);
      sceneStore.reset();
    };
  }, [theme]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const section = (entry.target as HTMLElement).dataset.section;
          if (entry.isIntersecting && section !== 'reveal') entry.target.classList.add('is-visible');
          if (section === 'place') sceneStore.set({ swirl: entry.isIntersecting });
          if (section === 'answer') sceneStore.set({ settle: entry.isIntersecting });
        }
      },
      { threshold: 0.45 },
    );
    element.querySelectorAll('[data-section]').forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const lines = invitation.message.split(/\n+/).filter((line) => line.trim() !== '');

  return (
    <div ref={root} className="experience">
      <section data-section="reveal" className={`exp-section exp-reveal${revealed ? ' is-visible' : ''}`}>
        <p className="eyebrow">{invitation.fromName} te invita</p>
        <h1 className="exp-title">{invitation.title}</h1>
        <p className="exp-scroll-hint">Deruleaza ↓</p>
      </section>

      <section data-section="message" className="exp-section">
        <div className="exp-card">
          {lines.map((line, index) => (
            <p key={index} className="exp-line" style={{ transitionDelay: `${index * 140}ms` }}>
              {line}
            </p>
          ))}
        </div>
      </section>

      <section data-section="place" className="exp-section">
        <div className="exp-card">
          <p className="eyebrow">Unde</p>
          <h2>{invitation.location}</h2>
        </div>
      </section>

      <section data-section="date" className="exp-section">
        <div className="exp-card stack">
          <p className="eyebrow">Cand</p>
          <h2>{invitation.startsAtLabel}</h2>
          <Countdown targetISO={invitation.startsAtISO} label="Mai sunt" completeLabel="E acum!" />
        </div>
      </section>

      {invitation.dressCode && (
        <section data-section="dress" className="exp-section">
          <div className="exp-card">
            <p className="eyebrow">Dress code</p>
            <h2>{invitation.dressCode}</h2>
          </div>
        </section>
      )}

      <section data-section="answer" className="exp-section exp-answer">
        {children}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Rafala la "Da" in `ResponsePanel.tsx`**

Adauga importul:

```tsx
import { triggerBurst } from '@/lib/scene/store';
```

Pe `<form ...>` adauga handler-ul `onSubmit` (rafala porneste imediat; pagina se re-randeaza dupa raspuns, iar store-ul pastreaza rafala in curs). `choice` ramane state-ul care urmareste selectia (radio-urile folosesc `defaultChecked={choice === option.value}` + `onChange`, nu `checked`):

```tsx
    <form
      action={formAction}
      className="card form response-panel"
      onSubmit={() => {
        if (choice === 'accept') triggerBurst();
      }}
    >
```

- [ ] **Step 3: Preview de tema in `InvitationForm.tsx`**

Adauga importul:

```tsx
import SceneController from '@/components/scene/SceneController';
```

Imediat dupa `<form action={formAction} className="card form">` adauga (`theme` e state-ul existent; radio-urile raman cu `defaultChecked`):

```tsx
      <SceneController theme={theme} />
```

- [ ] **Step 4: Rescrie `app/(app)/invitatii/[id]/page.tsx`**

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import RefreshOnMount from '@/components/RefreshOnMount';
import SceneController from '@/components/scene/SceneController';
import InvitationExperience from '@/components/scene/InvitationExperience';
import { requireSession } from '@/lib/auth/require-session';
import { displayNames } from '@/lib/auth/display-names';
import { getDb } from '@/lib/db/client';
import { getInvitation } from '@/lib/invitations/queries';
import { MAX_FUTURE_MS, canPerform } from '@/lib/invitations/state-machine';
import { listMemories } from '@/lib/memories/queries';
import { canHaveMemories } from '@/lib/memories/service';
import { markReadForInvitation } from '@/lib/notifications/queries';
import { formatDateTimeRo, toLocalInputValue } from '@/lib/time';
import { flashMessage } from './flash';
import InvitationDetails from './InvitationDetails';
import ResponsePanel from './ResponsePanel';
import CreatorActions from './CreatorActions';
import MemoriesSection from './MemoriesSection';
import { respondAction, acceptProposalAction, cancelInvitationAction } from './actions';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revezi?: string; mesaj?: string | string[] }>;
}

export default async function InvitationPage({ params, searchParams }: PageProps) {
  const me = await requireSession();
  const [{ id }, { revezi, mesaj }] = await Promise.all([params, searchParams]);
  const flash = flashMessage(mesaj);
  const db = getDb();
  const invitation = await getInvitation(db, id);
  if (!invitation) notFound();

  const now = new Date();
  // Atentie: marcarea ca citite se face aici, la randarea GET a paginii. Un prefetch agresiv al
  // link-urilor catre aceasta pagina (prefetch={true}) ar marca notificarile citite la simplul hover.
  const markedRead = await markReadForInvitation(db, me, invitation.id, now);
  // Layout-ul nu se re-randeaza la navigarea client: cerem un refresh ca badge-ul sa se actualizeze.
  // Dupa refresh markedRead e 0 si componenta dispare; restul arborelui ramane montat.
  const refresh = markedRead > 0 ? <RefreshOnMount /> : null;
  const names = displayNames();
  const isRecipient = invitation.toUser === me;
  const canRespond = canPerform(invitation, me, 'accept', now);
  const replay = revezi === '1' && isRecipient;

  if (canRespond || replay) {
    return (
      <>
        {refresh}
        <InvitationExperience
          theme={invitation.theme}
          invitation={{
            title: invitation.title,
            message: invitation.message,
            location: invitation.location,
            startsAtISO: invitation.startsAt.toISOString(),
            startsAtLabel: formatDateTimeRo(invitation.startsAt),
            dressCode: invitation.dressCode,
            fromName: names[invitation.fromUser],
          }}
        >
          {canRespond ? (
            <ResponsePanel
              action={respondAction.bind(null, invitation.id)}
              minDateTime={toLocalInputValue(now)}
              maxDateTime={toLocalInputValue(new Date(now.getTime() + MAX_FUTURE_MS))}
            />
          ) : (
            <div className="card stack">
              <p>Ai raspuns deja la invitatia asta.</p>
              <Link href={`/invitatii/${invitation.id}`} className="btn btn-primary">
                Inapoi la rezumat
              </Link>
            </div>
          )}
        </InvitationExperience>
      </>
    );
  }

  const memories = canHaveMemories(invitation, now) ? await listMemories(db, invitation.id) : null;

  return (
    <div className="stack">
      {refresh}
      <SceneController theme={invitation.theme} />
      {flash && (
        <p className="form-success" role="status">
          {flash}
        </p>
      )}
      <InvitationDetails
        invitation={invitation}
        me={me}
        names={names}
        isFuture={invitation.startsAt.getTime() > now.getTime()}
      />
      {isRecipient && (
        <div className="row">
          <Link href={`/invitatii/${invitation.id}?revezi=1`} className="btn btn-ghost">
            Revezi invitatia
          </Link>
        </div>
      )}
      <CreatorActions
        acceptProposal={
          canPerform(invitation, me, 'acceptProposal', now) ? acceptProposalAction.bind(null, invitation.id) : null
        }
        cancel={canPerform(invitation, me, 'cancel', now) ? cancelInvitationAction.bind(null, invitation.id) : null}
      />
      {memories && <MemoriesSection invitationId={invitation.id} me={me} names={names} memories={memories} />}
    </div>
  );
}
```

- [ ] **Step 5: Adauga la finalul `app/globals.css`**

```css
/* Faza 4: experienta invitatiei */
.experience { display: grid; }
.exp-section {
  min-height: 100vh; display: grid; place-items: center; align-content: center; gap: 12px; text-align: center; padding: 48px 0;
  opacity: 0; transform: translateY(24px); transition: opacity 700ms ease, transform 700ms ease;
}
.exp-section.is-visible { opacity: 1; transform: none; }
.exp-reveal { min-height: calc(100vh - 80px); }
.exp-title { font-size: clamp(2.5rem, 9vw, 5.5rem); text-shadow: 0 4px 30px rgba(255, 255, 255, 0.8); }
.exp-card {
  width: min(640px, 100%); padding: 32px; border-radius: 28px;
  background: var(--glass); border: 1px solid var(--glass-border); box-shadow: var(--shadow);
  -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
}
.exp-line {
  font-family: var(--font-display); font-size: 1.3rem; line-height: 1.5; margin: 6px 0;
  opacity: 0; transform: translateY(10px); transition: opacity 600ms ease, transform 600ms ease;
}
.is-visible .exp-line { opacity: 1; transform: none; }
.exp-scroll-hint { margin-top: 24px; color: var(--ink-soft); animation: exp-bob 1.8s ease-in-out infinite; }
@keyframes exp-bob { 50% { transform: translateY(6px); } }
.exp-answer > * { width: min(560px, 100%); text-align: left; }
@media (prefers-reduced-motion: reduce) {
  .exp-section, .exp-line { opacity: 1 !important; transform: none !important; }
  .exp-scroll-hint { animation: none; }
}
```

- [ ] **Step 6: Verify si verificare vizuala**

Run: `npm run verify`
Expected: tot PASS.

`npm run dev`, cu doi useri:
1. Ca el, `/invitatii/noua`: schimbarea temei schimba fundalul live (Toamna roz = frunze, Iarna = fulgi, Amandoua = ambele). Trimite cu tema "Iarna baby blue".
2. Ca ea, deschide invitatia: particulele se aduna intr-o inima (~2 s), se imprastie, apare titlul.
3. Deruleaza: camera inainteaza prin fulgi; mesajul apare rand cu rand; la "Unde" particulele se rotesc; la "Cand" apare countdown-ul; la raspuns particulele incetinesc.
4. Alege "Da, abia astept" -> Trimite: rafala de inimi si particule, apoi pagina devine rezumat cu buton "Revezi invitatia".
5. "Revezi invitatia" -> experienta porneste din nou, la final "Inapoi la rezumat".
6. Reduced motion activ: toate sectiunile vizibile imediat, fara inima / rafala, scroll normal.
7. Test fara WebGL: `chrome://flags` -> "WebGL" dezactivat (sau Firefox `webgl.disabled=true`): gradient CSS, aplicatia functioneaza complet.

- [ ] **Step 7: Commit**

```bash
git add components/scene/InvitationExperience.tsx "app/(app)/invitatii" app/globals.css
git commit -m "feat: add scroll-driven invitation experience, live theme preview and yes burst"
```
