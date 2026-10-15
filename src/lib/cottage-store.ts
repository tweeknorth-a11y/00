import { create } from "zustand";

export type Lights = {
  sun: number;
  pendant: number;
  lamp: number;
  hearth: number;
  warmth: number;
};

export type PresetId = "morning" | "afternoon" | "dusk" | "night";

export type Command = "greet" | "sit" | "wander" | "read" | "tea" | "pat" | "lift" | "watch" | "plant" | "paint" | "out" | "bird" | "carry";

export type Notice = "hearth" | "book" | "cup";

export const PRESETS: Record<PresetId, Lights> = {
  morning: { sun: 0.86, pendant: 0.12, lamp: 0.08, hearth: 0, warmth: 0.22 },
  afternoon: { sun: 1, pendant: 0.05, lamp: 0, hearth: 0, warmth: 0.4 },
  dusk: { sun: 0.3, pendant: 0.62, lamp: 0.9, hearth: 0.72, warmth: 0.7 },
  night: { sun: 0.08, pendant: 0.78, lamp: 1, hearth: 0.88, warmth: 0.55 },
};

const LIGHT_KEY = "lanqi-lights-v1";
const CHAT_KEY = "lanqi-chat-v1";
const SKETCH_KEY = "lanqi-sketches-v1";

export type ChatLine = { role: "you" | "yaoyao"; text: string; at: number };
export type SketchItem = { word: string; image: string; at: number };

function loadList<T>(key: string, cap: number): T[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
    return Array.isArray(parsed) ? parsed.slice(0, cap) : [];
  } catch {
    return [];
  }
}

function saveList(key: string, items: unknown[]) {
  let next = items;
  while (next.length) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      return;
    } catch {
      next = next.slice(0, -1);
    }
  }
  try {
    localStorage.removeItem(key);
  } catch {
    /* quota */
  }
}

function loadLights(): { lights: Lights; preset: PresetId | "custom"; lampOn: boolean } {
  const fallback = { lights: { ...PRESETS.afternoon }, preset: "afternoon" as const, lampOn: false };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(LIGHT_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as {
      lights?: Partial<Lights>;
      preset?: PresetId | "custom";
      lampOn?: boolean;
    };
    return {
      lights: { ...PRESETS.afternoon, ...parsed.lights },
      preset: parsed.preset ?? "custom",
      lampOn: Boolean(parsed.lampOn),
    };
  } catch {
    return fallback;
  }
}

type Store = {
  lights: Lights;
  preset: PresetId | "custom";
  lampOn: boolean;
  presence: string;
  speech: string;
  speechId: number;
  bubble: string;
  bubbleId: number;
  pondering: boolean;
  command: Command | null;
  notice: Notice | null;
  sketchOpen: boolean;
  latestSketch: string | null;
  chat: ChatLine[];
  sketches: SketchItem[];
  camToken: number;
  camShot: "home" | "full";
  birdToken: number;
  birdVisit: "none" | "coming" | "here";
  birdX: number;
  birdY: number;
  birdZ: number;
  setLights: (partial: Partial<Lights>) => void;
  applyPreset: (id: PresetId) => void;
  toggleLamp: () => void;
  setPresence: (text: string) => void;
  say: (text: string) => void;
  mutter: (text: string, footer?: boolean) => void;
  setPondering: (pondering: boolean) => void;
  request: (command: Command) => void;
  poke: (notice: Notice) => void;
  consumeNotice: () => Notice | null;
  consumeCommand: () => Command | null;
  setSketchOpen: (open: boolean) => void;
  setLatestSketch: (url: string | null) => void;
  logChat: (role: ChatLine["role"], text: string) => void;
  saveSketch: (word: string, image: string) => void;
  focusCamera: (shot: "home" | "full") => void;
  callBird: () => void;
  setBirdVisit: (visit: "none" | "coming" | "here") => void;
};

const loaded = loadLights();
const loadedChat = loadList<ChatLine>(CHAT_KEY, 80);
const loadedSketches = loadList<SketchItem>(SKETCH_KEY, 8);

export const useCottage = create<Store>((set, get) => ({
  lights: loaded.lights,
  preset: loaded.preset,
  lampOn: loaded.lampOn,
  presence: "在客厅里",
  speech: "",
  speechId: 0,
  bubble: "",
  bubbleId: 0,
  pondering: false,
  command: null,
  notice: null,
  sketchOpen: false,
  latestSketch: loadedSketches[0]?.image ?? null,
  chat: loadedChat,
  sketches: loadedSketches,
  camToken: 0,
  camShot: "home",
  birdToken: 0,
  birdVisit: "none",
  birdX: 0.72,
  birdY: 0.55,
  birdZ: -2.6,
  setLights: (partial) =>
    set((state) => ({
      lights: { ...state.lights, ...partial },
      preset: "custom",
      lampOn: partial.lamp !== undefined ? partial.lamp > 0.03 : state.lampOn,
    })),
  applyPreset: (id) =>
    set({
      lights: { ...PRESETS[id] },
      preset: id,
      lampOn: PRESETS[id].lamp > 0.03,
    }),
  toggleLamp: () =>
    set((state) => {
      const next = !state.lampOn;
      return {
        lampOn: next,
        lights: {
          ...state.lights,
          lamp: next && state.lights.lamp < 0.05 ? 0.75 : state.lights.lamp,
        },
        preset: "custom",
      };
    }),
  setPresence: (text) => {
    if (get().presence === text) return;
    set({ presence: text });
  },
  say: (text) => {
    const speechId = get().speechId + 1;
    set({ speech: text, speechId });
    window.setTimeout(() => {
      if (get().speechId === speechId) set({ speech: "" });
    }, 4600);
  },
  mutter: (text, footer = true) => {
    if (get().pondering) return;
    const bubbleId = get().bubbleId + 1;
    if (!footer) {
      const speechId = get().speechId + 1;
      set({ bubble: text, bubbleId, speech: "", speechId });
      window.setTimeout(() => {
        if (get().bubbleId === bubbleId) set({ bubble: "" });
      }, 5600);
      return;
    }
    const speechId = get().speechId + 1;
    set({ speech: text, speechId, bubble: text, bubbleId });
    window.setTimeout(() => {
      if (get().bubbleId === bubbleId) set({ bubble: "" });
      if (get().speechId === speechId) set({ speech: "" });
    }, 5600);
  },
  setPondering: (pondering) =>
    set((state) => ({
      pondering,
      ...(pondering ? { bubble: "", bubbleId: state.bubbleId + 1 } : {}),
    })),
  request: (command) => set({ command }),
  poke: (notice) => set({ notice }),
  consumeNotice: () => {
    const notice = get().notice;
    if (notice) set({ notice: null });
    return notice;
  },
  consumeCommand: () => {
    const command = get().command;
    if (command) set({ command: null });
    return command;
  },
  setSketchOpen: (sketchOpen) => set({ sketchOpen }),
  setLatestSketch: (latestSketch) => set({ latestSketch }),
  logChat: (role, text) => {
    const line = text.trim();
    if (!line) return;
    set((state) => ({ chat: [{ role, text: line, at: Date.now() }, ...state.chat].slice(0, 80) }));
  },
  saveSketch: (word, image) => {
    const title = word.trim() || "未命名";
    if (!image) return;
    set((state) => ({
      latestSketch: image,
      sketches: [{ word: title, image, at: Date.now() }, ...state.sketches.filter((item) => item.image !== image)].slice(0, 8),
    }));
  },
  focusCamera: (shot) => set((state) => ({ camShot: shot, camToken: state.camToken + 1 })),
  callBird: () =>
    set((state) => ({
      birdToken: state.birdToken + 1,
      birdVisit: "coming",
      birdX: 0.25 + Math.random() * 1.05,
      birdZ: -2.6,
      birdY: 0.55,
      command: "bird",
    })),
  setBirdVisit: (birdVisit) => set({ birdVisit }),
}));

if (typeof window !== "undefined") {
  useCottage.subscribe((state, prev) => {
    if (state.lights !== prev.lights || state.lampOn !== prev.lampOn || state.preset !== prev.preset) {
      localStorage.setItem(
        LIGHT_KEY,
        JSON.stringify({ lights: state.lights, lampOn: state.lampOn, preset: state.preset }),
      );
    }
    if (state.chat !== prev.chat) saveList(CHAT_KEY, state.chat);
    if (state.sketches !== prev.sketches) saveList(SKETCH_KEY, state.sketches);
  });
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const u = Math.min(1, Math.max(0, t));
  const r = ((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * u;
  const g = ((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * u;
  const bl = (pa & 255) + ((pb & 255) - (pa & 255)) * u;
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(bl)})`;
}
