import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CEILING_Y, HEARTH, TABLE, TEA, type SpotId, SPOTS, SIT, blocked, lineClear, slide } from "@/lib/layout";
import { type Command, type Notice, useCottage } from "@/lib/cottage-store";

const THIGH = 0.15;
const SHIN = 0.13;
const FOOT = 0.05;
const LEG = THIGH + SHIN;
const STAND_Y = LEG + FOOT + 0.012;
const SIT_Y = SIT.y;
const HEAD_R = 0.2;
const HEAD_SCALE = 1.22;
const TORSO_Y = 0.11;
const HEAD_LOCAL = 0.34;
const HEAD_Y = TORSO_Y + HEAD_LOCAL;
const HAIR_TOP = HEAD_Y + HEAD_R * HEAD_SCALE * 0.9;
const LIFT_H = 0.92;

const SKIN = "#f6e3d6";
const HAIR = "#6d86ae";
const HAIR_D = "#56749a";
const BODY = "#8ec9de";
const EYE = "#1b2430";

const LINK: Record<SpotId, SpotId[]> = {
  center: ["window", "plant", "shelf", "tea", "lane", "easel", "door"],
  window: ["center", "easel", "lane"],
  plant: ["center"],
  shelf: ["center"],
  tea: ["center"],
  lane: ["center", "approach", "window"],
  approach: ["lane"],
  sit: ["approach"],
  easel: ["center", "window"],
  door: ["center", "lawn"],
  lawn: ["door"],
};

const WANDER: SpotId[] = ["center", "window", "plant", "shelf", "tea"];

type After = null | "sit" | "read" | "tea" | "plant" | "paint" | "nap" | "bird" | "carry" | "sill";
type Phase = "idle" | "walk" | "turn" | "hop" | "fold" | "board" | "seated" | "unboard" | "unfold" | "lie" | "rise";
type Emote = null | "pat" | "lift" | "greet" | "watch";
type BlinkMode = "none" | "both" | "left" | "right";

type Anim = {
  phase: Phase;
  spot: SpotId;
  queue: SpotId[];
  after: After;
  x: number;
  z: number;
  yaw: number;
  y: number;
  pose: number;
  wait: number;
  emote: Emote;
  emoteT: number;
  lift: number;
  walkPhase: number;
  moving: boolean;
  blinkT: number;
  nextBlink: number;
  blinkMode: BlinkMode;
  hold: "none" | "book" | "cup" | "palette";
  faceYaw: number;
  expression: number;
  stuck: number;
  patVis: number;
  hop: number;
  fidget: "none" | "kick" | "sway";
  fidgetT: number;
  lie: number;
  peer: number;
  lookDown: number;
  napT: number;
  then: Command | null;
  glanceYaw: number;
  glanceT: number;
  glance: number;
  sipT: number;
  aim: { x: number; z: number; yaw: number } | null;
};

function findPath(from: SpotId, to: SpotId): SpotId[] {
  if (from === to) return [];
  const queue: SpotId[][] = [[from]];
  const seen = new Set<SpotId>([from]);
  while (queue.length) {
    const path = queue.shift();
    if (!path) break;
    const last = path[path.length - 1];
    if (!last) break;
    for (const nextId of LINK[last]) {
      if (seen.has(nextId)) continue;
      const next = [...path, nextId];
      if (nextId === to) return next.slice(1);
      seen.add(nextId);
      queue.push(next);
    }
  }
  return [to];
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function dampAngle(current: number, target: number, lambda: number, dt: number) {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0]!;
}

function mutter(text: string, footer = true) {
  useCottage.getState().mutter(text, footer);
}

function glanceAt(a: Anim, notice: Notice) {
  const where =
    notice === "hearth"
      ? { x: HEARTH.x, z: HEARTH.z }
      : notice === "book"
        ? { x: TABLE.x - 0.16, z: TABLE.z + 0.02 }
        : { x: TABLE.x + 0.16, z: TABLE.z - 0.02 };
  a.glanceYaw = Math.atan2(where.x - a.x, where.z - a.z);
  a.glanceT = 3.6;
  const lines =
    notice === "hearth"
      ? [
          "火倒是热。比有些人靠得住。",
          "壁炉空着也像样。不必每件事都点着。",
          "暖是暖。我又不是为了谁才看它。",
          "木头烧得安静。这一点，我认可。",
          "看一眼就好。火又不欠我一句话。",
          "站得挺直。比屋里有些打算稳。",
        ]
      : notice === "book"
        ? [
            "桌上这本，倒是没人翻。跟书架那些一样省心。",
            "封面还算干净。里面就不一定了。",
            "放在这儿当摆设。也是一种诚实。",
            "书不说话。这桌子因此清净许多。",
            "薄薄的一本。刚好，我也不想读太久。",
            "蓝色封面。跟这屋子一个脾气。",
          ]
        : [
            "杯子空着。跟有些招呼一样，只有样子。",
            "白杯子倒是干净。里面装过什么，它不说。",
            "看它做什么。又不会自己满上。",
            "杯子小，影子倒是老实。",
            "放得端正。比有些话端正。",
            "茶渍都没有。也是，没人真的用过。",
          ];
  mutter(pick(lines), false);
}

function doodleRand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type ThoughtKind = "doodle" | "sofa" | "plant" | "bird" | "lamp" | "cup" | "sketch";

type Thought = {
  id: number;
  seed: number;
  side: -1 | 1;
  kind: ThoughtKind;
  sketch: string | null;
  life: number;
  fading: boolean;
  x: number;
  y: number;
  z: number;
  phase: number;
};

function ThoughtGlyph({ thought }: { thought: Thought }) {
  if (thought.kind === "sketch" && thought.sketch) {
    return <img src={thought.sketch} alt="" className="size-7 rounded-sm object-cover" />;
  }
  if (thought.kind === "sofa") {
    return (
      <svg viewBox="0 0 64 64" className="size-7" aria-hidden>
        <path d="M10 30h44v16H10z" fill="#8ec9de" stroke="#5f86a8" strokeWidth="2.4" />
        <path d="M8 26c0-6 6-8 10-8h28c4 0 10 2 10 8v6H8z" fill="#b9dff2" stroke="#5f86a8" strokeWidth="2.4" />
        <path d="M18 38h8M38 38h8" stroke="#f7f4ef" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (thought.kind === "plant") {
    return (
      <svg viewBox="0 0 64 64" className="size-7" aria-hidden>
        <path d="M24 40h16l-2 12H26z" fill="#f3efe8" stroke="#8a7568" strokeWidth="2" />
        <path d="M32 40c-2-10 8-16 6-24M32 40c2-12-10-16-6-26M32 40c8-4 14-2 12-12" fill="none" stroke="#6f9a72" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="26" cy="18" r="4" fill="#c7e3c4" stroke="#6f9a72" strokeWidth="1.6" />
        <circle cx="40" cy="22" r="3.4" fill="#93bfa4" stroke="#6f9a72" strokeWidth="1.6" />
      </svg>
    );
  }
  if (thought.kind === "bird") {
    return (
      <svg viewBox="0 0 64 64" className="size-7" aria-hidden>
        <ellipse cx="30" cy="36" rx="14" ry="9" fill="#f2c14e" stroke="#c9843a" strokeWidth="2" />
        <circle cx="44" cy="28" r="7" fill="#f2c14e" stroke="#c9843a" strokeWidth="2" />
        <circle cx="46" cy="27" r="1.4" fill="#1b2430" />
        <path d="M50 29l8 2-8 3" fill="#e07a7a" />
        <path d="M16 34c-6-6-4 6 2 4" fill="none" stroke="#5f86a8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (thought.kind === "lamp") {
    return (
      <svg viewBox="0 0 64 64" className="size-7" aria-hidden>
        <path d="M22 18h20l-4 16H26z" fill="#f6e2a8" stroke="#c9843a" strokeWidth="2" />
        <path d="M32 34v14M24 50h16" stroke="#8a7568" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (thought.kind === "cup") {
    return (
      <svg viewBox="0 0 64 64" className="size-7" aria-hidden>
        <path d="M18 24h24l-2 18H20z" fill="#f7f4ef" stroke="#8a7568" strokeWidth="2" />
        <path d="M42 28c6 0 8 4 6 8s-6 6-8 4" fill="none" stroke="#8a7568" strokeWidth="2" />
        <path d="M28 18c2-4 2-4 4 0M36 16c2-4 2-4 4 0" fill="none" stroke="#b9dff2" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return <AbstractDoodle seed={thought.seed} />;
}

function AbstractDoodle({ seed }: { seed: number }) {
  const rnd = doodleRand(seed);
  const ink = ["#5f86a8", "#c46b5a", "#c9843a", "#6f9a72", "#d27b8a", "#7aa7c4"][Math.floor(rnd() * 6)] ?? "#5f86a8";
  const fill = ["#b9dff2", "#f3c3c0", "#f6e2a8", "#c7e3c4", "#f6c9d4", "#d5ebf6"][Math.floor(rnd() * 6)] ?? "#b9dff2";
  const kind = Math.floor(rnd() * 5);
  const wobble = (cx: number, cy: number, rx: number, ry: number) => {
    let d = "";
    for (let i = 0; i <= 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      const j = 0.82 + rnd() * 0.36;
      const x = cx + Math.cos(a) * rx * j;
      const y = cy + Math.sin(a) * ry * j;
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    return `${d}Z`;
  };
  const dots = Array.from({ length: 4 }, () => ({
    x: 18 + rnd() * 68,
    y: 18 + rnd() * 68,
    r: 1.6 + rnd() * 2.2,
  }));
  return (
    <svg viewBox="0 0 104 104" className="size-8" aria-hidden>
      {kind === 0 ? (
        <>
          <path d={wobble(52, 52, 28, 24)} fill={fill} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
          <path d={wobble(52, 52, 14, 12)} fill="none" stroke={ink} strokeWidth="2" />
          <path d="M52 40c6 4 8 10 4 16" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
        </>
      ) : null}
      {kind === 1 ? (
        <>
          <path d={wobble(40, 48, 18, 16)} fill={fill} stroke={ink} strokeWidth="2.2" />
          <path d={wobble(64, 44, 16, 18)} fill="#fff8ee" stroke={ink} strokeWidth="2.2" />
          <path d={wobble(54, 64, 20, 12)} fill={fill} fillOpacity="0.7" stroke={ink} strokeWidth="2.2" />
        </>
      ) : null}
      {kind === 2 ? (
        <>
          <path d="M34 58c2-16 22-22 28-8 4 8-2 16-10 16" fill={fill} stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M62 30l3 8 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" fill="#f6e2a8" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
        </>
      ) : null}
      {kind === 3 ? (
        <path
          d={`M18 ${40 + rnd() * 10} C30 20, 40 70, 52 42 S78 18, 90 ${36 + rnd() * 16}`}
          fill="none"
          stroke={ink}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      ) : null}
      {kind === 4 ? (
        <>
          <path d={wobble(52, 50, 26, 22)} fill="none" stroke={ink} strokeWidth="2.3" />
          <path d={wobble(52, 50, 16, 13)} fill={fill} stroke={ink} strokeWidth="2" />
          <circle cx="52" cy="50" r="3.2" fill={ink} />
        </>
      ) : null}
      {kind === 3
        ? dots.map((dot) => <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r={dot.r} fill={fill} stroke={ink} strokeWidth="1.2" />)
        : null}
    </svg>
  );
}

function presenceFor(a: Anim): string {
  if (a.emote === "pat") return "被摸了摸头";
  if (a.emote === "lift") return "被举得高高的";
  if (a.emote === "greet") return "在打招呼";
  if (a.emote === "watch") return "看着画板";
  if (a.phase === "turn") return "在沙发前";
  if (a.phase === "hop" || a.phase === "seated" || a.phase === "board" || a.phase === "fold") return "坐在沙发上";
  if (a.hold === "book") return "在书架前";
  if (a.hold === "cup" && a.spot === "window" && !a.moving) return "在窗边喝茶";
  if (a.hold === "cup" && a.moving) return "端着茶去窗边";
  if (a.hold === "cup") return "端着茶";
  if (a.hold === "palette") return "站在画架前";
  if (a.spot === "plant" && !a.moving) return "在绿植旁";
  if (a.spot === "window" && !a.moving) return "在窗边";
  if (a.phase === "lie" || a.phase === "rise" || a.spot === "lawn") return a.phase === "lie" ? "躺在草地上" : "在草地上";
  if (a.moving || a.phase === "walk" || a.phase === "unboard") {
    if (a.after === "bird") return "跑去看小鸟";
    return a.after === "nap" ? "走向门口" : "在屋里走";
  }
  return "安静地待着";
}

function nearestSide(px: number, pz: number, box: { x: number; z: number; w: number; d: number }) {
  const gap = 0.4;
  const sides = [
    { x: box.x, z: box.z + box.d / 2 + gap, yaw: Math.PI },
    { x: box.x, z: box.z - box.d / 2 - gap, yaw: 0 },
    { x: box.x + box.w / 2 + gap, z: box.z, yaw: -Math.PI / 2 },
    { x: box.x - box.w / 2 - gap, z: box.z, yaw: Math.PI / 2 },
  ].filter((side) => !blocked(side.x, side.z));
  sides.sort((a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz));
  return sides[0] ?? { x: box.x, z: box.z + box.d / 2 + gap, yaw: Math.PI };
}

function approachTable(a: Anim, box: { x: number; z: number; w: number; d: number }, after: After) {
  const side = nearestSide(a.x, a.z, box);
  a.after = after;
  a.hold = "none";
  a.emote = null;
  a.queue = [];
  a.aim = side;
  const seated = a.phase === "seated" || a.phase === "board" || a.phase === "fold" || a.spot === "sit";
  if (seated) {
    a.phase = a.phase === "fold" ? "unfold" : "unboard";
    return;
  }
  if (Math.hypot(side.x - a.x, side.z - a.z) < 0.08) {
    a.faceYaw = side.yaw;
    a.aim = null;
    a.phase = "idle";
    arriveAct(a);
    return;
  }
  a.phase = "walk";
}

function plan(a: Anim, target: SpotId, after: After) {
  a.after = after;
  a.hold = "none";
  a.aim = null;
  const goal = SPOTS[target];
  const straight = (x: number, z: number, queue: SpotId[]) =>
    goal && lineClear(x, z, goal.x, goal.z) ? [target] : queue;
  const seated = a.phase === "seated" || a.phase === "board" || a.spot === "sit";
  if (seated || a.phase === "fold") {
    if (target === "sit") {
      a.phase = a.phase === "fold" || a.phase === "board" ? a.phase : "seated";
      a.wait = 18;
      return;
    }
    a.queue = straight(SPOTS.approach.x, SPOTS.approach.z, findPath("approach", target));
    a.phase = a.phase === "fold" ? "unfold" : "unboard";
    return;
  }
  const from: SpotId = a.spot === "sit" ? "approach" : a.spot;
  if (target === "sit") {
    a.queue = findPath(from, "approach");
    a.after = "sit";
    a.phase = a.queue.length ? "walk" : "turn";
    return;
  }
  a.queue = straight(a.x, a.z, findPath(from, target));
  a.phase = a.queue.length ? "walk" : "idle";
  if (!a.queue.length && a.after) arriveAct(a);
}

function onCommand(a: Anim, command: Command) {
  if (a.phase === "lie" || a.phase === "rise") {
    if (command === "pat" || command === "greet") {
      a.phase = "lie";
      a.then = null;
      a.wait = Math.max(a.wait, 5);
    } else if (command !== "out") {
      a.phase = "rise";
      a.then = command;
      return;
    }
  }
  const say = useCottage.getState().say;
  if (command === "pat") {
    a.emote = "pat";
    a.emoteT = 0;
    a.blinkMode = Math.random() < 0.5 ? "left" : "right";
    a.blinkT = 0;
    mutter(pick([
      "头发被摸顺了。手倒是比嘴老实。",
      "嗯。这个高度刚好，人就不一定。",
      "再摸一下也可以。我又没说喜欢。",
      "轻一点。帽子又不是把手。",
      "摸到了。满意了就行。",
      "可以。别摸成在跟我道歉。",
    ]), false);
    return;
  }
  if (command === "lift") {
    a.emote = "lift";
    a.emoteT = 0;
    mutter(pick([
      "看到屋梁了。放下来的时候，手稳一点。",
      "再高一点点。也就这时候比较有用。",
      "悬着倒是凉快。别晃，帽子不跟你开玩笑。",
      "好高。地板看起来倒是很老实。",
      "举可以。别举出一副很了不起的样子。",
      "放轻一点。我又不是行李。",
    ]), false);
    return;
  }
  if (command === "greet") {
    a.emote = "greet";
    a.emoteT = 0;
    mutter(pick([
      "你来啦。今天的蓝倒是干净，比有些人省心。",
      "我在呢。门开着，倒也不必每次都来确认。",
      "打招呼可以。再近一点，我就当没看见了。",
      "来了就来了。也不必站得这么正式。",
      "看见你了。反应可以慢半拍，我又不跑。",
      "嗯。算打过招呼了。剩下的，自己看着办。",
    ]), false);
    return;
  }
  if (command === "watch") {
    a.emote = "watch";
    a.emoteT = 0;
    return;
  }
  if (command === "sit") {
    say(pick(["那我去沙发上坐一会儿。", "沙发还在。总比干站着等谁强。", "坐一会儿。靠背比有些人可靠。"]));
    plan(a, "sit", "sit");
    return;
  }
  if (command === "wander") {
    say(pick(["我随便走走。", "走走也好。这屋子又不会自己逛。", "随便逛逛。也没人规定我必须停着。"]));
    const choices = WANDER.filter((id) => id !== a.spot);
    plan(a, pick(choices), null);
    return;
  }
  if (command === "read") {
    say(pick(["我去书架那边看看。", "书还在。比有些话经得起再看一遍。", "去翻一页。安静的东西比较好相处。"]));
    plan(a, "shelf", "read");
    return;
  }
  if (command === "tea") {
    say(pick(["去倒一杯温的。", "茶还记得温柔。人就难说了。", "喝一口。总比干等着谁开口强。"]));
    approachTable(a, TEA, "tea");
    return;
  }
  if (command === "carry") {
    say(pick(["这杯我端去窗边。", "茶要换个地方喝。窗边清净些。", "端走这一杯。别的杯子先留着。"]));
    approachTable(a, TABLE, "carry");
    return;
  }
  if (command === "plant") {
    say(pick(["叶子今天朝窗户偏。", "去看看那盆绿的。它倒是长得懂事。", "植物不说话。这一点，我很欣赏。"]));
    plan(a, "plant", "plant");
    return;
  }
  if (command === "paint") {
    say(pick(["我去画架前面站好。", "去画画。纸比人好打发。", "画架还空着。正好，我也是。"]));
    plan(a, "easel", "paint");
    return;
  }
  if (command === "out") {
    if (a.phase === "lie") {
      a.wait = 8;
      mutter(pick([
        "我还想再躺一会儿。",
        "草地还没把我请起来。急什么。",
        "再躺躺。那些事又不长脚。",
        "眼睛还没睁利索。让我把这口懒叹完。",
      ]), false);
      return;
    }
    mutter(pick([
      "我去门口的草地躺一会儿。",
      "出去躺躺。地板今天不太讨人喜欢。",
      "草地还空着。我去给它添个麻烦。",
      "去外面歇一会儿。屋里的东西，又不急着找我。",
    ]), false);
    plan(a, "lawn", "nap");
    return;
  }
  if (command === "bird") {
    a.emote = null;
    a.peer = 0;
    say(pick(["那边有鸟叫。", "窗上落了一只小鸟。", "又来一只。倒是会挑地方。", "鸟比有些人准时。我去看看。"]));
    const bird = useCottage.getState();
    if (a.spot === "window" && Math.hypot(bird.birdX - a.x, bird.birdZ - a.z) < 1.8 && a.phase !== "lie" && a.phase !== "rise") {
      a.phase = "idle";
      a.queue = [];
      a.after = null;
      a.faceYaw = Math.atan2(bird.birdX - a.x, bird.birdZ - a.z);
      a.wait = 1.4;
      a.spot = "window";
      return;
    }
    plan(a, "window", "bird");
  }
}

function arriveAct(a: Anim) {
  const say = useCottage.getState().say;
  const after = a.after;
  a.after = null;
  a.queue = [];
  if (after === "read") {
    a.hold = "book";
    a.phase = "idle";
    a.wait = 7;
    a.faceYaw = SPOTS.shelf.yaw;
    mutter(pick([
      "这一页倒是写得漂亮。可惜认真看的人不多。",
      "书还挺安静。比有些人省心。",
      "字排得整整齐齐。人也该学学。",
      "翻开就好。它又不跟我争谁先开口。",
      "这一本倒是沉得住气。我喜欢。",
      "看完了也不必合上。让它自己晾着。",
    ]));
    return;
  }
  if (after === "tea") {
    a.hold = "cup";
    a.phase = "idle";
    a.wait = 6;
    a.faceYaw = SPOTS.tea.yaw;
    mutter(pick([
      "茶是温的。也就只有茶还记得温柔。",
      "喝一口吧。总比干等着谁开口强。",
      "热气倒是诚实。人就含糊多了。",
      "杯子小，倒是装得下我这一会儿。",
      "温的就好。太烫的东西，我向来不碰。",
      "喝完了。谢倒是不必说给杯子听。",
    ]));
    return;
  }
  if (after === "carry") {
    a.hold = "cup";
    a.after = "sill";
    a.queue = [];
    const win = SPOTS.window;
    mutter(pick([
      "杯子拿好了。窗边应该还空着。",
      "温的。走路就别洒，怪可惜的。",
      "这一杯跟我走。桌子上那只，自己待着。",
    ]), false);
    if (lineClear(a.x, a.z, win.x, win.z)) {
      a.aim = { x: win.x, z: win.z, yaw: win.yaw };
      a.phase = "walk";
    } else {
      a.aim = null;
      a.queue = findPath(a.spot, "window");
      a.phase = a.queue.length ? "walk" : "idle";
      if (!a.queue.length) arriveAct(a);
    }
    return;
  }
  if (after === "sill") {
    a.hold = "cup";
    a.phase = "idle";
    a.spot = "window";
    a.wait = 16;
    a.faceYaw = SPOTS.window.yaw;
    a.sipT = 0;
    mutter(pick([
      "窗边的风刚好。茶也没凉得太快。",
      "端到这儿了。比坐在桌子边上像样。",
      "外面很蓝。杯子里倒是还温着。",
      "喝一口。窗框比人安静。",
    ]), false);
    return;
  }
  if (after === "sit") {
    a.phase = "turn";
    a.faceYaw = 0;
    a.spot = "approach";
    return;
  }
  if (after === "plant") {
    a.phase = "idle";
    a.wait = 4.5;
    a.faceYaw = SPOTS.plant.yaw;
    mutter(pick([
      "叶子长得这么精神。倒是比屋里有些东西懂事。",
      "朝窗户偏呢。也是，屋里没什么值得看的。",
      "绿得很认真。比有些人的表情用功。",
      "别长太快。我还没想好要夸你。",
      "土是干的。水我可以给，话就省着。",
      "站得倒直。这屋子里，难得。",
    ]));
    return;
  }
  if (after === "paint") {
    a.hold = "palette";
    a.phase = "idle";
    a.wait = 8;
    a.faceYaw = SPOTS.easel.yaw;
    a.spot = "easel";
    window.setTimeout(() => {
      if (a.hold !== "palette" || a.spot !== "easel") return;
      const store = useCottage.getState();
      store.setSketchOpen(true);
      store.say("想画什么？写一个词就好。");
    }, 700);
    return;
  }
  if (after === "nap") {
    a.phase = "lie";
    a.spot = "lawn";
    a.faceYaw = SPOTS.lawn.yaw;
    a.wait = 24 + Math.random() * 16;
    a.blinkMode = "none";
    a.blinkT = 0;
    a.nextBlink = 2.2 + Math.random() * 2.4;
    a.napT = 0;
    mutter(pick([
      "草地倒是软。比地板有礼貌多了。",
      "躺一会儿。那些家具又不急着找我。",
      "天这么蓝。蓝得倒是比谁都坦荡。",
      "草尖挠得轻轻的。比有些手懂分寸。",
      "就这样摊着。世界暂时不归我管。",
      "风有一点。刚好，不必有人来吹。",
    ]), false);
    return;
  }
  if (after === "bird") {
    a.phase = "idle";
    a.spot = "window";
    a.wait = 1.6;
    const bird = useCottage.getState();
    a.faceYaw = Math.atan2(bird.birdX - a.x, bird.birdZ - a.z);
    mutter(pick([
      "叫得这么响，是怕我没注意到你吗。",
      "会挑窗框。眼光倒比有些人好。",
      "羽毛倒是鲜。站稳了再叫第二声。",
      "看我做什么。我又不会跟你飞。",
      "小东西。胆子比身子大。",
      "歇一会儿就走吧。窗框不是你的座位。",
    ]));
    return;
  }
  a.phase = "idle";
  a.wait = 3.2 + Math.random() * 3.2;
  if (Math.random() < 0.4) {
    mutter(pick([
      "走走也好。总比干站着等谁强。",
      "这屋子倒是敞亮。人就不一定了。",
      "随便逛逛。也没人规定我必须停在原地。",
      "地板还算平整。这一点，我认可。",
      "走到哪儿算哪儿。目的地向来不太诚实。",
      "腿还听使唤。比有些打算可靠。",
    ]));
  }
}

function step(a: Anim, dt: number, cam: THREE.Vector3) {
  const pondering = useCottage.getState().pondering;
  if (!pondering) {
    const command = useCottage.getState().consumeCommand();
    if (command) onCommand(a, command);
    const notice = useCottage.getState().consumeNotice();
    if (notice) glanceAt(a, notice);
  }

  if (a.emote === "watch" && !useCottage.getState().sketchOpen) a.emote = null;
  if (a.emote === "pat" && a.emoteT > 2.15) a.emote = null;
  if (a.emote === "greet" && a.emoteT > 2.05) a.emote = null;
  if (a.emote === "lift" && a.emoteT > 3.7) a.emote = null;
  if (a.emote) a.emoteT += dt;

  const liftTarget = a.emote === "lift" && a.emoteT < 2.7 ? 1 : 0;
  a.lift = damp(a.lift, liftTarget, 3.2, dt);
  const overSeat = a.phase === "seated" || a.phase === "board" || a.phase === "fold" || a.phase === "unboard";
  const outdoors = a.phase === "lie" || a.phase === "rise";
  if (a.phase !== "hop" && !outdoors) {
    const wantedPose = a.emote === "lift" && !overSeat ? 0.12 : overSeat ? 1 : 0;
    a.pose = damp(a.pose, wantedPose, 4.5, dt);
    const yTarget = overSeat || (a.emote === "lift" && overSeat && a.pose > 0.6) ? SIT_Y : STAND_Y;
    a.y = damp(a.y, yTarget, 4.5, dt);
  }

  const emoteLocks = a.emote === "pat" || a.emote === "lift" || a.emote === "greet" || a.emote === "watch";
  a.moving = false;

  if (pondering) {
    if (a.phase === "seated") a.faceYaw = 0;
    if (a.phase === "lie") a.faceYaw = SPOTS.lawn.yaw;
  } else if (!emoteLocks && a.phase === "walk" && (a.queue.length || a.aim)) {
    const aimed = a.aim;
    const dest = aimed ?? SPOTS[a.queue[0]!];
    const dx = dest.x - a.x;
    const dz = dest.z - a.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.045) {
      a.x = dest.x;
      a.z = dest.z;
      a.stuck = 0;
      if (aimed) {
        a.faceYaw = aimed.yaw;
        a.aim = null;
        if (!a.queue.length) arriveAct(a);
      } else {
        a.spot = dest.id;
        a.faceYaw = dest.yaw;
        a.queue.shift();
        if (!a.queue.length) arriveAct(a);
      }
    } else {
      const stride = Math.min(dist, (a.after === "bird" ? 1.85 : 0.86) * dt);
      const nx = a.x + (dx / dist) * stride;
      const nz = a.z + (dz / dist) * stride;
      const slid = slide(a.x, a.z, nx, nz, false);
      const moved = Math.hypot(slid.x - a.x, slid.z - a.z);
      a.x = slid.x;
      a.z = slid.z;
      a.moving = moved > 0.001;
      if (a.moving) {
        const bird = a.after === "bird" ? useCottage.getState() : null;
        const aim = bird ? Math.atan2(bird.birdX - a.x, bird.birdZ - a.z) : Math.atan2(dx, dz);
        a.yaw = dampAngle(a.yaw, dist < 0.9 && bird ? aim : Math.atan2(dx, dz), 8, dt);
        a.walkPhase += dt * (a.after === "bird" ? 13.5 : 8.2);
        a.stuck = 0;
      } else {
        a.stuck += dt;
        if (a.stuck > 1.4) {
          a.stuck = 0;
          if (a.aim) {
            if (dist < 0.7) {
              a.aim = null;
              arriveAct(a);
            }
          } else {
            const goal = a.queue[a.queue.length - 1] ?? "center";
            a.queue = findPath(a.spot, goal);
            if (!a.queue.length && a.after) arriveAct(a);
          }
        }
      }
    }
  } else if (!emoteLocks && (a.phase === "board" || a.phase === "unboard")) {
    const dest = a.phase === "board" ? SPOTS.sit : SPOTS.approach;
    const dx = dest.x - a.x;
    const dz = dest.z - a.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.04) {
      a.x = dest.x;
      a.z = dest.z;
      if (a.phase === "board") {
        a.spot = "sit";
        a.phase = "seated";
        a.faceYaw = 0;
        a.wait = 7 + Math.random() * 5;
        if (Math.random() < 0.7) mutter(pick([
          "沙发刚好托住我。比空着手的人有用。",
          "坐稳了。这靠背倒是比谁都靠得住。",
          "软是软。坐下去，它也不抱怨。",
          "这个位置刚好。再往里，就显得我很急。",
          "靠一会儿。靠背比回话来得快。",
          "坐下了。谁也别催我起来。",
        ]));
      } else {
        a.spot = "approach";
        a.phase = "unfold";
      }
    } else {
      const stride = Math.min(dist, 0.55 * dt);
      const nx = a.x + (dx / dist) * stride;
      const nz = a.z + (dz / dist) * stride;
      const slid = slide(a.x, a.z, nx, nz, true);
      a.x = slid.x;
      a.z = slid.z;
      a.moving = true;
      a.yaw = dampAngle(a.yaw, a.phase === "board" ? Math.PI : 0, 6, dt);
    }
  } else if (!emoteLocks && a.phase === "turn") {
    a.faceYaw = 0;
    a.moving = false;
    const gap = Math.atan2(Math.sin(-a.yaw), Math.cos(-a.yaw));
    a.yaw += Math.sign(gap) * Math.min(Math.abs(gap), 2.6 * dt);
    if (Math.abs(gap) < 0.08) {
      a.yaw = 0;
      a.phase = "hop";
      a.hop = 0;
    }
  } else if (!emoteLocks && a.phase === "hop") {
    a.moving = true;
    a.faceYaw = 0;
    a.yaw = 0;
    a.hop += dt / 0.72;
    const t = Math.min(1, a.hop);
    const ease = t * t * (3 - 2 * t);
    const from = SPOTS.approach;
    a.x = from.x + (SIT.x - from.x) * ease;
    a.z = from.z + (SIT.z - from.z) * ease;
    a.y = STAND_Y + (SIT_Y - STAND_Y) * ease + Math.sin(t * Math.PI) * 0.42;
    a.pose = t < 0.62 ? Math.sin((t / 0.62) * Math.PI) * 0.42 : 0.42 + ((t - 0.62) / 0.38) * 0.58;
    if (t >= 1) {
      a.x = SIT.x;
      a.z = SIT.z;
      a.y = SIT_Y;
      a.pose = 1;
      a.phase = "seated";
      a.spot = "sit";
      a.moving = false;
      a.wait = 18 + Math.random() * 10;
      a.fidget = "none";
      a.fidgetT = 0;
      if (Math.random() < 0.8) mutter(pick([
        "跳上来了。这沙发比某些人可靠。",
        "软是软。就是没人陪着，略显遗憾。",
        "落稳了。下次还是这么跳，比较干脆。",
        "坐进来了。外面那些事，先放着。",
        "垫子记住我了。人就不一定。",
        "这个角度刚好能看见门口。谁来，我先看见。",
      ]));
    }
  } else if (!emoteLocks && a.phase === "fold") {
    a.faceYaw = Math.PI;
    if (a.pose > 0.93 && Math.abs(a.y - SIT_Y) < 0.03) a.phase = "board";
  } else if (!emoteLocks && a.phase === "unfold") {
    if (a.pose < 0.08) {
      a.phase = a.queue.length || a.aim ? "walk" : "idle";
      if (!a.queue.length && !a.aim) a.wait = 1.2;
    }
  } else if (!emoteLocks && a.phase === "idle") {
    if (a.hold === "palette" || useCottage.getState().sketchOpen) {
      if (a.spot === "easel") a.faceYaw = SPOTS.easel.yaw;
      if (useCottage.getState().sketchOpen) a.wait = 2.4;
      else {
        a.wait -= dt;
        if (a.wait <= 0) a.hold = "none";
      }
      return;
    }
    if (useCottage.getState().birdVisit !== "none" && a.spot === "window") {
      const bird = useCottage.getState();
      a.faceYaw = Math.atan2(bird.birdX - a.x, bird.birdZ - a.z);
      a.wait = Math.max(a.wait, 1.2);
    } else {
      a.wait -= dt;
      if (a.hold !== "none" && a.wait <= 0) a.hold = "none";
      if (a.wait <= 0) {
        const roll = Math.random();
        if (a.spot !== "lawn" && roll < 0.18) plan(a, "lawn", "nap");
        else if (roll < 0.48) plan(a, "sit", "sit");
        else plan(a, pick(WANDER.filter((id) => id !== a.spot)), null);
      }
    }
  } else if (a.phase === "lie") {
    a.faceYaw = SPOTS.lawn.yaw;
    if (!emoteLocks) {
      a.napT += dt;
      a.wait -= dt;
      if (a.wait <= 0 && a.lie > 0.92) a.phase = "rise";
    }
    const sat = Math.min(1, a.napT / 0.72);
    const laid = Math.min(1, Math.max(0, (a.napT - 0.78) / 1.05));
    a.pose = damp(a.pose, sat, 7, dt);
    a.lie = damp(a.lie, laid, 4.6, dt);
    a.y = damp(a.y, STAND_Y + (0.2 - STAND_Y) * sat + (0.16 - 0.2) * laid, 5, dt);
  } else if (a.phase === "rise") {
    a.lie = damp(a.lie, 0, 3.4, dt);
    a.pose = damp(a.pose, 0, 3.4, dt);
    a.y = damp(a.y, STAND_Y, 3.4, dt);
    if (a.lie < 0.04) {
      a.lie = 0;
      a.y = STAND_Y;
      a.phase = "idle";
      a.wait = 0.8;
      const next = a.then;
      a.then = null;
      if (next) onCommand(a, next);
    }
  } else if (!emoteLocks && a.phase === "seated") {
    a.faceYaw = 0;
    a.fidgetT += dt;
    if (a.fidget === "none" && a.fidgetT > 2.8 && Math.random() < dt * 0.28) {
      a.fidget = Math.random() < 0.55 ? "kick" : "sway";
      a.fidgetT = 0;
    }
    if (a.fidget !== "none" && a.fidgetT > 2.8) {
      a.fidget = "none";
      a.fidgetT = 0;
    }
    a.wait -= dt;
    if (a.wait <= 0) {
      const next = pick(WANDER);
      a.queue = findPath("approach", next);
      a.phase = "unboard";
      a.after = null;
    }
  }

  const watchingBird =
    !a.moving && a.spot === "window" && (a.after === "bird" || useCottage.getState().birdVisit !== "none");
  const watchingPlant = !a.moving && a.phase === "idle" && a.spot === "plant";
  const bird = useCottage.getState();
  const birdDist = Math.hypot(bird.birdX - a.x, bird.birdZ - a.z);
  const rawDown = watchingBird ? Math.atan2(a.y + 0.78 - bird.birdY, Math.max(0.35, birdDist)) : 0;
  const lookDown = watchingBird ? Math.min(0.2, rawDown * 0.4) : watchingPlant ? 0.14 : 0;
  a.lookDown = damp(a.lookDown, lookDown, 5, dt);
  a.peer = damp(a.peer, watchingBird || watchingPlant ? 1 : 0, 4.2, dt);
  const look = emoteLocks && !watchingBird && a.phase !== "lie" ? Math.atan2(cam.x - a.x, cam.z - a.z) : a.moving ? a.yaw : a.faceYaw;
  if (!a.moving) a.yaw = dampAngle(a.yaw, look, emoteLocks ? 7 : 4, dt);
  a.glanceT = Math.max(0, a.glanceT - dt);
  const glanceWant =
    a.glanceT > 0
      ? Math.max(-1.15, Math.min(1.15, Math.atan2(Math.sin(a.glanceYaw - a.yaw), Math.cos(a.glanceYaw - a.yaw))))
      : 0;
  a.glance = damp(a.glance, glanceWant, 7, dt);

  a.expression = damp(a.expression, a.emote === "pat" || a.emote === "lift" || a.emote === "greet" ? 1 : 0, 6, dt);
  a.patVis = damp(a.patVis, a.emote === "pat" ? 1 : 0, 8, dt);
  a.blinkT += dt;
  const napping = a.phase === "lie" && a.lie > 0.72 && a.emote !== "pat" && a.emote !== "greet";
  if (napping) {
    const rest = 2.6;
    if (a.blinkMode === "both") {
      if (a.blinkT > rest) {
        a.blinkMode = "none";
        a.blinkT = 0;
        a.nextBlink = 2.4 + Math.random() * 3.2;
      }
    } else if (a.blinkT > a.nextBlink) {
      a.blinkT = 0;
      a.blinkMode = "both";
    }
  } else if (a.blinkMode !== "none") {
    const hold = a.blinkMode === "both" ? 0.16 : 0.34;
    if (a.blinkT > hold) {
      a.blinkMode = "none";
      a.blinkT = 0;
      a.nextBlink = 2.2 + Math.random() * 3.2;
    }
  } else if (a.blinkT > a.nextBlink) {
    a.blinkT = 0;
    a.blinkMode = "both";
  }

  if (a.hold === "cup" && a.spot === "window" && !a.moving && a.phase === "idle" && a.sipT < 24) a.sipT += dt;

  const maxHip = CEILING_Y - HAIR_TOP - 0.12;
  if (a.y + a.lift * LIFT_H > maxHip) a.lift = Math.max(0, (maxHip - a.y) / LIFT_H);
  useCottage.getState().setPresence(presenceFor(a));
}

function heartGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.2);
  shape.bezierCurveTo(0, 0.45, -0.45, 0.42, -0.45, 0.12);
  shape.bezierCurveTo(-0.45, -0.18, 0, -0.28, 0, -0.5);
  shape.bezierCurveTo(0, -0.28, 0.45, -0.18, 0.45, 0.12);
  shape.bezierCurveTo(0.45, 0.42, 0, 0.45, 0, 0.2);
  return new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false, curveSegments: 8 });
}

export function Yaoyao() {
  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const thighL = useRef<THREE.Group>(null);
  const thighR = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Group>(null);
  const eyeR = useRef<THREE.Group>(null);
  const book = useRef<THREE.Group>(null);
  const cup = useRef<THREE.Group>(null);
  const palette = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const bubbleAnchor = useRef<THREE.Group>(null);
  const bubbleSpot = useRef(new THREE.Vector3());
  const bubbleHat = useRef(new THREE.Vector3());
  const bubbleQuat = useRef(new THREE.Quaternion());
  const bubble = useCottage((s) => s.bubble);
  const pondering = useCottage((s) => s.pondering);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const thoughtsRef = useRef<Thought[]>([]);
  const thoughtClock = useRef({ t: 0.8, next: 2.4, seq: 1, age: 0 });
  const thoughtA = useRef<THREE.Group>(null);
  const thoughtB = useRef<THREE.Group>(null);
  const thoughtEls = useRef<(HTMLDivElement | null)[]>([null, null]);
  const thoughtRight = useRef(new THREE.Vector3());
  const heartA = useRef<THREE.Mesh>(null);
  const heartB = useRef<THREE.Mesh>(null);
  const heartC = useRef<THREE.Mesh>(null);
  const anim = useRef<Anim>({
    phase: "idle",
    spot: "center",
    queue: [],
    after: null,
    x: SPOTS.center.x,
    z: SPOTS.center.z,
    yaw: SPOTS.center.yaw,
    y: STAND_Y,
    pose: 0,
    wait: 2.2,
    emote: null,
    emoteT: 0,
    lift: 0,
    walkPhase: 0,
    moving: false,
    blinkT: 0,
    nextBlink: 2.2,
    blinkMode: "none",
    hold: "none",
    faceYaw: SPOTS.center.yaw,
    expression: 0,
    stuck: 0,
    patVis: 0,
    hop: 0,
    fidget: "none",
    fidgetT: 0,
    lie: 0,
    peer: 0,
    lookDown: 0,
    napT: 0,
    then: null,
    glanceYaw: 0,
    glanceT: 0,
    glance: 0,
    sipT: 99,
    aim: null,
  });
  const heartGeo = useMemo(() => heartGeometry(), []);
  const { camera } = useThree();

  useEffect(() => {
    const api = {
      request: (command: Command) => useCottage.getState().request(command),
      snapshot: () => ({ ...anim.current }),
    };
    (window as unknown as { __cottage?: typeof api }).__cottage = api;
    return () => {
      delete (window as unknown as { __cottage?: typeof api }).__cottage;
    };
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const a = anim.current;
    step(a, dt, camera.position);
    const hipY = a.y + a.lift * LIFT_H;
    if (root.current) {
      root.current.rotation.order = "YXZ";
      root.current.position.set(a.x, hipY, a.z);
      root.current.rotation.y = a.yaw;
      root.current.rotation.x = (-Math.PI / 2) * a.lie;
      root.current.rotation.z = 0;
    }
    if (bubbleAnchor.current && head.current) {
      root.current?.updateMatrixWorld(true);
      head.current.getWorldPosition(bubbleSpot.current);
      head.current.getWorldQuaternion(bubbleQuat.current);
      bubbleHat.current.set(0, 1, 0).applyQuaternion(bubbleQuat.current);
      const lieT = a.lie;
      bubbleAnchor.current.position.copy(bubbleSpot.current).addScaledVector(bubbleHat.current, 1.15 * lieT);
      bubbleAnchor.current.position.y += 0.74 * (1 - lieT) + 0.28 * lieT;
    }
    const speaking = Boolean(useCottage.getState().bubble) || useCottage.getState().pondering;
    const dreaming = !speaking && (a.phase === "seated" || (a.phase === "lie" && a.lie > 0.82));
    const clock = thoughtClock.current;
    clock.age += dt;
    let list = thoughtsRef.current
      .map((item) => ({ ...item, life: item.life - dt }))
      .filter((item) => item.life > 0);
    let changed = list.length !== thoughtsRef.current.length;
    if (!dreaming) {
      clock.t = 0;
      clock.next = 2.2;
      list = list.map((item) => {
        if (item.fading) return item;
        changed = true;
        return { ...item, fading: true, life: Math.min(item.life, 0.45) };
      });
    } else {
      clock.t += dt;
      if (clock.t > clock.next) {
        if (list.length >= 2) {
          const oldest = list[0];
          if (oldest && !oldest.fading) {
            list = [{ ...oldest, fading: true, life: Math.min(oldest.life, 0.6) }, ...list.slice(1)];
            changed = true;
          }
        } else {
          clock.t = 0;
          clock.next = 3.4 + Math.random() * 2.6;
          const sketch = useCottage.getState().latestSketch;
          const pool: ThoughtKind[] = ["doodle", "doodle", "sofa", "plant", "bird", "lamp", "cup"];
          if (sketch) pool.push("sketch");
          const kind = pool[Math.floor(Math.random() * pool.length)] ?? "doodle";
          const side: -1 | 1 = list.some((item) => item.side < 0) ? 1 : -1;
          const right = thoughtRight.current.set(1, 0, 0).applyQuaternion(bubbleQuat.current);
          right.y = 0;
          if (right.lengthSq() < 0.0001) right.set(1, 0, 0);
          right.normalize();
          const head = bubbleSpot.current;
          list = [
            ...list,
            {
              id: clock.seq,
              seed: Math.floor(Math.random() * 100000),
              side,
              kind,
              sketch,
              life: 6.5 + Math.random() * 2.2,
              fading: false,
              x: head.x + right.x * side * 0.42,
              y: head.y + 0.16,
              z: head.z + right.z * side * 0.42,
              phase: Math.random() * Math.PI * 2,
            },
          ];
          clock.seq += 1;
          changed = true;
        }
      }
    }
    thoughtsRef.current = list;
    if (changed) setThoughts(list);
    [thoughtA, thoughtB].forEach((slot, index) => {
      const group = slot.current;
      const item = list[index];
      if (!group || !item) return;
      const bob = Math.sin(clock.age * 1.1 + item.phase) * 0.07;
      const drift = Math.cos(clock.age * 0.5 + item.phase) * 0.04;
      group.position.set(item.x + drift, item.y + bob, item.z);
      const el = thoughtEls.current[index];
      if (!el) return;
      const fade = item.fading || item.life < 0.7 ? Math.max(0, Math.min(1, item.life / 0.7)) : 1;
      el.style.opacity = String(fade);
    });
    if (shadow.current) {
      shadow.current.position.set(a.x, 0.008, a.z);
      const s = 0.22 * (1 - a.lift * 0.45);
      shadow.current.scale.set(s, s, s);
      const mat = shadow.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.22 * (1 - a.lift * 0.7);
    }
    const swing = a.moving && a.phase !== "hop" ? Math.sin(a.walkPhase) : 0;
    const sit = a.pose;
    const flail = a.emote === "lift" ? a.lift : 0;
    const ft = a.emoteT;
    const mix = (speed: number, phase: number) =>
      Math.sin(ft * speed + phase) * 0.65 + Math.sin(ft * speed * 1.7 + phase * 1.8) * 0.35;
    const legFidget = a.phase === "seated" && a.fidget === "kick" ? Math.sin(a.fidgetT * 7) * 0.38 : 0;
    if (thighL.current) {
      thighL.current.rotation.x = -0.5 * swing * (1 - sit) - 0.8 * sit + legFidget + flail * mix(7.2, 0.4) * 0.34;
      thighL.current.rotation.z = flail * mix(5.2, 1.1) * 0.18;
    }
    if (thighR.current) {
      thighR.current.rotation.x = 0.5 * swing * (1 - sit) - 0.8 * sit - legFidget * 0.35 + flail * mix(6.4, 2.2) * 0.34;
      thighR.current.rotation.z = flail * mix(5.6, 0.2) * -0.18;
    }
    const breathe = 1 + Math.sin(performance.now() * 0.0016) * 0.012;
    if (torso.current) {
      torso.current.scale.y = breathe;
      torso.current.rotation.x = sit * 0.08 + a.peer * 0.42;
      torso.current.rotation.z = a.phase === "seated" && a.fidget === "sway" ? Math.sin(a.fidgetT * 2.4) * 0.1 : flail * mix(4.4, 0.5) * 0.06;
    }
    const sipPulse = (start: number) => {
      const u = a.sipT - start;
      if (u < 0 || u > 1.9) return 0;
      const raw = u < 0.45 ? u / 0.45 : u < 1.15 ? 1 : Math.max(0, 1 - (u - 1.15) / 0.75);
      return raw * raw * (3 - 2 * raw);
    };
    const sip = Math.max(sipPulse(0.6), sipPulse(8.2));
    const gazing = a.hold === "cup" && a.spot === "window" && !a.moving && a.phase === "idle" ? 1 : 0;
    if (armL.current) {
      armL.current.rotation.x = 0.45 * swing * (1 - sit) - 0.3 * sit + flail * mix(8.1, 0.7) * 0.4 - sip * 1.45;
      armL.current.rotation.z = 0.18 + flail * (0.62 + mix(6.1, 1.5) * 0.3) - sip * 0.42;
    }
    if (armR.current) {
      const wave = a.emote === "greet" || a.emote === "pat" ? Math.sin(a.emoteT * 10) * 0.32 : 0;
      const greet = a.emote === "greet" ? 1 : 0;
      armR.current.rotation.x = -0.45 * swing * (1 - sit) - 0.25 * sit - greet * 0.12 + flail * mix(7.5, 2.5) * 0.4;
      armR.current.rotation.z = -0.18 - greet * 1.38 + flail * (-0.62 + mix(6.7, 0.9) * 0.3) + (a.emote === "greet" ? wave : 0);
    }
    const lie = a.lie;
    const sprawl = a.phase === "lie" ? Math.min(lie, 1 - Math.min(1, Math.max(0, a.napT - 3.2) / 2.8)) : 0;
    const flap = Math.sin(a.napT * 3.3);
    const flap2 = Math.sin(a.napT * 2.5 + 0.9);
    if (lie > 0.001) {
      if (thighL.current) thighL.current.rotation.x = thighL.current.rotation.x * (1 - lie) + lie * 0.35 * (1 - sprawl);
      if (thighR.current) thighR.current.rotation.x = thighR.current.rotation.x * (1 - lie) + lie * 0.2 * (1 - sprawl);
      if (armL.current) {
        armL.current.rotation.x = armL.current.rotation.x * (1 - lie) + lie * 0.55 * (1 - sprawl);
        armL.current.rotation.z = armL.current.rotation.z * (1 - lie) + lie * 0.35 * (1 - sprawl);
      }
      if (armR.current) {
        armR.current.rotation.x = armR.current.rotation.x * (1 - lie) - lie * 0.15 * (1 - sprawl);
        armR.current.rotation.z = armR.current.rotation.z * (1 - lie) - lie * 0.35 * (1 - sprawl);
      }
    }
    if (sprawl > 0.001) {
      if (thighL.current) thighL.current.rotation.z = sprawl * (0.72 + flap * 0.26);
      if (thighR.current) thighR.current.rotation.z = sprawl * (-0.72 - flap2 * 0.26);
      if (armL.current) armL.current.rotation.z = armL.current.rotation.z * (1 - sprawl) + sprawl * (1.28 + flap2 * 0.3);
      if (armR.current) armR.current.rotation.z = armR.current.rotation.z * (1 - sprawl) + sprawl * (-1.28 - flap * 0.3);
    }
    if (lie > 0.45 && armR.current && a.emote === "greet") {
      armR.current.rotation.z += -0.35 + Math.sin(a.emoteT * 8) * 0.42;
      armR.current.rotation.x += -0.28;
    }
    if (lie > 0.45 && a.emote === "pat") {
      const wobbleL = Math.sin(a.emoteT * 11.2) * 0.2 + Math.sin(a.emoteT * 6.4) * 0.1;
      const wobbleR = Math.sin(a.emoteT * 9.1 + 1.4) * 0.2 + Math.cos(a.emoteT * 7.3) * 0.1;
      if (armL.current) {
        armL.current.rotation.x = -1.05 + wobbleL;
        armL.current.rotation.z = 0.42 + Math.sin(a.emoteT * 8.6) * 0.16;
      }
      if (armR.current) {
        armR.current.rotation.x = -1.05 + wobbleR;
        armR.current.rotation.z = -0.42 + Math.cos(a.emoteT * 7.8) * 0.16;
      }
    }
    if (head.current) {
      const bob = a.emote === "pat" ? Math.sin(a.emoteT * 9) * 0.06 : 0;
      const peer = a.peer;
      head.current.rotation.z = bob + (a.spot === "window" ? peer * 0.22 : 0);
      head.current.rotation.y = a.glance + gazing * Math.sin(a.sipT * 0.38) * 0.32 * (1 - sip * 0.65);
      head.current.rotation.x = a.peer * (a.lookDown - 0.36) + sip * 0.28 + gazing * (1 - sip) * (Math.sin(a.sipT * 0.27) * 0.07 - 0.05);
      head.current.position.y = HEAD_LOCAL - Math.abs(bob) * 0.08;
      head.current.position.z = 0;
    }
    const shut = (side: "left" | "right") => {
      const napping = a.phase === "lie" && a.lie > 0.72 && a.blinkMode === "both" && a.emote !== "pat" && a.emote !== "greet";
      if (napping) {
        const t = Math.min(1, a.blinkT / 2.6);
        const closed = t < 0.12 ? t / 0.12 : t < 0.82 ? 1 : Math.max(0, 1 - (t - 0.82) / 0.18);
        return Math.max(0.06, 1 - closed * 0.94);
      }
      const closing = a.blinkMode === "both" || a.blinkMode === side;
      const hold = a.blinkMode === "both" ? 0.16 : 0.34;
      const wave = closing ? Math.sin(Math.min(1, a.blinkT / hold) * Math.PI) : 0;
      const happy = a.expression > 0.45 ? 0.72 : 1;
      return Math.max(0.08, (1 - wave * 0.92) * happy);
    };
    const round = a.spot === "window" ? a.peer : 0;
    const smile = a.phase === "lie" && a.lie > 0.45 && a.emote === "pat";
    const poseEye = (group: THREE.Group | null, side: "left" | "right") => {
      if (!group) return;
      const arc = group.children.find((child) => child.userData.smile);
      const rest = group.children.find((child) => !child.userData.smile);
      if (arc) arc.visible = smile;
      if (rest) rest.visible = !smile;
      group.scale.y = smile ? 1 : shut(side) * (1 - round * 0.24);
      group.scale.x = smile ? 1 : 1 + round * 0.46;
      group.scale.z = 1;
      group.rotation.z = smile ? (side === "left" ? -0.36 : 0.36) : 0;
    };
    poseEye(eyeL.current, "left");
    poseEye(eyeR.current, "right");
    if (book.current) book.current.visible = a.hold === "book";
    if (cup.current) {
      cup.current.visible = a.hold === "cup";
      cup.current.rotation.x = -0.9 * sip;
    }
    if (palette.current) palette.current.visible = a.hold === "palette";
    const hearts = [heartA.current, heartB.current, heartC.current];
    hearts.forEach((heart, index) => {
      if (!heart) return;
      heart.visible = a.emote === "pat";
      if (a.emote !== "pat") return;
      const t = (a.emoteT * 0.45 + index * 0.33) % 1;
      heart.position.set((index - 1) * 0.12, HAIR_TOP + 0.05 + t * 0.45, 0.12);
      const mat = heart.material as THREE.MeshStandardMaterial;
      mat.opacity = 1 - t;
    });
  });

  return (
    <group>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position={[SPOTS.center.x, 0.012, SPOTS.center.z]}>
        <circleGeometry args={[1, 20]} />
        <meshBasicMaterial color="#7f9aab" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <group ref={root} position={[SPOTS.center.x, STAND_Y, SPOTS.center.z]}>
        <group ref={torso} position={[0, TORSO_Y, 0]}>
          <mesh castShadow position={[0, 0.05, 0]}>
            <capsuleGeometry args={[0.125, 0.2, 6, 14]} />
            <meshPhysicalMaterial color={BODY} roughness={0.62} sheen={0.55} sheenColor="#e7f7ff" sheenRoughness={0.45} />
          </mesh>
          <group ref={head} position={[0, HEAD_LOCAL, 0]} scale={HEAD_SCALE}>
            <mesh castShadow scale={[1.08, 1.02, 0.96]}>
              <sphereGeometry args={[HEAD_R, 32, 24]} />
              <meshPhysicalMaterial color="#f4f1ee" roughness={0.42} sheen={0.35} sheenColor="#ffe8e0" sheenRoughness={0.35} />
            </mesh>
            <mesh position={[0, 0.175, 0]} scale={[1, 0.48, 1]} castShadow>
              <sphereGeometry args={[0.21, 24, 16]} />
              <meshPhysicalMaterial color={HAIR} roughness={0.78} sheen={0.18} sheenRoughness={0.7} />
            </mesh>
            <mesh position={[0, 0.12, 0]} castShadow>
              <cylinderGeometry args={[0.185, 0.185, 0.035, 24]} />
              <meshPhysicalMaterial color={HAIR} roughness={0.78} sheen={0.18} sheenRoughness={0.7} />
            </mesh>
            <mesh position={[0, 0.275, 0]} castShadow>
              <sphereGeometry args={[0.026, 10, 8]} />
              <meshStandardMaterial color={HAIR_D} roughness={0.6} />
            </mesh>
            <GrokEye eyeRef={eyeL} x={-0.055} />
            <GrokEye eyeRef={eyeR} x={0.055} />
          </group>
          <group ref={armL} position={[0.1, 0.1, 0]}>
            <mesh position={[0, -0.15, 0]} castShadow>
              <capsuleGeometry args={[0.038, 0.2, 4, 10]} />
              <meshPhysicalMaterial color={SKIN} roughness={0.5} sheen={0.3} sheenColor="#ffe4dc" sheenRoughness={0.4} />
            </mesh>
            <group ref={book} position={[0, -0.28, 0.05]} visible={false}>
              <mesh castShadow>
                <boxGeometry args={[0.1, 0.03, 0.14]} />
                <meshStandardMaterial color="#8ebfd4" roughness={0.75} />
              </mesh>
            </group>
            <group ref={cup} position={[0, -0.28, 0.05]} visible={false}>
              <mesh castShadow>
                <cylinderGeometry args={[0.03, 0.026, 0.05, 10]} />
                <meshStandardMaterial color="#f7fbfd" roughness={0.4} />
              </mesh>
            </group>
            <group ref={palette} position={[0, -0.26, 0.04]} rotation={[0.9, 0.2, 0.5]} visible={false}>
              <mesh castShadow>
                <cylinderGeometry args={[0.06, 0.06, 0.012, 18]} />
                <meshStandardMaterial color="#f4efe4" roughness={0.7} />
              </mesh>
              <mesh position={[-0.025, 0.008, 0.01]}>
                <cylinderGeometry args={[0.012, 0.012, 0.014, 10]} />
                <meshStandardMaterial color={SKIN} roughness={0.55} />
              </mesh>
              {[
                ["#e07a7a", 0.02, 0.015],
                ["#7eb6d4", 0.005, -0.02],
                ["#e6c15a", 0.028, -0.005],
                ["#6eae64", -0.01, 0.02],
              ].map(([color, x, z]) => (
                <mesh key={color} position={[x as number, 0.008, z as number]}>
                  <sphereGeometry args={[0.01, 8, 6]} />
                  <meshStandardMaterial color={color as string} roughness={0.55} />
                </mesh>
              ))}
            </group>
          </group>
          <group ref={armR} position={[-0.1, 0.1, 0]}>
            <mesh position={[0, -0.15, 0]} castShadow>
              <capsuleGeometry args={[0.038, 0.2, 4, 10]} />
              <meshPhysicalMaterial color={SKIN} roughness={0.5} sheen={0.3} sheenColor="#ffe4dc" sheenRoughness={0.4} />
            </mesh>
          </group>
        </group>
        <Leg side={1} thighRef={thighL} />
        <Leg side={-1} thighRef={thighR} />
        <mesh
          position={[0, 0.32, 0]}
          onClick={(event) => {
            event.stopPropagation();
            useCottage.getState().request("pat");
          }}
        >
          <capsuleGeometry args={[0.22, 0.7, 4, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh ref={heartA} geometry={heartGeo} scale={0.18} visible={false}>
          <meshStandardMaterial color="#f0a0aa" transparent opacity={1} roughness={0.45} />
        </mesh>
        <mesh ref={heartB} geometry={heartGeo} scale={0.14} visible={false}>
          <meshStandardMaterial color="#f3b7c0" transparent opacity={1} roughness={0.45} />
        </mesh>
        <mesh ref={heartC} geometry={heartGeo} scale={0.12} visible={false}>
          <meshStandardMaterial color="#e98b9a" transparent opacity={1} roughness={0.45} />
        </mesh>
      </group>
      <group ref={bubbleAnchor}>
        {bubble ? (
          <Html center sprite distanceFactor={8} zIndexRange={[24, 0]} style={{ pointerEvents: "none" }}>
            <div className="pointer-events-none relative w-max max-w-[12.5rem] rounded-[1.15rem] bg-white/45 px-3 py-1.5 text-center text-[13px] leading-snug text-[#3d5562] shadow-[0_8px_22px_rgba(90,140,160,0.1)] backdrop-blur-sm">
              {bubble}
              <span className="absolute left-1/2 top-full -mt-px -translate-x-1/2 border-x-[7px] border-t-[8px] border-x-transparent border-t-white/45" />
            </div>
          </Html>
        ) : pondering ? (
          <Html center sprite distanceFactor={8} zIndexRange={[24, 0]} style={{ pointerEvents: "none" }}>
            <div
              className="pointer-events-none relative flex items-center gap-1.5 rounded-full bg-white/45 px-3 py-2 shadow-[0_8px_22px_rgba(90,140,160,0.1)] backdrop-blur-sm"
              style={{ animation: "think-bob 1.8s ease-in-out infinite" }}
            >
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="block size-1.5 rounded-full bg-[#5f86a8]"
                  style={{ animation: "think-dot 1.2s ease-in-out infinite", animationDelay: `${dot * 0.28}s` }}
                />
              ))}
              <span className="absolute left-1/2 top-full -mt-px -translate-x-1/2 border-x-[7px] border-t-[8px] border-x-transparent border-t-white/45" />
            </div>
          </Html>
        ) : null}
      </group>
      {[thoughtA, thoughtB].map((slot, index) => {
        const item = thoughts[index];
        return (
          <group key={index} ref={slot}>
            {item ? (
              <Html center sprite distanceFactor={5.4} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
                <div
                  ref={(el) => {
                    thoughtEls.current[index] = el;
                  }}
                  className="pointer-events-none relative flex size-11 items-center justify-center rounded-full border border-white/50 bg-white/38 shadow-[0_6px_16px_rgba(90,140,160,0.08)] backdrop-blur-[2px]"
                >
                  <ThoughtGlyph thought={item} />
                  <span
                    className="absolute top-1/2 size-1.5 rounded-full bg-white/45"
                    style={item.side < 0 ? { right: "-0.35rem" } : { left: "-0.35rem" }}
                  />
                </div>
              </Html>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

function GrokEye({ x, eyeRef }: { x: number; eyeRef: RefObject<THREE.Group | null> }) {
  return (
    <group ref={eyeRef} position={[x, -0.02, 0.164]}>
      <mesh>
        <capsuleGeometry args={[0.03, 0.055, 4, 12]} />
        <meshPhysicalMaterial color={EYE} roughness={0.12} metalness={0.05} clearcoat={0.4} clearcoatRoughness={0.2} />
      </mesh>
      <mesh userData={{ smile: true }} visible={false} position={[0, -0.034, 0.012]} rotation={[0, 0, Math.PI * 0.21]}>
        <torusGeometry args={[0.052, 0.011, 8, 18, Math.PI * 0.58]} />
        <meshPhysicalMaterial color={EYE} roughness={0.12} metalness={0.05} clearcoat={0.4} clearcoatRoughness={0.2} />
      </mesh>
    </group>
  );
}

function Leg({ side, thighRef }: { side: 1 | -1; thighRef: RefObject<THREE.Group | null> }) {
  return (
    <group ref={thighRef} position={[side * 0.055, 0, 0]}>
      <mesh position={[0, -0.17, 0]} castShadow>
        <capsuleGeometry args={[0.042, 0.24, 4, 10]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.5} sheen={0.3} sheenColor="#ffe4dc" sheenRoughness={0.4} />
      </mesh>
    </group>
  );
}
