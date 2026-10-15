/** Shared dollhouse measurements. Meshes, walking and the camera all read this
 *  so nothing is placed by a second, drifting set of numbers. */

export type Aabb = { id: string; minX: number; maxX: number; minZ: number; maxZ: number };
export type Box3 = Aabb & { minY: number; maxY: number };

export const CEILING_Y = 2.66;
export const WALL_T = 0.1;
export const BODY_R = 0.2;

/** Inner faces of the solid walls. +Z is the open front. */
export const INNER = {
  minX: -3.22,
  maxX: 3.22,
  minZ: -2.62,
  maxZ: 2.48,
};

export const SOFA = {
  x: -1.48,
  z: -2.16,
  w: 1.78,
  d: 0.72,
  seatH: 0.46,
  backH: 0.48,
  backT: 0.1,
  armW: 0.1,
  armH: 0.18,
};

export const TABLE = { x: -1.48, z: -0.78, w: 0.86, d: 0.48, h: 0.34 };
export const SHELF = { x: -2.98, z: 0.28, w: 0.34, d: 1.16, h: 1.72 };
export const CHAIR = { x: 2.22, z: -0.22, w: 0.62, d: 0.62, h: 0.78 };
export const PLANT = { x: 2.18, z: 1.48, r: 0.22 };
export const TEA = { x: -2.18, z: 1.48, w: 0.46, d: 0.46, h: 0.4 };
export const LAMP = { x: 2.42, z: -2.15, r: 0.14 };
export const HEARTH = { x: -3.02, z: -1.22, w: 0.28, d: 0.62, h: 0.55 };
/** Small mat on the open edge, and the grass just outside it. */
export const EXIT = { x: 0.48, z: 2.16, w: 1.28, d: 0.72 };
export const LAWN = { x: 0.48, z: 4.2 };

const seatFront = SOFA.z + SOFA.d / 2;
const backInner = SOFA.z - SOFA.d / 2 + SOFA.backT;

export const SIT = {
  x: SOFA.x,
  z: seatFront - 0.13,
  y: 0.53,
  yaw: 0,
  seatFront,
  backInner,
  seatTop: SOFA.seatH,
};

export type SpotId = "center" | "window" | "plant" | "shelf" | "tea" | "lane" | "approach" | "sit" | "easel" | "door" | "lawn";

export type Spot = { id: SpotId; x: number; z: number; yaw: number };

export const SPOTS: Record<SpotId, Spot> = {
  center: { id: "center", x: 0.42, z: 0.82, yaw: 0.15 },
  window: { id: "window", x: 1.22, z: -1.55, yaw: Math.PI },
  plant: { id: "plant", x: 1.42, z: 1.12, yaw: 0.7 },
  shelf: { id: "shelf", x: -2.28, z: 0.28, yaw: -Math.PI / 2 },
  tea: { id: "tea", x: -1.42, z: 1.22, yaw: -2.3 },
  easel: { id: "easel", x: 1.48, z: -0.18, yaw: Math.PI / 2 },
  door: { id: "door", x: EXIT.x, z: EXIT.z, yaw: 0 },
  lawn: { id: "lawn", x: LAWN.x, z: LAWN.z, yaw: Math.PI / 2 + 0.62 },
  lane: { id: "lane", x: -0.28, z: -1.18, yaw: Math.PI },
  approach: { id: "approach", x: SOFA.x, z: seatFront + BODY_R + 0.1, yaw: Math.PI },
  sit: { id: "sit", x: SIT.x, z: SIT.z, yaw: SIT.yaw },
};

const EDGES: [SpotId, SpotId][] = [
  ["center", "window"],
  ["center", "plant"],
  ["center", "shelf"],
  ["center", "tea"],
  ["center", "easel"],
  ["window", "easel"],
  ["center", "door"],
  ["door", "lawn"],
  ["center", "lane"],
  ["lane", "approach"],
  ["approach", "sit"],
];

function box(id: string, x: number, z: number, w: number, d: number): Aabb {
  return { id, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
}

export function footAabbs(): Aabb[] {
  return [
    box("sofa", SOFA.x, SOFA.z, SOFA.w, SOFA.d),
    box("table", TABLE.x, TABLE.z, TABLE.w, TABLE.d),
    box("shelf", SHELF.x, SHELF.z, SHELF.w, SHELF.d),
    box("chair", CHAIR.x, CHAIR.z, CHAIR.w, CHAIR.d),
    box("plant", PLANT.x, PLANT.z, PLANT.r * 2, PLANT.r * 2),
    box("tea", TEA.x, TEA.z, TEA.w, TEA.d),
    box("lamp", LAMP.x, LAMP.z, LAMP.r * 2, LAMP.r * 2),
    box("hearth", HEARTH.x, HEARTH.z, HEARTH.w, HEARTH.d),
  ];
}

export function blocked(x: number, z: number, ignoreSofa = false): boolean {
  const inside =
    x >= INNER.minX + BODY_R &&
    x <= INNER.maxX - BODY_R &&
    z >= INNER.minZ + BODY_R &&
    z <= INNER.maxZ - BODY_R;
  const gate = Math.abs(x - EXIT.x) <= 0.36 && z > INNER.maxZ - BODY_R && z <= LAWN.z + 0.25;
  if (!inside && !gate) return true;
  for (const b of footAabbs()) {
    if (ignoreSofa && b.id === "sofa") continue;
    if (x > b.minX - BODY_R && x < b.maxX + BODY_R && z > b.minZ - BODY_R && z < b.maxZ + BODY_R) {
      return true;
    }
  }
  return false;
}

export function lineClear(x: number, z: number, tx: number, tz: number, ignoreSofa = false): boolean {
  const dist = Math.hypot(tx - x, tz - z);
  const steps = Math.max(1, Math.ceil(dist / 0.08));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    if (blocked(x + (tx - x) * t, z + (tz - z) * t, ignoreSofa)) return false;
  }
  return true;
}

export function slide(
  x: number,
  z: number,
  nx: number,
  nz: number,
  ignoreSofa = false,
): { x: number; z: number } {
  if (!blocked(nx, nz, ignoreSofa)) return { x: nx, z: nz };
  if (!blocked(nx, z, ignoreSofa)) return { x: nx, z };
  if (!blocked(x, nz, ignoreSofa)) return { x, z: nz };
  return { x, z };
}

/** Solids the camera is pushed out of (walls + bulky furniture). */
export function cameraSolids(): Box3[] {
  const t = WALL_T;
  const h = CEILING_Y;
  const x0 = INNER.minX;
  const x1 = INNER.maxX;
  const z0 = INNER.minZ;
  const z1 = INNER.maxZ;
  const solids: Box3[] = [
    { id: "back", minX: x0 - t, maxX: x1 + t, minY: 0, maxY: h, minZ: z0 - t, maxZ: z0 },
    { id: "left", minX: x0 - t, maxX: x0, minY: 0, maxY: h, minZ: z0, maxZ: z1 },
  ];
  for (const b of footAabbs()) {
    if (b.id === "lamp" || b.id === "plant") continue;
    const height =
      b.id === "sofa"
        ? SOFA.seatH + SOFA.backH
        : b.id === "table"
          ? TABLE.h
          : b.id === "shelf"
            ? SHELF.h
            : b.id === "chair"
              ? CHAIR.h
              : b.id === "tea"
                ? TEA.h
                : b.id === "hearth"
                  ? HEARTH.h
                  : 1;
    solids.push({ ...b, minY: 0, maxY: height });
  }
  return solids;
}

export function pushOutOfSolids(x: number, y: number, z: number): [number, number, number] {
  let px = x;
  let py = y;
  let pz = z;
  const solids = cameraSolids();
  for (let n = 0; n < 4; n += 1) {
    let moved = false;
    for (const s of solids) {
      if (px <= s.minX || px >= s.maxX || py <= s.minY || py >= s.maxY || pz <= s.minZ || pz >= s.maxZ) {
        continue;
      }
      const left = px - s.minX;
      const right = s.maxX - px;
      const down = py - s.minY;
      const up = s.maxY - py;
      const back = pz - s.minZ;
      const front = s.maxZ - pz;
      const m = Math.min(left, right, down, up, back, front);
      const pad = 0.12;
      if (m === left) px = s.minX - pad;
      else if (m === right) px = s.maxX + pad;
      else if (m === down) py = s.minY - pad;
      else if (m === up) py = s.maxY + pad;
      else if (m === back) pz = s.minZ - pad;
      else pz = s.maxZ + pad;
      moved = true;
    }
    if (!moved) break;
  }
  if (py < 0.35) py = 0.35;
  return [px, py, pz];
}

export function routeProblems(): string[] {
  const problems: string[] = [];
  for (const spot of Object.values(SPOTS)) {
    const ignore = spot.id === "sit";
    if (blocked(spot.x, spot.z, ignore)) problems.push(`spot ${spot.id} is inside geometry`);
    if (!ignore && blocked(spot.x, spot.z, false) === false && spot.id === "sit") {
      problems.push("sit spot unexpectedly clear of the sofa");
    }
  }
  if (!blocked(SPOTS.sit.x, SPOTS.sit.z, false)) {
    problems.push("sit spot should rest on the sofa volume");
  }
  if (SIT.z >= SIT.seatFront - 0.02) problems.push("sit anchor is not on the cushion");
  if (SIT.z - 0.16 < SIT.backInner) problems.push("sit anchor clips the backrest");
  for (const [a, b] of EDGES) {
    const A = SPOTS[a];
    const B = SPOTS[b];
    const ignore = a === "sit" || b === "sit";
    const steps = 12;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = A.x + (B.x - A.x) * t;
      const z = A.z + (B.z - A.z) * t;
      if (blocked(x, z, ignore)) {
        problems.push(`edge ${a}->${b} blocked at t=${t.toFixed(2)}`);
        break;
      }
    }
  }
  return problems;
}
