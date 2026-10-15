import { createServerFn } from "@tanstack/react-start";

export type SketchResult = { ok: true; image: string; word: string } | { ok: false; error: string };

const cache = new Map<string, string>();
const hits: number[] = [];

function limited(): boolean {
  const now = Date.now();
  while (hits.length && now - hits[0]! > 10 * 60 * 1000) hits.shift();
  if (hits.length >= 18) return true;
  hits.push(now);
  return false;
}

function cleanWord(input: unknown): string {
  const raw = typeof input === "object" && input && "word" in input ? String((input as { word: unknown }).word) : "";
  return raw.replace(/\s+/g, " ").replace(/[<>`"]/g, "").trim().slice(0, 24);
}

async function toDataUrl(item: { url?: string; b64_json?: string }): Promise<string> {
  if (item.b64_json) {
    return item.b64_json.startsWith("data:") ? item.b64_json : `data:image/png;base64,${item.b64_json}`;
  }
  if (!item.url) throw new Error("empty");
  const img = await fetch(item.url, { signal: AbortSignal.timeout(20000) });
  if (!img.ok) throw new Error("fetch");
  const mime = img.headers.get("content-type")?.split(";")[0] || "image/png";
  const bytes = new Uint8Array(await img.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

async function requestImage(apiKey: string, model: string, prompt: string, withFormat: boolean) {
  const body: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    aspect_ratio: "4:3",
    resolution: "1k",
  };
  if (withFormat) body.response_format = "b64_json";
  return fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(50000),
  });
}

export const drawSketch = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ word: cleanWord(input) }))
  .handler(async ({ data }): Promise<SketchResult> => {
    if (!data.word) return { ok: false, error: "先写一个词。" };
    const cached = cache.get(data.word);
    if (cached) return { ok: true, image: cached, word: data.word };
    if (limited()) return { ok: false, error: "画得有点勤，歇一会儿再画。" };

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "现在画不了，稍后再试。" };

    const prompt = [
      "Rough messy sketchbook doodle on warm off-white paper, colored pencil and crayon.",
      `Simple naive drawing of: ${data.word}.`,
      "Wobbly uneven outlines, flat color scribbled slightly outside the lines, a few stray construction strokes,",
      "lots of blank paper margin, one subject centered, amateur and charming.",
      "No text, no letters, no watermark, no frame, no photorealism, no 3D render.",
    ].join(" ");

    try {
      let res = await requestImage(apiKey, "grok-imagine-image", prompt, true);
      if (!res.ok) {
        const errText = await res.text();
        console.error("sketch primary failed", res.status, errText.slice(0, 300));
        const modelBad = /model/i.test(errText);
        const fieldBad = /response_format|aspect_ratio|resolution|unknown|extra/i.test(errText);
        if (modelBad) res = await requestImage(apiKey, "grok-imagine-image-2.0", prompt, !fieldBad);
        else if (fieldBad) res = await requestImage(apiKey, "grok-imagine-image", prompt, false);
        else return { ok: false, error: "这张没画成，换个词再试一次。" };
      }
      if (!res.ok) {
        const errText = await res.text();
        console.error("sketch fallback failed", res.status, errText.slice(0, 300));
        return { ok: false, error: "这张没画成，换个词再试一次。" };
      }
      const body = (await res.json()) as { data?: { url?: string; b64_json?: string }[] };
      const item = body.data?.[0];
      if (!item) return { ok: false, error: "这张是空白的，再试一次。" };
      const image = await toDataUrl(item);
      cache.set(data.word, image);
      if (cache.size > 24) {
        const first = cache.keys().next().value;
        if (first) cache.delete(first);
      }
      return { ok: true, image, word: data.word };
    } catch (error) {
      console.error("sketch error", error);
      return { ok: false, error: "铅笔断了，再试一次。" };
    }
  });
