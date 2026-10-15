import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bird,
  BookOpen,
  Flame,
  Hand,
  Lamp,
  MessageCircle,
  Moon,
  Pencil,
  PersonStanding,
  RotateCcw,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import { type ChatLine, type PresetId, type SketchItem, useCottage } from "@/lib/cottage-store";
import { yaoyaoReply } from "@/lib/yaoyao-reply";
import { yaoyaoChat } from "@/lib/yaoyao-reply.functions";

const PRESET_LABEL: { id: PresetId; label: string; icon: LucideIcon }[] = [
  { id: "morning", label: "清晨", icon: Sun },
  { id: "afternoon", label: "午后", icon: Sun },
  { id: "dusk", label: "黄昏", icon: Flame },
  { id: "night", label: "夜读", icon: Moon },
];

export function Hud({ onDraw }: { onDraw: () => void }) {
  const presence = useCottage((s) => s.presence);
  const speech = useCottage((s) => s.speech);
  const lights = useCottage((s) => s.lights);
  const preset = useCottage((s) => s.preset);
  const setLights = useCottage((s) => s.setLights);
  const applyPreset = useCottage((s) => s.applyPreset);
  const request = useCottage((s) => s.request);
  const callBird = useCottage((s) => s.callBird);
  const focusCamera = useCottage((s) => s.focusCamera);
  const [lightsOpen, setLightsOpen] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [talking, setTalking] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [recordTab, setRecordTab] = useState<"chat" | "art">("chat");
  const lightsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lightsOpen) return;
    let idle = window.setTimeout(() => setLightsOpen(false), 5000);
    const bump = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(() => setLightsOpen(false), 5000);
    };
    const onPointer = (event: PointerEvent) => {
      const inside = lightsRef.current?.contains(event.target as Node) ?? false;
      if (!inside) {
        setLightsOpen(false);
        return;
      }
      if (event.type === "pointerdown" || event.buttons > 0) bump();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("pointermove", onPointer);
    return () => {
      window.clearTimeout(idle);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [lightsOpen]);

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3">
        <div className="glass-panel pointer-events-auto min-w-0 rounded-[1.4rem] px-3 py-2">
          <h1 className="font-serif text-lg leading-tight text-fg">蓝栖小屋</h1>
          <p className="text-xs text-muted">敞开的一间蓝客厅</p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <p className="glass-panel rounded-[1.2rem] px-3 py-2 text-xs">{presence}</p>
          <button
            type="button"
            className="glass-btn flex size-11 items-center justify-center rounded-[1.15rem]"
            onClick={() => focusCamera("full")}
            aria-label="看向瑶瑶全身"
          >
            <PersonStanding className="size-4" />
          </button>
          <button
            type="button"
            className="glass-btn flex size-11 items-center justify-center rounded-[1.15rem]"
            onClick={() => focusCamera("home")}
            aria-label="重置默认视角"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </header>

      <div ref={lightsRef} className="pointer-events-auto absolute top-20 right-3 z-10 flex flex-col items-end gap-2">
        {lightsOpen ? (
          <div className="glass-panel w-[min(16rem,calc(100vw-1.5rem))] rounded-[1.6rem] p-3">
            <LightControls lights={lights} preset={preset} setLights={setLights} applyPreset={applyPreset} />
          </div>
        ) : null}
        <button
          type="button"
          className="glass-btn flex size-11 items-center justify-center rounded-[1.15rem]"
          onClick={() => setLightsOpen((open) => !open)}
          aria-expanded={lightsOpen}
          aria-label={lightsOpen ? "收起灯光" : "打开灯光"}
        >
          <Lamp className="size-4 text-[#79b7d6]" />
        </button>
      </div>

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-2">
          <p className="glass-panel pointer-events-auto rounded-[1.4rem] px-4 py-2 text-sm">
            {said ?? (speech || "拖动环顾这间屋子。灯可以自己调。")}
          </p>
          {talkOpen ? (
            <form
              className="glass-panel pointer-events-auto flex gap-2 rounded-[1.4rem] p-2"
              onSubmit={(event) => {
                event.preventDefault();
                const text = draft.trim();
                if (!text || talking) return;
                setDraft("");
                setSaid(text);
                setTalking(true);
                useCottage.getState().logChat("you", text);
                useCottage.getState().setPondering(true);
                const restore = () => window.setTimeout(() => setSaid(null), 5600);
                void yaoyaoChat({ data: { text } })
                  .then((result) => {
                    useCottage.getState().setPondering(false);
                    useCottage.getState().logChat("yaoyao", result.line);
                    useCottage.getState().mutter(result.line, false);
                    restore();
                  })
                  .catch(() => {
                    useCottage.getState().setPondering(false);
                    const line = yaoyaoReply(text);
                    useCottage.getState().logChat("yaoyao", line);
                    useCottage.getState().mutter(line, false);
                    restore();
                  })
                  .finally(() => setTalking(false));
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={40}
                placeholder="跟瑶瑶说一句"
                autoFocus
                disabled={talking}
                className="glass-btn h-11 min-w-0 flex-1 rounded-[1.15rem] px-3 text-sm outline-none disabled:opacity-60"
                aria-label="要对瑶瑶说的话"
              />
              <button
                type="submit"
                disabled={talking || draft.trim().length === 0}
                className="glass-btn-primary h-11 shrink-0 rounded-[1.15rem] px-4 text-sm text-[#3d7f9e] disabled:opacity-50"
              >
                {talking ? "在想" : "说"}
              </button>
            </form>
          ) : null}
          <div className="pointer-events-auto flex w-full min-w-0 gap-2 overflow-x-auto pb-1">
            <ActionButton label="摸摸头" icon={Hand} onClick={() => request("pat")} primary />
            <ActionButton label="举高高" icon={ArrowUp} onClick={() => request("lift")} primary />
            <ActionButton label="画画" icon={Pencil} onClick={onDraw} primary />
            <ActionButton label="打招呼" icon={Hand} onClick={() => request("greet")} />
            <ActionButton label="小鸟" icon={Bird} onClick={callBird} />
            <ActionButton label="说话" icon={MessageCircle} onClick={() => setTalkOpen((open) => !open)} />
            <ActionButton
              label="记录"
              icon={BookOpen}
              onClick={() => {
                setRecordTab("chat");
                setRecordsOpen(true);
              }}
            />
          </div>
        </div>
      </footer>
      {recordsOpen ? <Records tab={recordTab} onTab={setRecordTab} onClose={() => setRecordsOpen(false)} /> : null}
    </>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  primary = false,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "glass-btn-primary flex h-12 shrink-0 items-center gap-2 rounded-[1.35rem] px-3.5 text-sm"
          : "glass-btn flex h-12 shrink-0 items-center gap-2 rounded-[1.35rem] px-3.5 text-sm"
      }
    >
      <Icon className={primary ? "size-[1.05rem] text-[#79b7d6]" : "size-[1.05rem] text-[#8aa0ae]"} />
      {label}
    </button>
  );
}

function LightControls({
  lights,
  preset,
  setLights,
  applyPreset,
  compact = false,
}: {
  lights: { sun: number; pendant: number; lamp: number; hearth: number; warmth: number };
  preset: PresetId | "custom";
  setLights: (partial: Partial<typeof lights>) => void;
  applyPreset: (id: PresetId) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "glass-panel rounded-[1.5rem] p-3" : "flex flex-col gap-3"}>
      <div className="flex gap-2 overflow-x-auto">
        {PRESET_LABEL.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => applyPreset(item.id)}
            className={
              preset === item.id
                ? "glass-btn-primary h-10 shrink-0 rounded-[1.1rem] px-3 text-xs text-[#3d7f9e]"
                : "glass-btn h-10 shrink-0 rounded-[1.1rem] px-3 text-xs"
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      <Slider icon={Sun} label="日光" value={lights.sun} onChange={(sun) => setLights({ sun })} />
      <Slider icon={Lamp} label="吊灯" value={lights.pendant} onChange={(pendant) => setLights({ pendant })} />
      <Slider icon={Lamp} label="落地灯" value={lights.lamp} onChange={(lamp) => setLights({ lamp })} />
      <Slider icon={Flame} label="壁炉" value={lights.hearth} onChange={(hearth) => setLights({ hearth })} />
      <Slider icon={Sun} label="冷暖" value={lights.warmth} onChange={(warmth) => setLights({ warmth })} />
    </div>
  );
}

function Slider({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-fg">
      <Icon className="size-4 shrink-0 text-[#79b7d6]" />
      <span className="w-12 shrink-0">{label}</span>
      <input
        className="light-slider"
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        aria-label={label}
      />
    </label>
  );
}

function clock(at: number) {
  return new Date(at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Records({
  tab,
  onTab,
  onClose,
}: {
  tab: "chat" | "art";
  onTab: (tab: "chat" | "art") => void;
  onClose: () => void;
}) {
  const chat = useCottage((s) => s.chat);
  const sketches = useCottage((s) => s.sketches);
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-white/25 p-3 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-label="记录">
      <div className="glass-panel flex max-h-[min(36rem,100%)] w-full max-w-lg flex-col gap-3 overflow-hidden rounded-[1.7rem] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg">记录</h2>
          <button type="button" className="glass-btn flex size-11 items-center justify-center rounded-[1.15rem]" onClick={onClose} aria-label="关上记录">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onTab("chat")}
            className={tab === "chat" ? "glass-btn-primary h-10 flex-1 rounded-[1.1rem] text-sm text-[#3d7f9e]" : "glass-btn h-10 flex-1 rounded-[1.1rem] text-sm"}
          >
            对话记录
          </button>
          <button
            type="button"
            onClick={() => onTab("art")}
            className={tab === "art" ? "glass-btn-primary h-10 flex-1 rounded-[1.1rem] text-sm text-[#3d7f9e]" : "glass-btn h-10 flex-1 rounded-[1.1rem] text-sm"}
          >
            作画记录
          </button>
        </div>
        {tab === "chat" ? <ChatList lines={chat} /> : <ArtList items={sketches} />}
      </div>
    </div>
  );
}

function ChatList({ lines }: { lines: ChatLine[] }) {
  if (!lines.length) return <p className="px-1 py-6 text-center text-sm text-muted">还没有跟瑶瑶说过话。</p>;
  return (
    <ol className="flex max-h-[24rem] flex-col gap-2 overflow-y-auto pr-1">
      {lines.map((line, index) => (
        <li key={`${line.at}-${index}`} className={line.role === "you" ? "max-w-[85%] self-end" : "max-w-[85%] self-start"}>
          <p className="mb-1 text-[11px] text-muted">{line.role === "you" ? "你" : "瑶瑶"} · {clock(line.at)}</p>
          <p className={line.role === "you" ? "glass-btn rounded-[1.1rem] px-3 py-2 text-sm" : "rounded-[1.1rem] bg-white/55 px-3 py-2 text-sm text-[#3d5562]"}>{line.text}</p>
        </li>
      ))}
    </ol>
  );
}

function ArtList({ items }: { items: SketchItem[] }) {
  if (!items.length) return <p className="px-1 py-6 text-center text-sm text-muted">还没有画。</p>;
  return (
    <ul className="grid max-h-[24rem] grid-cols-2 gap-2 overflow-y-auto pr-1">
      {items.map((item) => (
        <li key={`${item.at}-${item.word}`} className="overflow-hidden rounded-[1.1rem] bg-white/50">
          <img src={item.image} alt={item.word} className="aspect-[4/3] w-full object-cover" />
          <p className="px-2 py-1.5 text-xs">
            {item.word}
            <span className="mt-0.5 block text-[11px] text-muted">{clock(item.at)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
