import { useState } from "react";
import { X } from "lucide-react";
import { drawSketch } from "@/lib/sketch.functions";
import { useCottage } from "@/lib/cottage-store";

const memory = new Map<string, string>();

function selfPortrait() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 576;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#f6efe2";
  ctx.fillRect(0, 0, 768, 576);
  for (let i = 0; i < 28; i += 1) {
    ctx.strokeStyle = i % 2 === 0 ? "rgba(90,140,170,0.12)" : "rgba(210,150,90,0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 12 + i * 20);
    ctx.bezierCurveTo(220, 6 + i * 20, 520, 22 + i * 20, 768, 10 + i * 20);
    ctx.stroke();
  }
  const stroke = (color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };
  ctx.fillStyle = "#8ec9de";
  ctx.beginPath();
  ctx.ellipse(384, 392, 62, 78, 0.04, 0, Math.PI * 2);
  ctx.fill();
  stroke("#5d86a0", 6);
  ctx.stroke();
  stroke("#e7c2b0", 8);
  ctx.beginPath();
  ctx.moveTo(332, 430);
  ctx.quadraticCurveTo(318, 490, 308, 530);
  ctx.moveTo(436, 430);
  ctx.quadraticCurveTo(454, 488, 462, 528);
  ctx.moveTo(330, 360);
  ctx.quadraticCurveTo(280, 400, 250, 470);
  ctx.moveTo(438, 360);
  ctx.quadraticCurveTo(490, 390, 520, 450);
  ctx.stroke();
  ctx.fillStyle = "#f7f4ef";
  ctx.beginPath();
  ctx.arc(384, 250, 108, 0, Math.PI * 2);
  ctx.fill();
  stroke("#6d86ae", 7);
  ctx.stroke();
  ctx.fillStyle = "#6d86ae";
  ctx.beginPath();
  ctx.ellipse(384, 214, 118, 96, -0.04, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(390, 248, 112, 22, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(378, 150, 28, 14, -0.2, 0, Math.PI * 2);
  ctx.fill();
  stroke("rgba(255,255,255,0.4)", 5);
  ctx.beginPath();
  ctx.moveTo(310, 190);
  ctx.quadraticCurveTo(370, 168, 450, 198);
  ctx.stroke();
  ctx.fillStyle = "#1b2430";
  ctx.beginPath();
  ctx.ellipse(356, 268, 16, 34, 0.08, 0, Math.PI * 2);
  ctx.ellipse(424, 258, 16, 34, -0.04, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toDataURL("image/png");
}

export function Sketchbook({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [word, setWord] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function paint() {
    const next = word.trim();
    if (!next || busy) return;
    setError("");
    if (next.replace(/\s/g, "") === "瑶瑶") {
      const portrait = memory.get("瑶瑶") ?? selfPortrait();
      memory.set("瑶瑶", portrait);
      setImage(portrait);
      setCaption("瑶瑶");
      useCottage.getState().saveSketch("瑶瑶", portrait);
      useCottage.getState().say("这张是我自己。");
      return;
    }
    const cached = memory.get(next);
    if (cached) {
      setImage(cached);
      setCaption(next);
      useCottage.getState().saveSketch(next, cached);
      useCottage.getState().say("这张还在，我放到画架上。");
      return;
    }
    setBusy(true);
    try {
      const result = await drawSketch({ data: { word: next } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      memory.set(next, result.image);
      setImage(result.image);
      setCaption(result.word);
      useCottage.getState().saveSketch(result.word, result.image);
      useCottage.getState().say("画好了，放到画架上。");
    } catch {
      setError("这张没画成，再试一次。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-white/25 p-3 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-label="画板">
      <div className="glass-panel flex max-h-full w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-[1.7rem] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg">画板</h2>
            <p className="text-xs text-muted">写一个词，画成潦草的涂色</p>
          </div>
          <button type="button" className="glass-btn flex size-11 items-center justify-center rounded-[1.15rem]" onClick={onClose} aria-label="关上画板">
            <X className="size-4" />
          </button>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void paint();
          }}
        >
          <input
            value={word}
            onChange={(event) => setWord(event.target.value)}
            maxLength={24}
            placeholder="比如：月亮、雨伞、鲸鱼"
            className="glass-btn h-11 min-w-0 flex-1 rounded-[1.15rem] px-3 text-sm outline-none"
            aria-label="要画的词"
          />
          <button type="submit" disabled={busy || word.trim().length === 0} className="glass-btn-primary h-11 shrink-0 rounded-[1.15rem] px-4 text-sm text-[#3d7f9e] disabled:opacity-50">
            {busy ? "在画" : "画下来"}
          </button>
        </form>
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.3rem] border border-white/80 bg-white/55">
          {busy ? <div className="scribble absolute inset-4 rounded-lg" /> : null}
          {image ? <img src={image} alt={caption ? `潦草涂色：${caption}` : "潦草涂色"} className="h-full w-full object-contain" /> : null}
          {!image && !busy ? <p className="px-6 text-center text-sm text-muted">纸还是空白的。</p> : null}
        </div>
        {caption ? <p className="text-center font-serif text-sm text-muted">{caption}</p> : null}
        {error ? <p className="text-center text-sm text-fg">{error}</p> : null}
      </div>
    </div>
  );
}
