import { useEffect, useMemo, useRef } from "react";
import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  CEILING_Y,
  CHAIR,
  HEARTH,
  INNER,
  EXIT,
  LAMP,
  PLANT,
  SHELF,
  SOFA,
  TABLE,
  TEA,
  WALL_T,
} from "@/lib/layout";
import { useCottage } from "@/lib/cottage-store";

const WOOD = "#e4cba4";
const WOOD_DARK = "#c9a67a";
const WALL = "#f4f8fb";
const SOFA_C = "#7eb6d4";
const SOFA_D = "#5e9cbf";
const PLANT_C = "#7eaa96";
const PLANT_D = "#5f8d78";
const WALL_OUT = new THREE.MeshStandardMaterial({ color: WOOD_DARK, roughness: 0.8 });

function paintTex(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size: number, repeat: [number, number]) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function useWood() {
  return useMemo(
    () =>
      paintTex((ctx, size) => {
        const plank = 64;
        for (let y = 0; y < size; y += plank) {
          const tone = 196 + ((y / plank) % 3) * 8;
          ctx.fillStyle = `rgb(${tone}, ${tone - 38}, ${tone - 78})`;
          ctx.fillRect(0, y, size, plank - 3);
          ctx.fillStyle = "rgba(90, 58, 32, 0.35)";
          ctx.fillRect(0, y + plank - 3, size, 3);
          ctx.strokeStyle = "rgba(120, 78, 42, 0.18)";
          for (let g = 4; g < plank - 6; g += 5) {
            ctx.beginPath();
            ctx.moveTo(0, y + g);
            for (let x = 0; x <= size; x += 24) ctx.lineTo(x, y + g + Math.sin(x * 0.05 + y) * 1.4);
            ctx.stroke();
          }
        }
      }, 512, [2.2, 2.2]),
    [],
  );
}

function useWeave() {
  return useMemo(
    () =>
      paintTex((ctx, size) => {
        ctx.fillStyle = "#f4f7f8";
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < size; i += 2) {
          ctx.fillStyle = i % 4 === 0 ? "rgba(40,70,90,0.07)" : "rgba(255,255,255,0.35)";
          ctx.fillRect(0, i, size, 1);
          ctx.fillRect(i, 0, 1, size);
        }
      }, 128, [6, 6]),
    [],
  );
}

function useCoir() {
  return useMemo(
    () =>
      paintTex((ctx, size) => {
        ctx.fillStyle = "#8a6240";
        ctx.fillRect(0, 0, size, size);
        for (let y = 0; y < size; y += 8) {
          for (let x = 0; x < size; x += 8) {
            const ox = (y / 8) % 2 === 0 ? 0 : 4;
            ctx.strokeStyle = (x + y) % 16 === 0 ? "#6a4528" : "#c49a72";
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(x + ox + 4, y + 4, 2.4, 0.2, Math.PI * 1.75);
            ctx.stroke();
          }
        }
      }, 128, [5, 2.8]),
    [],
  );
}

function useRug() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 344;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#f6efe4";
    ctx.fillRect(0, 0, 512, 344);
    ctx.fillStyle = "#fffaf3";
    ctx.fillRect(18, 14, 476, 316);
    for (let i = 0; i < 700; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(214, 186, 150, 0.28)" : "rgba(255,255,255,0.45)";
      ctx.fillRect(30 + Math.random() * 450, 24 + Math.random() * 290, 2, 7);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);
}

function useGrass() {
  return useMemo(
    () =>
      paintTex((ctx, size) => {
        ctx.fillStyle = "#6fbf66";
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 1400; i += 1) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          ctx.fillStyle = i % 3 === 0 ? "rgba(40,110,48,0.35)" : "rgba(210,235,160,0.28)";
          ctx.fillRect(x, y, 2, 6);
        }
      }, 256, [18, 18]),
    [],
  );
}

function usePlaster() {
  return useMemo(
    () =>
      paintTex((ctx, size) => {
        ctx.fillStyle = "#f7fbfe";
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "rgba(142, 186, 214, 0.72)";
        ctx.fillRect(0, size * 0.78, size, size * 0.1);
      }, 64, [1, 1]),
    [],
  );
}

function useBark() {
  return useMemo(
    () =>
      paintTex((ctx, size) => {
        ctx.fillStyle = "#e7c892";
        ctx.fillRect(0, 0, size, size);
        const count = 8;
        const gap = size / count;
        for (let i = 0; i < count; i += 1) {
          ctx.fillStyle = "rgba(92, 54, 26, 0.22)";
          ctx.fillRect(i * gap, 0, gap * 0.16, size);
        }
        const shade = ctx.createLinearGradient(0, 0, size, 0);
        shade.addColorStop(0, "rgba(62, 36, 16, 0.34)");
        shade.addColorStop(0.28, "rgba(255, 228, 196, 0.2)");
        shade.addColorStop(0.62, "rgba(0, 0, 0, 0)");
        shade.addColorStop(1, "rgba(62, 36, 16, 0.34)");
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, size, size);
      }, 128, [1, 1]),
    [],
  );
}

function useLogEnd() {
  return useMemo(
    () =>
      paintTex((ctx, size) => {
        const c = size / 2;
        ctx.fillStyle = "#e7c892";
        ctx.fillRect(0, 0, size, size);
        for (let i = 5; i >= 1; i -= 1) {
          ctx.beginPath();
          ctx.arc(c, c, (i / 5) * c * 0.86, 0, Math.PI * 2);
          ctx.strokeStyle = i % 2 === 0 ? "rgba(92, 54, 26, 0.55)" : "rgba(232, 196, 142, 0.45)";
          ctx.lineWidth = size * 0.035;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(c, c, c * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(92, 54, 26, 0.45)";
        ctx.fill();
      }, 128, [1, 1]),
    [],
  );
}

function useDoodle() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#f6efe2";
    ctx.fillRect(0, 0, 512, 384);
    for (let i = 0; i < 36; i += 1) {
      ctx.strokeStyle = i % 2 === 0 ? "rgba(90, 140, 170, 0.12)" : "rgba(210, 150, 90, 0.09)";
      ctx.lineWidth = 2 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(0, 8 + i * 11);
      ctx.bezierCurveTo(150, 4 + i * 11, 340, 16 + i * 11, 512, 6 + i * 11);
      ctx.stroke();
    }
    const cx = 250;
    const cy = 220;
    ctx.fillStyle = "#f7f4ef";
    ctx.beginPath();
    ctx.arc(cx, cy, 126, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5d7894";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.fillStyle = "#6d86ae";
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy - 36, 132, 108, -0.06, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy - 18, 124, 26, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - 6, cy - 118, 34, 16, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 70, cy - 70);
    ctx.quadraticCurveTo(cx - 10, cy - 96, cx + 48, cy - 62);
    ctx.stroke();
    ctx.fillStyle = "#1b2430";
    ctx.beginPath();
    ctx.ellipse(cx + 28, cy + 18, 18, 40, 0.18, 0, Math.PI * 2);
    ctx.ellipse(cx + 78, cy - 16, 18, 40, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(80, 60, 40, 0.22)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i += 1) {
      ctx.beginPath();
      ctx.moveTo(18 + i * 12, 16 + (i % 3) * 8);
      ctx.lineTo(46 + i * 8, 34 + (i % 4) * 6);
      ctx.moveTo(430, 300 + (i % 4) * 10);
      ctx.lineTo(490, 286 + (i % 5) * 12);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function useFloor() {
  return useMemo(
    () =>
      paintTex((ctx, size) => {
        ctx.fillStyle = "#c5dff0";
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 80; i += 1) {
          ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.16)" : "rgba(120,168,196,0.12)";
          ctx.beginPath();
          ctx.ellipse(Math.random() * size, Math.random() * size, 18 + Math.random() * 30, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }, 256, [3, 3]),
    [],
  );
}

function WoodFloor() {
  const tex = useFloor();
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, -0.05]} receiveShadow>
      <planeGeometry args={[INNER.maxX - INNER.minX + 0.4, INNER.maxZ - INNER.minZ + 0.2]} />
      <meshStandardMaterial map={tex ?? undefined} color="#ffffff" roughness={0.84} />
    </mesh>
  );
}

function Walls() {
  const plaster = usePlaster();
  const x0 = INNER.minX;
  const x1 = INNER.maxX;
  const z0 = INNER.minZ;
  const z1 = INNER.maxZ;
  const h = CEILING_Y;
  const winL = -0.15;
  const winR = 1.72;
  const leftW = winL - x0;
  const rightW = x1 - winR;
  const depth = z1 - z0;
  const mats = useMemo(() => {
    if (!plaster) return null;
    const stripe = (height: number, bottom: number) => {
      const map = plaster.clone();
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(1, height / 0.18);
      map.offset.y = bottom / 0.18;
      map.colorSpace = THREE.SRGBColorSpace;
      map.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ map, color: WALL, roughness: 0.72 });
    };
    const back = (inside: THREE.Material) => [WALL_OUT, WALL_OUT, WALL_OUT, WALL_OUT, inside, WALL_OUT];
    const left = (inside: THREE.Material) => [inside, WALL_OUT, WALL_OUT, WALL_OUT, WALL_OUT, WALL_OUT];
    return {
      leftBack: back(stripe(h, 0)),
      rightBack: back(stripe(h, 0)),
      header: back(stripe(h - 2.04, 2.04)),
      sill: back(stripe(0.4, 0)),
      side: left(stripe(h, 0)),
    };
  }, [plaster, h]);
  if (!mats) return null;
  return (
    <group>
      <group>
        <mesh userData={{ wall: "back" }} position={[x0 + leftW / 2, h / 2, z0 - WALL_T / 2]} material={mats.leftBack} castShadow receiveShadow>
          <boxGeometry args={[leftW, h, WALL_T]} />
        </mesh>
        <mesh userData={{ wall: "back" }} position={[winR + rightW / 2, h / 2, z0 - WALL_T / 2]} material={mats.rightBack} castShadow receiveShadow>
          <boxGeometry args={[rightW, h, WALL_T]} />
        </mesh>
        <mesh userData={{ wall: "back" }} position={[(winL + winR) / 2, (h + 2.04) / 2, z0 - WALL_T / 2]} material={mats.header} receiveShadow>
          <boxGeometry args={[winR - winL, h - 2.04, WALL_T]} />
        </mesh>
        <mesh userData={{ wall: "back" }} position={[(winL + winR) / 2, 0.2, z0 - WALL_T / 2]} material={mats.sill} receiveShadow>
          <boxGeometry args={[winR - winL, 0.4, WALL_T]} />
        </mesh>
        <mesh userData={{ wall: "left" }} position={[x0 - WALL_T / 2, h / 2, (z0 + z1) / 2]} material={mats.side} castShadow receiveShadow>
          <boxGeometry args={[WALL_T, h, depth]} />
        </mesh>
        <mesh position={[(winL + winR) / 2, 1.22, z0 - 0.02]}>
          <planeGeometry args={[winR - winL - 0.12, 1.55]} />
          <meshStandardMaterial color="#e7f6fb" transparent opacity={0.22} roughness={0.02} metalness={0.06} />
        </mesh>
        <FrameHole x0={winL} x1={winR} z={z0 + 0.012} />
        <CabinShell />
        <WallTrim />
        <WallGhost />
      </group>
    </group>
  );
}

function blockingWall(camX: number, camZ: number, charX: number, charZ: number): "back" | "left" | "none" {
  const back = (camZ - INNER.minZ) * (charZ - INNER.minZ) < 0;
  const left = (camX - INNER.minX) * (charX - INNER.minX) < 0;
  if (back && left) return Math.abs(camZ - charZ) > Math.abs(camX - charX) ? "back" : "left";
  if (back) return "back";
  if (left) return "left";
  return "none";
}

function segmentHitsBox(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
) {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  const p = [-dx, dx, -dz, dz];
  const q = [ax - minX, maxX - ax, az - minZ, maxZ - az];
  for (let i = 0; i < 4; i += 1) {
    const pi = p[i] ?? 0;
    const qi = q[i] ?? 0;
    if (Math.abs(pi) < 1e-6) {
      if (qi < 0) return false;
    } else {
      const t = qi / pi;
      if (pi < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
}

function shelfBlocks(camX: number, camZ: number, charX: number, charZ: number) {
  return segmentHitsBox(
    camX,
    camZ,
    charX,
    charZ,
    SHELF.x - SHELF.w / 2 - 0.08,
    SHELF.x + SHELF.w / 2 + 0.08,
    SHELF.z - SHELF.d / 2 - 0.08,
    SHELF.z + SHELF.d / 2 + 0.08,
  );
}

function WallGhost() {
  const shot = useCottage((s) => s.camShot);
  const { camera, scene } = useThree();
  const fade = useRef({ back: 1, left: 1, shelf: 1, sofa: 1, art: 1, hearth: 1 });
  const baseMat = useRef(new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>());
  const baseCast = useRef(new WeakMap<THREE.Mesh, boolean>());
  const fadeMat = useRef(new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>());
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const snap = (
      window as unknown as { __cottage?: { snapshot: () => { x: number; z: number } } }
    ).__cottage?.snapshot();
    const wall = shot === "full" && snap ? blockingWall(camera.position.x, camera.position.z, snap.x, snap.z) : "none";
    const behindShelf = camera.position.x < SHELF.x - SHELF.w / 2 + 0.04;
    const behindSofa = camera.position.z < SOFA.z - SOFA.d / 2 + 0.06;
    const behindArt = camera.position.z < INNER.minZ + 0.12;
    const behindHearth = camera.position.x < HEARTH.x - HEARTH.w / 2 + 0.04;
    const goal = {
      back: wall === "back" ? 0.08 : 1,
      left: wall === "left" ? 0.08 : 1,
      shelf: behindShelf || (shot === "full" && snap && shelfBlocks(camera.position.x, camera.position.z, snap.x, snap.z)) ? 0.07 : 1,
      sofa: behindSofa ? 0.08 : 1,
      art: behindArt ? 0.08 : 1,
      hearth: behindHearth ? 0.08 : 1,
    };
    fade.current.back += (goal.back - fade.current.back) * (1 - Math.exp(-8 * dt));
    fade.current.left += (goal.left - fade.current.left) * (1 - Math.exp(-8 * dt));
    fade.current.shelf += (goal.shelf - fade.current.shelf) * (1 - Math.exp(-8 * dt));
    fade.current.sofa += (goal.sofa - fade.current.sofa) * (1 - Math.exp(-8 * dt));
    fade.current.art += (goal.art - fade.current.art) * (1 - Math.exp(-8 * dt));
    fade.current.hearth += (goal.hearth - fade.current.hearth) * (1 - Math.exp(-8 * dt));
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      let which = mesh.userData?.wall as "back" | "left" | "shelf" | "sofa" | "art" | "hearth" | undefined;
      if (!which) {
        let parent = mesh.parent;
        while (parent && !which) {
          which = parent.userData?.wall as "back" | "left" | "shelf" | "sofa" | "art" | "hearth" | undefined;
          parent = parent.parent;
        }
      }
      if (!mesh.isMesh || (which !== "back" && which !== "left" && which !== "shelf" && which !== "sofa" && which !== "art" && which !== "hearth")) return;
      const opacity = fade.current[which];
      if (!baseMat.current.has(mesh)) baseMat.current.set(mesh, mesh.material);
      if (!baseCast.current.has(mesh)) baseCast.current.set(mesh, mesh.castShadow);
      const original = baseMat.current.get(mesh);
      if (!original) return;
      const originals = Array.isArray(original) ? original : [original];
      if (opacity > 0.97) {
        originals.forEach((mat) => {
          mat.opacity = 1;
          mat.transparent = false;
          mat.depthWrite = true;
        });
        mesh.material = original;
        mesh.castShadow = baseCast.current.get(mesh) ?? mesh.castShadow;
        return;
      }
      let faded = fadeMat.current.get(mesh);
      if (!faded) {
        const clones = originals.map((mat) => {
          const clone = mat.clone();
          clone.transparent = true;
          clone.depthWrite = false;
          return clone;
        });
        faded = clones.length === 1 ? (clones[0] as THREE.Material) : clones;
        fadeMat.current.set(mesh, faded);
      }
      mesh.material = faded;
      mesh.castShadow = false;
      const fades = Array.isArray(faded) ? faded : [faded];
      fades.forEach((mat) => {
        mat.opacity = opacity;
        mat.transparent = true;
        mat.depthWrite = false;
      });
    });
  });
  return null;
}

function FrameHole({ x0, x1, z }: { x0: number; x1: number; z: number }) {
  const w = x1 - x0;
  const t = 0.06;
  const y = 1.22;
  const h = 1.62;
  return (
    <group position={[(x0 + x1) / 2, y, z]}>
      <mesh userData={{ wall: "back" }} position={[0, h / 2, 0]}>
        <boxGeometry args={[w + 0.08, t, 0.05]} />
        <meshStandardMaterial color={WOOD_DARK} />
      </mesh>
      <mesh userData={{ wall: "back" }} position={[0, -h / 2, 0]}>
        <boxGeometry args={[w + 0.08, t, 0.05]} />
        <meshStandardMaterial color={WOOD_DARK} />
      </mesh>
      <mesh userData={{ wall: "back" }} position={[-w / 2, 0, 0]}>
        <boxGeometry args={[t, h, 0.05]} />
        <meshStandardMaterial color={WOOD_DARK} />
      </mesh>
      <mesh userData={{ wall: "back" }} position={[w / 2, 0, 0]}>
        <boxGeometry args={[t, h, 0.05]} />
        <meshStandardMaterial color={WOOD_DARK} />
      </mesh>
    </group>
  );
}

function WallTrim() {
  const x0 = INNER.minX;
  const x1 = INNER.maxX;
  const z0 = INNER.minZ;
  const z1 = INNER.maxZ;
  const rail = "#b7d0e2";
  const panel = "#d7e7f2";
  const winL = -0.15;
  const winR = 1.72;
  return (
    <group>
      <mesh userData={{ wall: "back" }} position={[(x0 + winL) / 2, 0.48, z0 + 0.02]} receiveShadow>
        <boxGeometry args={[winL - x0, 0.82, 0.02]} />
        <meshStandardMaterial color={panel} roughness={0.9} />
      </mesh>
      <mesh userData={{ wall: "back" }} position={[(winR + x1) / 2, 0.48, z0 + 0.02]} receiveShadow>
        <boxGeometry args={[x1 - winR, 0.82, 0.02]} />
        <meshStandardMaterial color={panel} roughness={0.9} />
      </mesh>
      <mesh userData={{ wall: "back" }} position={[(winL + winR) / 2, 0.22, z0 + 0.02]} receiveShadow>
        <boxGeometry args={[winR - winL + 0.08, 0.36, 0.02]} />
        <meshStandardMaterial color={panel} roughness={0.9} />
      </mesh>
      <mesh userData={{ wall: "left" }} position={[x0 + 0.02, 0.48, (z0 + z1) / 2]} receiveShadow>
        <boxGeometry args={[0.02, 0.82, z1 - z0]} />
        <meshStandardMaterial color={panel} roughness={0.9} />
      </mesh>
      <mesh userData={{ wall: "back" }} position={[(x0 + winL) / 2, 0.92, z0 + 0.03]} castShadow>
        <boxGeometry args={[winL - x0, 0.045, 0.03]} />
        <meshStandardMaterial color={rail} roughness={0.7} />
      </mesh>
      <mesh userData={{ wall: "back" }} position={[(winR + x1) / 2, 0.92, z0 + 0.03]} castShadow>
        <boxGeometry args={[x1 - winR, 0.045, 0.03]} />
        <meshStandardMaterial color={rail} roughness={0.7} />
      </mesh>
      <mesh userData={{ wall: "left" }} position={[x0 + 0.03, 0.92, (z0 + z1) / 2]} castShadow>
        <boxGeometry args={[0.03, 0.045, z1 - z0]} />
        <meshStandardMaterial color={rail} roughness={0.7} />
      </mesh>
      <mesh userData={{ wall: "back" }} position={[(x0 + x1) / 2, 0.08, z0 + 0.04]} castShadow>
        <boxGeometry args={[x1 - x0, 0.14, 0.045]} />
        <meshStandardMaterial color={WOOD} roughness={0.72} />
      </mesh>
      <mesh userData={{ wall: "left" }} position={[x0 + 0.04, 0.08, (z0 + z1) / 2]} castShadow>
        <boxGeometry args={[0.045, 0.14, z1 - z0]} />
        <meshStandardMaterial color={WOOD} roughness={0.72} />
      </mesh>
    </group>
  );
}

function CabinShell() {
  const bark = useBark();
  const end = useLogEnd();
  const r = 0.11;
  const pitch = 0.2;
  const h = CEILING_Y;
  const winL = -0.15;
  const winR = 1.72;
  const winBot = 0.42;
  const winTop = 2.08;
  const x0 = INNER.minX;
  const x1 = INNER.maxX;
  const z0 = INNER.minZ;
  const z1 = INNER.maxZ;
  const backZ = z0 - WALL_T - 0.08;
  const leftX = x0 - WALL_T - 0.08;
  const side = useMemo(() => {
    if (!bark) return null;
    const map = bark.clone();
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1, 1);
    map.colorSpace = THREE.SRGBColorSpace;
    map.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map, color: "#ffffff", roughness: 0.86 });
  }, [bark]);
  const cap = useMemo(
    () => new THREE.MeshStandardMaterial({ map: end ?? undefined, color: "#ffffff", roughness: 0.8 }),
    [end],
  );
  const logs: { key: string; x: number; y: number; z: number; len: number; axis: "x" | "z" }[] = [];
  const xOut0 = x0 - 0.04;
  const xOut1 = x1 + 0.04;
  const winCutL = winL - 0.04;
  const winCutR = winR + 0.04;
  const zBack = backZ + r;
  const zFront = z1 + 0.04;
  for (let y = r; y < h - 0.04; y += pitch) {
    const acrossWindow = y > winBot && y < winTop;
    if (!acrossWindow) {
      logs.push({ key: `b${y.toFixed(2)}`, x: (xOut0 + xOut1) / 2, y, z: backZ, len: xOut1 - xOut0, axis: "x" });
    } else {
      logs.push({ key: `bl${y.toFixed(2)}`, x: (xOut0 + winCutL) / 2, y, z: backZ, len: winCutL - xOut0, axis: "x" });
      logs.push({ key: `br${y.toFixed(2)}`, x: (winCutR + xOut1) / 2, y, z: backZ, len: xOut1 - winCutR, axis: "x" });
    }
    logs.push({
      key: `l${y.toFixed(2)}`,
      x: leftX,
      y,
      z: (zBack + zFront) / 2,
      len: zFront - zBack,
      axis: "z",
    });
  }
  return (
    <group>
      {logs.map((log) => (
        <mesh
          key={log.key}
          position={[log.x, log.y, log.z]}
          rotation={log.axis === "x" ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}
          userData={{ wall: log.axis === "x" ? "back" : "left" }}
          material={side ? [side, cap, cap] : cap}
          castShadow
        >
          <cylinderGeometry args={[r, r, log.len, 16]} />
        </mesh>
      ))}
    </group>
  );
}

function useThrow() {
  return useMemo(
    () =>
      paintTex((ctx, size) => {
        ctx.fillStyle = "#c4845c";
        ctx.fillRect(0, 0, size, size);
        const cell = size / 4;
        ctx.fillStyle = "#f0ddc4";
        for (let i = 0; i < 4; i += 2) ctx.fillRect(0, i * cell, size, cell * 0.62);
        ctx.fillStyle = "#5f88a4";
        for (let i = 0; i < 4; i += 1) ctx.fillRect(i * cell + 6, 0, 10, size);
        ctx.strokeStyle = "#7a3e32";
        ctx.lineWidth = 5;
        for (let i = 1; i < 4; i += 1) {
          ctx.beginPath();
          ctx.moveTo(0, i * cell);
          ctx.lineTo(size, i * cell);
          ctx.stroke();
        }
        ctx.fillStyle = "#3f6e8c";
        for (let y = cell * 0.5; y < size; y += cell) {
          for (let x = cell * 0.5; x < size; x += cell) {
            ctx.beginPath();
            ctx.ellipse(x, y, 9, 5, 0.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }, 128, [1, 1]),
    [],
  );
}

function useThrowShape() {
  return useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      -0.03, 0.012, -0.14,
      -0.03, 0.012, 0.14,
      0.042, 0.012, -0.14,
      0.042, 0.012, 0.14,
      0.078, -0.008, -0.14,
      0.078, -0.008, 0.15,
      0.086, -0.1, -0.12,
      0.086, -0.1, 0.16,
    ]);
    const uvs = new Float32Array([0, 0, 0, 1, 0.34, 0, 0.34, 1, 0.48, 0, 0.48, 1, 1, 0, 1, 1]);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geo.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6, 6, 5, 7]);
    geo.computeVertexNormals();
    return geo;
  }, []);
}

function useGingham() {
  return useMemo(
    () =>
      paintTex((ctx, size) => {
        const cell = size / 8;
        for (let y = 0; y < 8; y += 1) {
          for (let x = 0; x < 8; x += 1) {
            const on = (x + y) % 2 === 0;
            ctx.fillStyle = on ? "#d7ebf6" : "#f7fbfe";
            ctx.fillRect(x * cell, y * cell, cell, cell);
          }
        }
        ctx.strokeStyle = "rgba(94, 156, 191, 0.45)";
        ctx.lineWidth = 2;
        for (let i = 0; i <= 8; i += 1) {
          ctx.beginPath();
          ctx.moveTo(i * cell, 0);
          ctx.lineTo(i * cell, size);
          ctx.moveTo(0, i * cell);
          ctx.lineTo(size, i * cell);
          ctx.stroke();
        }
      }, 128, [1, 1]),
    [],
  );
}

function Sofa() {
  const cloth = useWeave();
  const gingham = useGingham();
  const throwCloth = useThrow();
  const throwShape = useThrowShape();
  const { x, z, w, d, seatH, backH, armW, armH } = SOFA;
  const cushionH = 0.16;
  const baseH = seatH - cushionH;
  const backDepth = 0.22;
  const backZ = -d / 2 + backDepth / 2 + 0.015;
  const backBottom = baseH * 0.72;
  const backTop = seatH + backH;
  const backY = (backBottom + backTop) / 2;
  const cushionFront = d / 2 - 0.05;
  const cushionBack = backZ - 0.02;
  const cushionD = cushionFront - cushionBack;
  const cushionZ = (cushionFront + cushionBack) / 2;
  const armDepth = d * 0.82;
  const armZ = 0.01;
  const askSit = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const store = useCottage.getState();
    store.request("sit");
  };
  return (
    <group position={[x, 0, z]} userData={{ wall: "sofa" }} onClick={askSit}>
      <RoundedBox args={[w, baseH, d]} radius={0.04} smoothness={3} position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial map={cloth ?? undefined} color={SOFA_D} roughness={0.58} sheen={0.55} sheenColor="#f3fbff" sheenRoughness={0.45} />
      </RoundedBox>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`foot${sx}${sz}`} position={[(sx as number) * (w / 2 - 0.1), 0.035, (sz as number) * (d / 2 - 0.08)]} castShadow>
          <cylinderGeometry args={[0.028, 0.034, 0.07, 10]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.62} />
        </mesh>
      ))}
      <RoundedBox
        args={[w - armW * 2 + 0.02, cushionH, cushionD]}
        radius={0.04}
        smoothness={3}
        position={[0, baseH + cushionH / 2, cushionZ]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial map={cloth ?? undefined} color={SOFA_C} roughness={0.55} sheen={0.6} sheenColor="#f4fbff" sheenRoughness={0.4} />
      </RoundedBox>
      <RoundedBox
        args={[w - 0.04, backTop - backBottom, backDepth]}
        radius={0.045}
        smoothness={3}
        position={[0, backY, backZ]}
        castShadow
      >
        <meshPhysicalMaterial map={cloth ?? undefined} color={SOFA_C} roughness={0.55} sheen={0.6} sheenColor="#f4fbff" sheenRoughness={0.4} />
      </RoundedBox>
      <RoundedBox
        args={[armW, armH + 0.08, armDepth]}
        radius={0.035}
        smoothness={2}
        position={[-(w / 2 - armW / 2), baseH + (armH + 0.08) / 2, armZ]}
        castShadow
      >
        <meshPhysicalMaterial map={cloth ?? undefined} color={SOFA_D} roughness={0.58} sheen={0.55} sheenColor="#f3fbff" sheenRoughness={0.45} />
      </RoundedBox>
      <RoundedBox
        args={[armW, armH + 0.08, armDepth]}
        radius={0.035}
        smoothness={2}
        position={[w / 2 - armW / 2, baseH + (armH + 0.08) / 2, armZ]}
        castShadow
      >
        <meshPhysicalMaterial map={cloth ?? undefined} color={SOFA_D} roughness={0.58} sheen={0.55} sheenColor="#f3fbff" sheenRoughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[0.42, 0.34, 0.12]} radius={0.08} smoothness={5} position={[-0.34, seatH + 0.22, backZ + backDepth / 2 + 0.04]} rotation={[-0.38, 0.08, 0.04]}>
        <meshStandardMaterial color="#f6f1e8" roughness={0.72} />
      </RoundedBox>
      <RoundedBox args={[0.42, 0.34, 0.12]} radius={0.08} smoothness={5} position={[0.32, seatH + 0.22, backZ + backDepth / 2 + 0.04]} rotation={[-0.36, -0.06, -0.03]}>
        <meshStandardMaterial map={gingham ?? undefined} color="#ffffff" roughness={0.68} />
      </RoundedBox>
      <mesh geometry={throwShape} position={[w / 2 - armW / 2, baseH + armH + 0.084, armZ]}>
        <meshStandardMaterial map={throwCloth ?? undefined} color="#ffffff" roughness={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Table() {
  const wood = useWood();
  const top = TABLE.h;
  const lx = TABLE.w / 2 - 0.09;
  const lz = TABLE.d / 2 - 0.09;
  return (
    <group position={[TABLE.x, 0, TABLE.z]}>
      <RoundedBox args={[TABLE.w, 0.045, TABLE.d]} radius={0.015} smoothness={3} position={[0, top - 0.02, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={wood ?? undefined} color="#ffffff" roughness={0.62} />
      </RoundedBox>
      <mesh position={[0, top - 0.05, 0]} castShadow>
        <boxGeometry args={[TABLE.w - 0.08, 0.018, TABLE.d - 0.06]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[(sx as number) * lx, (top - 0.07) / 2, (sz as number) * lz]} castShadow>
          <cylinderGeometry args={[0.022, 0.03, top - 0.07, 10]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.68} />
        </mesh>
      ))}
      <group
        position={[-0.16, top + 0.012, 0.02]}
        rotation={[0, 0.2, 0]}
        onClick={(event) => {
          event.stopPropagation();
          useCottage.getState().poke("book");
        }}
      >
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.012, 0.14]} />
          <meshStandardMaterial color="#f4efe4" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.012, 0]} castShadow>
          <boxGeometry args={[0.2, 0.012, 0.14]} />
          <meshStandardMaterial color="#7eafc8" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.28, 0.08, 0.2]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <group
        position={[0.16, top + 0.01, -0.02]}
        onClick={(event) => {
          event.stopPropagation();
          useCottage.getState().poke("cup");
        }}
      >
        <mesh receiveShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.012, 16]} />
          <meshStandardMaterial color="#f7f4ef" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.04, 0]} castShadow>
          <cylinderGeometry args={[0.042, 0.036, 0.06, 16]} />
          <meshStandardMaterial color="#f7f4ef" roughness={0.35} />
        </mesh>
        <mesh position={[0.045, 0.04, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.02, 0.006, 8, 12, Math.PI]} />
          <meshStandardMaterial color="#f7f4ef" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <group
        position={[-0.02, top + 0.01, 0.1]}
        onClick={(event) => {
          event.stopPropagation();
          useCottage.getState().request("carry");
        }}
      >
        <mesh receiveShadow>
          <cylinderGeometry args={[0.062, 0.062, 0.01, 16]} />
          <meshStandardMaterial color="#e7f2f6" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.038, 0]} castShadow>
          <cylinderGeometry args={[0.034, 0.03, 0.055, 14]} />
          <meshStandardMaterial color="#d5ebf4" roughness={0.35} />
        </mesh>
        <mesh position={[-0.04, 0.038, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <torusGeometry args={[0.018, 0.005, 8, 12, Math.PI]} />
          <meshStandardMaterial color="#d5ebf4" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function Shelf() {
  const ask = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    useCottage.getState().request("read");
  };
  const colors = ["#8ebfd4", "#f3e6d0", "#6e9aaf", "#d7ebe4", "#c6b49a", "#9ec4d6"];
  const boards = [0.34, 0.74, 1.14, 1.58];
  return (
    <group position={[SHELF.x, 0, SHELF.z]} userData={{ wall: "shelf" }} onClick={ask}>
      <mesh position={[-SHELF.w / 2 + 0.02, SHELF.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.04, SHELF.h, SHELF.d]} />
        <meshStandardMaterial color={WOOD} roughness={0.78} />
      </mesh>
      <mesh position={[0, SHELF.h / 2, -SHELF.d / 2 + 0.025]} castShadow>
        <boxGeometry args={[SHELF.w, SHELF.h, 0.05]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.78} />
      </mesh>
      <mesh position={[0, SHELF.h / 2, SHELF.d / 2 - 0.025]} castShadow>
        <boxGeometry args={[SHELF.w, SHELF.h, 0.05]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[SHELF.w + 0.02, 0.06, SHELF.d + 0.02]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.75} />
      </mesh>
      <mesh position={[0, SHELF.h + 0.02, 0]} castShadow>
        <boxGeometry args={[SHELF.w + 0.04, 0.04, SHELF.d + 0.02]} />
        <meshStandardMaterial color={WOOD} roughness={0.72} />
      </mesh>
      {boards.map((y) => (
        <mesh key={y} position={[0.02, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[SHELF.w - 0.04, 0.035, SHELF.d - 0.1]} />
          <meshStandardMaterial color={WOOD} roughness={0.76} />
        </mesh>
      ))}
      {boards.slice(0, 3).map((y) => (
        <group key={`books-${y}`} position={[0.02, y + 0.018, 0]}>
          {colors.map((color, i) => (
            <group key={color + i} position={[0.01, 0.13, (i - 2.5) * 0.155]} rotation={[0, (i - 2.5) * 0.04, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.16, 0.26, 0.062]} />
                <meshStandardMaterial color={color} roughness={0.72} />
              </mesh>
              <mesh position={[0.082, 0, 0]}>
                <boxGeometry args={[0.008, 0.24, 0.05]} />
                <meshStandardMaterial color="#f6f1e6" roughness={0.9} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function Easel() {
  const wood = useWood();
  const url = useCottage((s) => s.latestSketch);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useEffect(() => {
    if (!mat.current) return;
    if (!url) {
      mat.current.map = null;
      mat.current.needsUpdate = true;
      return;
    }
    const img = new Image();
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      const prev = mat.current?.map;
      if (mat.current) {
        mat.current.map = tex;
        mat.current.needsUpdate = true;
      }
      prev?.dispose();
    };
    img.src = url;
  }, [url]);
  const ask = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    useCottage.getState().request("paint");
  };
  return (
    <group position={[CHAIR.x, 0, CHAIR.z]} rotation-y={-Math.PI / 2} onClick={ask}>
      <group rotation={[-0.34, 0, 0]}>
        <mesh position={[-0.18, 0.62, 0]} rotation={[0, 0, -0.14]} castShadow>
          <boxGeometry args={[0.04, 1.24, 0.04]} />
          <meshStandardMaterial map={wood ?? undefined} color="#ffffff" roughness={0.7} />
        </mesh>
        <mesh position={[0.18, 0.62, 0]} rotation={[0, 0, 0.14]} castShadow>
          <boxGeometry args={[0.04, 1.24, 0.04]} />
          <meshStandardMaterial map={wood ?? undefined} color="#ffffff" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.05, 0]} castShadow>
          <boxGeometry args={[0.22, 0.025, 0.04]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
        </mesh>
        <group position={[0, 0.72, 0.04]}>
          <mesh castShadow>
            <boxGeometry args={[0.46, 0.52, 0.025]} />
            <meshStandardMaterial color={WOOD} roughness={0.68} />
          </mesh>
          <mesh position={[0, 0, 0.016]}>
            <planeGeometry args={[0.38, 0.44]} />
            <meshStandardMaterial ref={mat} color="#f7f3ea" roughness={0.9} />
          </mesh>
        </group>
        <mesh position={[0, 0.42, 0.05]} castShadow>
          <boxGeometry args={[0.34, 0.02, 0.1]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.68} />
        </mesh>
      </group>
      <mesh position={[0, 0.58, -0.42]} rotation={[0.22, 0, 0]} castShadow>
        <boxGeometry args={[0.035, 1.16, 0.035]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.72} />
      </mesh>
    </group>
  );
}

function Plant() {
  const ask = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    useCottage.getState().request("plant");
  };
  const soilY = 0.3;
  const shoots = [
    { lean: 0.12, yaw: 0.4, len: 0.34, s: 1, ox: 0.02, oz: 0.015 },
    { lean: 0.38, yaw: 1.7, len: 0.26, s: 0.92, ox: 0.03, oz: -0.02 },
    { lean: 0.22, yaw: 3.1, len: 0.3, s: 1.05, ox: -0.025, oz: 0.02 },
    { lean: 0.5, yaw: 4.4, len: 0.22, s: 0.86, ox: -0.02, oz: -0.028 },
    { lean: 0.28, yaw: 5.5, len: 0.28, s: 0.96, ox: 0.01, oz: 0.03 },
  ];
  return (
    <group position={[PLANT.x, 0, PLANT.z]} onClick={ask}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 1.1, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[PLANT.r * 0.78, PLANT.r * 0.92, 0.28, 20]} />
        <meshStandardMaterial color="#f3efe8" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[PLANT.r * 0.96, PLANT.r * 0.96, 0.035, 20]} />
        <meshStandardMaterial color="#f7f4ef" roughness={0.5} />
      </mesh>
      <mesh position={[0, soilY, 0]} receiveShadow>
        <cylinderGeometry args={[PLANT.r * 0.74, PLANT.r * 0.74, 0.02, 16]} />
        <meshStandardMaterial color="#6b5344" roughness={1} />
      </mesh>
      {shoots.map((shoot, i) => (
        <group key={i} position={[shoot.ox, soilY, shoot.oz]} rotation={[shoot.lean, shoot.yaw, 0]}>
          <mesh position={[0, shoot.len / 2, 0]} castShadow>
            <cylinderGeometry args={[0.005, 0.009, shoot.len, 6]} />
            <meshStandardMaterial color="#5d8a62" roughness={0.7} />
          </mesh>
          <mesh position={[0, shoot.len + 0.012, 0]} rotation={[0.95, 0, 0]} scale={[0.1 * shoot.s, 0.022 * shoot.s, 0.062 * shoot.s]} castShadow>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={i % 2 === 0 ? PLANT_C : PLANT_D} roughness={0.62} />
          </mesh>
          <mesh position={[0.03, shoot.len * 0.62, 0]} rotation={[1.15, 0.35, 0.25]} scale={[0.07 * shoot.s, 0.018 * shoot.s, 0.044 * shoot.s]} castShadow>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color="#93bfa4" roughness={0.62} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function TeaTable() {
  const wood = useWood();
  const ask = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    useCottage.getState().request("tea");
  };
  return (
    <group position={[TEA.x, 0, TEA.z]} onClick={ask}>
      <mesh position={[0, TEA.h, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.035, 24]} />
        <meshStandardMaterial map={wood ?? undefined} color="#ffffff" roughness={0.62} />
      </mesh>
      <mesh position={[0, TEA.h - 0.03, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.015, 20]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.12, TEA.h / 2, Math.sin(a) * 0.12]} castShadow>
            <cylinderGeometry args={[0.016, 0.022, TEA.h - 0.04, 8]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
          </mesh>
        );
      })}
      <mesh position={[0.04, TEA.h + 0.012, 0.02]} receiveShadow>
        <cylinderGeometry args={[0.055, 0.055, 0.01, 16]} />
        <meshStandardMaterial color="#f7f4ef" roughness={0.4} />
      </mesh>
      <mesh position={[0.04, TEA.h + 0.045, 0.02]} castShadow>
        <cylinderGeometry args={[0.032, 0.028, 0.05, 14]} />
        <meshStandardMaterial color="#f7f4ef" roughness={0.35} />
      </mesh>
      <mesh position={[-0.08, TEA.h + 0.05, -0.02]} castShadow>
        <sphereGeometry args={[0.045, 14, 12]} />
        <meshStandardMaterial color="#d7e7ef" roughness={0.4} />
      </mesh>
      <mesh position={[-0.03, TEA.h + 0.06, -0.02]} rotation={[0, 0, -0.6]} castShadow>
        <cylinderGeometry args={[0.008, 0.012, 0.05, 8]} />
        <meshStandardMaterial color="#d7e7ef" roughness={0.4} />
      </mesh>
    </group>
  );
}

function FloorLamp() {
  const ask = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const store = useCottage.getState();
    store.toggleLamp();
    store.say(store.lampOn ? "落地灯亮了，角落浅一点。" : "灯先歇着，剩下窗外的蓝。");
  };
  return (
    <group position={[LAMP.x, 0, LAMP.z]} onClick={ask}>
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[LAMP.r, LAMP.r * 1.08, 0.03, 20]} />
        <meshStandardMaterial color="#c5d0d8" metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.03, 16]} />
        <meshStandardMaterial color="#d5dee4" metalness={0.4} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.014, 0.018, 1.28, 10]} />
        <meshStandardMaterial color="#e7eef2" metalness={0.55} roughness={0.28} />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.1, 0.16, 20]} />
        <meshStandardMaterial color="#f7fbfe" emissive="#fff4e2" emissiveIntensity={0.28} roughness={0.45} transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.045, 12, 10]} />
        <meshStandardMaterial color="#fff6e4" emissive="#ffe2b0" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function Hearth() {
  const hearth = useCottage((s) => s.lights.hearth);
  return (
    <group
      position={[HEARTH.x, 0, HEARTH.z]}
      userData={{ wall: "hearth" }}
      onClick={(event) => {
        event.stopPropagation();
        useCottage.getState().poke("hearth");
      }}
    >
      <mesh position={[0, HEARTH.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[HEARTH.w, HEARTH.h, HEARTH.d]} />
        <meshStandardMaterial color="#efe6da" roughness={0.84} />
      </mesh>
      <mesh position={[HEARTH.w / 2 + 0.01, HEARTH.h + 0.02, 0]} castShadow>
        <boxGeometry args={[0.06, 0.04, HEARTH.d + 0.06]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
      <mesh position={[HEARTH.w / 2 - 0.02, HEARTH.h * 0.42, 0]}>
        <boxGeometry args={[0.08, 0.28, HEARTH.d * 0.62]} />
        <meshStandardMaterial color="#3a3330" roughness={0.95} />
      </mesh>
      <mesh position={[HEARTH.w / 2 + 0.01, 0.12, 0.04]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.16, 8]} />
        <meshStandardMaterial color="#6b4a32" roughness={0.85} />
      </mesh>
      <mesh position={[HEARTH.w / 2 + 0.02, HEARTH.h * 0.46, 0]}>
        <boxGeometry args={[0.02, 0.16, HEARTH.d * 0.36]} />
        <meshStandardMaterial color="#ffb088" emissive="#ff8a4a" emissiveIntensity={0.2 + hearth * 1.4} />
      </mesh>
    </group>
  );
}

function ExitMat() {
  const coir = useCoir();
  const ask = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    useCottage.getState().request("out");
  };
  return (
    <group position={[EXIT.x, 0.02, EXIT.z]} onClick={ask}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[EXIT.w, EXIT.d]} />
        <meshStandardMaterial map={coir ?? undefined} color="#ffffff" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[EXIT.w, 0.08, EXIT.d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Rug() {
  const rug = useRug();
  return (
    <mesh rotation-x={-Math.PI / 2} position={[SOFA.x + 0.15, 0.008, -1.35]} receiveShadow>
      <planeGeometry args={[3.2, 2.15]} />
      <meshStandardMaterial map={rug ?? undefined} color="#ffffff" roughness={0.9} />
    </mesh>
  );
}

function Pendant() {
  const pendant = useCottage((s) => s.lights.pendant);
  return (
    <group position={[TABLE.x, CEILING_Y - 0.02, TABLE.z]}>
      <mesh>
        <cylinderGeometry args={[0.16, 0.16, 0.03, 24]} />
        <meshStandardMaterial color="#f7fbfd" roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.07, 0]}>
        <cylinderGeometry args={[0.2, 0.08, 0.08, 24]} />
        <meshStandardMaterial color="#f4fbfe" emissive="#d7f1ff" emissiveIntensity={0.2 + pendant * 1.1} roughness={0.28} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function Exterior() {
  const grass = useGrass();
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.04, 0]} receiveShadow>
        <circleGeometry args={[48, 72]} />
        <meshStandardMaterial map={grass ?? undefined} color="#ffffff" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 0.2]} receiveShadow>
        <circleGeometry args={[11, 48]} />
        <meshStandardMaterial map={grass ?? undefined} color="#d8f0c4" roughness={1} />
      </mesh>
      <Bush x={-4.2} z={1.6} s={0.7} />
      <Bush x={4.4} z={0.6} s={0.85} />
      <Bush x={-3.8} z={4.2} s={0.55} />
      <Bush x={3.2} z={5.4} s={0.45} />
      <Tree x={-9.5} z={7.2} s={1.35} />
      <Tree x={11} z={5.5} s={1.6} />
      <Tree x={8.2} z={-7.4} s={1.2} />
      <Tree x={-12} z={-4.5} s={1.45} />
    </group>
  );
}

function Bush({ x, z, s }: { x: number; z: number; s: number }) {
  return (
    <mesh position={[x, 0.28 * s, z]} castShadow>
      <sphereGeometry args={[0.42 * s, 14, 12]} />
      <meshStandardMaterial color="#6eae64" roughness={0.9} />
    </mesh>
  );
}

function Tree({ x, z, s }: { x: number; z: number; s: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.5 * s, 0]} castShadow>
        <cylinderGeometry args={[0.08 * s, 0.12 * s, 1 * s, 8]} />
        <meshStandardMaterial color="#c4a27a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.15 * s, 0]} castShadow>
        <sphereGeometry args={[0.55 * s, 16, 12]} />
        <meshStandardMaterial color="#4f9650" roughness={0.82} />
      </mesh>
      <mesh position={[0.28 * s, 1.42 * s, 0.1 * s]} castShadow>
        <sphereGeometry args={[0.36 * s, 14, 10]} />
        <meshStandardMaterial color="#6eae62" roughness={0.84} />
      </mesh>
      <mesh position={[-0.22 * s, 1.38 * s, -0.12 * s]} castShadow>
        <sphereGeometry args={[0.32 * s, 12, 10]} />
        <meshStandardMaterial color="#7cbc70" roughness={0.84} />
      </mesh>
      <mesh position={[0.04 * s, 1.62 * s, -0.02 * s]} castShadow>
        <sphereGeometry args={[0.24 * s, 12, 10]} />
        <meshStandardMaterial color="#8ec97a" roughness={0.84} />
      </mesh>
    </group>
  );
}

function SketchFrame() {
  const doodle = useDoodle();
  const z = INNER.minZ + 0.05;
  return (
    <group position={[-1.55, 1.35, z]} userData={{ wall: "art" }}>
      <mesh position={[0, 0, -0.01]} castShadow>
        <boxGeometry args={[0.78, 0.62, 0.03]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[0.64, 0.48]} />
        <meshStandardMaterial map={doodle ?? undefined} color="#f6f1e6" roughness={0.85} />
      </mesh>
    </group>
  );
}

function tweet(slot: { current: AudioContext | null }) {
  const Ctx = window.AudioContext;
  if (!Ctx) return;
  try {
    if (!slot.current) slot.current = new Ctx();
    const ctx = slot.current;
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1700, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2500, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    /* the chirp stays visual if audio is blocked */
  }
}

function Bird() {
  const plumage = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ff4d6d", roughness: 0.45 }), []);
  const wingLMat = useRef<THREE.MeshStandardMaterial>(null);
  const wingRMat = useRef<THREE.MeshStandardMaterial>(null);
  const group = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Group>(null);
  const wingR = useRef<THREE.Group>(null);
  const note = useRef<THREE.Group>(null);
  const audio = useRef<AudioContext | null>(null);
  const flight = useRef({
    token: 0,
    mode: "away" as "away" | "in" | "perch" | "out",
    t: 0,
    chirp: 0,
    chirps: 0,
    note: 0,
    perchX: 0.72,
    fromX: 2.2,
    fromY: 2.6,
    fromZ: -4.8,
    tint: "#ff4d6d",
  });
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const f = flight.current;
    const store = useCottage.getState();
    if (store.birdToken !== f.token) {
      f.token = store.birdToken;
      if (f.token === 0) return;
      f.mode = "in";
      f.t = 0;
      f.chirp = 1.35;
      f.chirps = 0;
      f.note = 0;
      f.perchX = store.birdX;
      f.fromX = store.birdX + 1.7;
      f.fromY = 2.55;
      f.fromZ = -4.7;
      const colors = ["#ff4d6d", "#ffd23a", "#3ddeb0", "#ff8a3d", "#6cb6ff"];
      const color = colors[f.token % colors.length] ?? "#ff4d6d";
      f.tint = color;
    }
    plumage.color.set(f.tint);
    wingLMat.current?.color.set(f.tint);
    wingRMat.current?.color.set(f.tint);
    if (!group.current || f.mode === "away") {
      if (group.current) group.current.visible = false;
      return;
    }
    group.current.visible = true;
    f.t += dt;
    const perchY = 0.52;
    const perchZ = -2.6;
    let x = f.perchX;
    let y = perchY;
    let z = perchZ;
    let flap = 2;
    if (f.mode === "in") {
      const u = Math.min(1, f.t / 1.25);
      const e = u * u * (3 - 2 * u);
      x = f.fromX + (f.perchX - f.fromX) * e;
      y = f.fromY + (perchY - f.fromY) * e + Math.sin(u * Math.PI) * 0.35;
      z = f.fromZ + (perchZ - f.fromZ) * e;
      flap = 18;
      if (u >= 1) {
        f.mode = "perch";
        f.t = 0;
        store.setBirdVisit("here");
        f.chirps = 1;
        f.note = 0.7;
        tweet(audio);
      }
    } else if (f.mode === "perch") {
      y = perchY + Math.sin(f.t * 2.2) * 0.006;
      flap = 1.2;
      if (f.chirps < 2) {
        f.chirp -= dt;
        if (f.chirp <= 0) {
          f.chirps = 2;
          f.note = 0.7;
          tweet(audio);
        }
      }
      f.note = Math.max(0, f.note - dt);
      if (f.t > 6.4) {
        f.mode = "out";
        f.t = 0;
        f.fromX = x;
        f.fromY = y;
        f.fromZ = z;
        store.setBirdVisit("none");
      }
    } else {
      const u = Math.min(1, f.t / 1.15);
      const e = u * u;
      x = f.fromX + (f.perchX - 1.8 - f.fromX) * e;
      y = f.fromY + (2.7 - f.fromY) * e;
      z = f.fromZ + (-5.1 - f.fromZ) * e;
      flap = 16;
      if (u >= 1) f.mode = "away";
    }
    group.current.position.set(x, y, z);
    group.current.rotation.y = f.mode === "out" ? Math.PI : 0;
    const swing = Math.sin(f.t * flap) * (f.mode === "perch" ? 0.08 : 0.9);
    if (wingL.current) wingL.current.rotation.z = 0.4 + swing;
    if (wingR.current) wingR.current.rotation.z = -0.4 - swing;
    if (note.current) {
      note.current.visible = f.note > 0;
      note.current.position.y = 0.28 + Math.sin(f.t * 5) * 0.06;
    }
  });
  return (
    <group ref={group} visible={false}>
      <mesh castShadow scale={[0.062, 0.055, 0.12]} material={plumage}>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>
      <mesh position={[0, 0.04, 0.09]} castShadow material={plumage}>
        <sphereGeometry args={[0.04, 12, 10]} />
      </mesh>
      <mesh position={[0, 0.05, 0.125]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.016, 0.05, 8]} />
        <meshStandardMaterial color="#ffb703" roughness={0.45} />
      </mesh>
      <mesh position={[0.018, 0.07, 0.1]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial color="#1b2430" />
      </mesh>
      <mesh position={[-0.018, 0.07, 0.1]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial color="#1b2430" />
      </mesh>
      <group ref={wingL} position={[-0.048, 0.01, 0]}>
        <mesh rotation={[0.2, 0.3, 0]} scale={[0.075, 0.018, 0.048]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial ref={wingLMat} color="#ff4d6d" roughness={0.5} />
        </mesh>
      </group>
      <group ref={wingR} position={[0.048, 0.01, 0]}>
        <mesh rotation={[0.2, -0.3, 0]} scale={[0.075, 0.018, 0.048]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial ref={wingRMat} color="#ff8fa3" roughness={0.5} />
        </mesh>
      </group>
      <mesh position={[0, 0.01, -0.11]} rotation={[0.7, 0, 0]} scale={[0.045, 0.014, 0.055]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#ffb703" roughness={0.5} />
      </mesh>
      <group ref={note} position={[0.1, 0.26, 0.02]} visible={false}>
        <mesh position={[0, 0.04, 0]}>
          <sphereGeometry args={[0.016, 8, 8]} />
          <meshStandardMaterial color="#1b2430" />
        </mesh>
        <mesh position={[0.01, 0.01, 0]}>
          <boxGeometry args={[0.006, 0.045, 0.006]} />
          <meshStandardMaterial color="#1b2430" />
        </mesh>
      </group>
    </group>
  );
}

export function Room() {
  return (
    <group>
      <WoodFloor />
      <Walls />
      <Rug />
      <ExitMat />
      <Sofa />
      <Table />
      <Shelf />
      <Easel />
      <Plant />
      <TeaTable />
      <FloorLamp />
      <Hearth />
      <Pendant />
      <SketchFrame />
      <Bird />
      <Exterior />
    </group>
  );
}
