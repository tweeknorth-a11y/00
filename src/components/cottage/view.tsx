import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { HEARTH, LAMP, TABLE, pushOutOfSolids, routeProblems } from "@/lib/layout";
import { mixHex, useCottage } from "@/lib/cottage-store";
import { Room } from "@/components/cottage/room";
import { Yaoyao } from "@/components/cottage/yaoyao";
import { Hud } from "@/components/cottage/hud";
import { Sketchbook } from "@/components/cottage/sketchbook";

type PoseSnap = { x: number; y: number; z: number; yaw: number; lie?: number; lift?: number };

function framePose(snap: PoseSnap, target: THREE.Vector3, pos: THREE.Vector3) {
  const lie = Math.min(1, Math.max(0, snap.lie ?? 0));
  const lift = Math.min(1, Math.max(0, snap.lift ?? 0));
  const faceX = Math.sin(snap.yaw);
  const faceZ = Math.cos(snap.yaw);
  const standY = snap.y + lift * 0.92 + 0.46;
  const headX = -faceX;
  const headZ = -faceZ;
  target.set(snap.x + headX * 0.62 * lie, standY * (1 - lie) + 0.3 * lie, snap.z + headZ * 0.62 * lie);
  pos.set(
    snap.x + faceX * 3.15 * (1 - lie) + faceX * 0.72 * lie,
    (standY + 0.48) * (1 - lie) + 5.4 * lie,
    snap.z + faceZ * 3.15 * (1 - lie) + faceZ * 0.72 * lie,
  );
}

function focusPull(camera: THREE.Camera) {
  const aspect = (camera as THREE.PerspectiveCamera).aspect || 1;
  if (aspect >= 0.95) return 1;
  return 1.48 + (0.95 - aspect) * 0.7;
}

const HOME_POS = new THREE.Vector3(2.2, 1.85, 4.9);
const HOME_TARGET = new THREE.Vector3(-0.15, 1.02, -0.4);

function placeCamera(camera: THREE.Camera, shot: "home" | "full", snap: PoseSnap | undefined, zoom: number, aim: THREE.Vector3, goal: THREE.Vector3) {
  if (shot === "home" || !snap) {
    goal.copy(HOME_POS).sub(HOME_TARGET).multiplyScalar(focusPull(camera)).add(HOME_TARGET);
    aim.copy(HOME_TARGET);
    return;
  }
  framePose(snap, aim, goal);
  goal.sub(aim).multiplyScalar(zoom * focusPull(camera)).add(aim);
}

function readSnap() {
  return (
    window as unknown as {
      __cottage?: { snapshot: () => PoseSnap };
    }
  ).__cottage?.snapshot();
}

export function CottageView() {
  const sketchOpen = useCottage((s) => s.sketchOpen);

  function closeSketch() {
    useCottage.getState().setSketchOpen(false);
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <div className="absolute inset-0 touch-none">
        <Canvas
          shadows
          dpr={[1, 1.6]}
          style={{ touchAction: "none" }}
          camera={{ position: [HOME_POS.x, HOME_POS.y, HOME_POS.z], fov: 36, near: 0.12, far: 400 }}
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl, scene }) => {
            gl.domElement.style.touchAction = "none";
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            const sky = new THREE.Color("#b9e7ff");
            gl.setClearColor(sky, 1);
            scene.background = sky;
          }}
        >
          <Scene />
        </Canvas>
      </div>
      <Hud onDraw={() => useCottage.getState().request("paint")} />
      <Sketchbook open={sketchOpen} onClose={closeSketch} />
    </main>
  );
}

function Scene() {
  useEffect(() => {
    const problems = routeProblems();
    if (problems.length) console.error(problems.join("; "));
    (window as unknown as { __cottageReady?: boolean }).__cottageReady = true;
  }, []);

  return (
    <>
      <Mood />
      <Fill />
      <Sun />
      <InteriorLights />
      <Room />
      <Yaoyao />
      <ContactShadows position={[0, 0.002, -0.2]} opacity={0.28} scale={14} blur={2.2} far={3.2} color="#6f93a8" frames={1} />
      <CameraRig />
    </>
  );
}

function Fill() {
  const sun = useCottage((s) => s.lights.sun);
  return (
    <>
      <hemisphereLight args={["#e7f6ff", "#e7d8c6", 0.72 * sun]} />
      <ambientLight intensity={0.28 * sun} color="#f4fbff" />
    </>
  );
}

function Mood() {
  const warmth = useCottage((s) => s.lights.warmth);
  const { scene, gl, camera } = useThree();
  useEffect(() => {
    const color = new THREE.Color("#7ec8f2");
    color.lerp(new THREE.Color("#ffe3c2"), Math.min(0.2, warmth * 0.15));
    scene.background = color;
    scene.fog = new THREE.Fog(new THREE.Color("#d7eefb"), 70, 220);
    gl.setClearColor(color, 1);
    camera.far = 400;
    camera.updateProjectionMatrix();
  }, [warmth, scene, gl, camera]);
  return (
    <mesh frustumCulled={false} renderOrder={-1} scale={90}>
      <sphereGeometry args={[1, 32, 20]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
        fog={false}
        vertexShader={`
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vPos;
          void main() {
            float h = normalize(vPos).y;
            vec3 zenith = vec3(0.36, 0.68, 0.98);
            vec3 horizon = vec3(0.80, 0.92, 0.99);
            float t = smoothstep(-0.05, 0.55, h);
            gl_FragColor = vec4(mix(horizon, zenith, t), 1.0);
          }
        `}
      />
    </mesh>
  );
}

function Sun() {
  const sun = useCottage((s) => s.lights.sun);
  const warmth = useCottage((s) => s.lights.warmth);
  return (
    <directionalLight
      position={[5.2, 8.4, 4.2]}
      intensity={2.6 * sun}
      color={mixHex("#d7ecff", "#ffe0c2", warmth)}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-near={1}
      shadow-camera-far={24}
      shadow-camera-left={-8}
      shadow-camera-right={8}
      shadow-camera-top={8}
      shadow-camera-bottom={-8}
      shadow-bias={-0.0004}
      shadow-normalBias={0.04}
    />
  );
}

function InteriorLights() {
  const lights = useCottage((s) => s.lights);
  const lampOn = useCottage((s) => s.lampOn);
  const bulb = mixHex("#e7f6ff", "#ffc48a", lights.warmth);
  return (
    <>
      <pointLight position={[TABLE.x, 2.45, TABLE.z]} intensity={18 * lights.pendant} distance={7} decay={2} color={bulb} />
      <pointLight
        position={[LAMP.x, 1.35, LAMP.z]}
        intensity={22 * (lampOn ? lights.lamp : 0)}
        distance={6.5}
        decay={2}
        color={bulb}
      />
      <pointLight position={[HEARTH.x + 0.2, 0.4, HEARTH.z]} intensity={16 * lights.hearth} distance={4.5} decay={2} color="#ffb088" />
    </>
  );
}

function CameraRig() {
  const token = useCottage((s) => s.camToken);
  const shot = useCottage((s) => s.camShot);
  const { camera, controls, gl } = useThree();
  const released = useRef(true);
  const dragging = useRef(false);
  const moved = useRef(false);
  const pointer = useRef({ x: 0, y: 0 });
  const goal = useRef(new THREE.Vector3());
  const aim = useRef(new THREE.Vector3());
  const zoom = useRef(1);
  const keys = useRef(new Set<string>());
  const panRight = useRef(new THREE.Vector3());
  const panForward = useRef(new THREE.Vector3());
  const panMove = useRef(new THREE.Vector3());

  useEffect(() => {
    released.current = shot !== "full";
    zoom.current = 1;
  }, [token, shot]);

  useEffect(() => {
    const el = gl.domElement;
    const panKey = (code: string) =>
      code === "KeyW" ||
      code === "KeyA" ||
      code === "KeyS" ||
      code === "KeyD" ||
      code === "ArrowUp" ||
      code === "ArrowDown" ||
      code === "ArrowLeft" ||
      code === "ArrowRight";
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!panKey(event.code)) return;
      keys.current.add(event.code);
      released.current = true;
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys.current.delete(event.code);
    };
    const onBlur = () => keys.current.clear();
    const onDown = (event: PointerEvent) => {
      dragging.current = true;
      moved.current = false;
      pointer.current.x = event.clientX;
      pointer.current.y = event.clientY;
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const dx = event.clientX - pointer.current.x;
      const dy = event.clientY - pointer.current.y;
      pointer.current.x = event.clientX;
      pointer.current.y = event.clientY;
      if (Math.hypot(dx, dy) > 3 || Math.abs(event.movementX) + Math.abs(event.movementY) > 2) {
        moved.current = true;
        released.current = true;
      }
    };
    const onUp = () => {
      if (dragging.current && moved.current) released.current = true;
      dragging.current = false;
    };
    const onTouch = (event: TouchEvent) => {
      if (event.touches.length >= 2) released.current = true;
    };
    const onWheel = (event: WheelEvent) => {
      if (released.current) return;
      event.preventDefault();
      event.stopPropagation();
      const next = zoom.current * (event.deltaY > 0 ? 1.08 : 0.92);
      zoom.current = Math.min(2.6, Math.max(0.42, next));
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("touchstart", onTouch, { passive: true });
    el.addEventListener("touchmove", onTouch, { passive: true });
    el.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("touchstart", onTouch);
      el.removeEventListener("touchmove", onTouch);
      el.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("pointerup", onUp);
    };
  }, [camera, controls, gl]);

  useEffect(() => {
    const orbit = controls as { target?: THREE.Vector3; update?: () => void } | null;
    const snap = readSnap();
    placeCamera(camera, shot, snap, zoom.current, aim.current, goal.current);
    orbit?.target?.copy(aim.current);
    camera.position.copy(goal.current);
    orbit?.update?.();
  }, [token, shot, camera, controls]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (shot === "full" && !released.current && !dragging.current) {
      const orbit = controls as { target?: THREE.Vector3; update?: () => void } | null;
      const snap = readSnap();
      if (orbit?.target && snap) {
        const blend = 1 - Math.exp(-7 * dt);
        framePose(snap, aim.current, goal.current);
        goal.current.sub(aim.current).multiplyScalar(zoom.current * focusPull(camera)).add(aim.current);
        orbit.target.lerp(aim.current, blend);
        camera.position.lerp(goal.current, blend);
        orbit.update?.();
      }
    }
    const [x, y, z] = pushOutOfSolids(camera.position.x, camera.position.y, camera.position.z);
    if (shot !== "full" || released.current) camera.position.set(x, y, z);
    const orbit = controls as { target?: THREE.Vector3; update?: () => void } | null;
    const held = keys.current;
    let forward = 0;
    let strafe = 0;
    if (held.has("KeyW") || held.has("ArrowUp")) forward += 1;
    if (held.has("KeyS") || held.has("ArrowDown")) forward -= 1;
    if (held.has("KeyD") || held.has("ArrowRight")) strafe += 1;
    if (held.has("KeyA") || held.has("ArrowLeft")) strafe -= 1;
    if ((forward || strafe) && orbit?.target) {
      camera.getWorldDirection(panForward.current);
      panForward.current.y = 0;
      if (panForward.current.lengthSq() < 1e-6) panForward.current.set(0, 0, -1);
      panForward.current.normalize();
      panRight.current.crossVectors(panForward.current, camera.up).normalize();
      const speed = 1.8 * dt;
      panMove.current.set(0, 0, 0).addScaledVector(panForward.current, forward * speed).addScaledVector(panRight.current, strafe * speed);
      camera.position.add(panMove.current);
      orbit.target.add(panMove.current);
      orbit.update?.();
    }
  });
  return (
    <OrbitControls
      makeDefault
      enablePan
      enableDamping
      dampingFactor={0.08}
      minDistance={1.15}
      maxDistance={18}
      minPolarAngle={0.05}
      maxPolarAngle={1.38}
      target={[HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z]}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
    />
  );
}
