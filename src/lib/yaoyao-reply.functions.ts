import { createServerFn } from "@tanstack/react-start";
import { yaoyaoReply } from "@/lib/yaoyao-reply";

type Turn = { role: "user" | "assistant"; content: string };

const history: Turn[] = [];
const hits: number[] = [];

function limited(): boolean {
  const now = Date.now();
  while (hits.length && now - hits[0]! > 10 * 60 * 1000) hits.shift();
  if (hits.length >= 24) return true;
  hits.push(now);
  return false;
}

function cleanText(input: unknown): string {
  const raw = typeof input === "object" && input && "text" in input ? String((input as { text: unknown }).text) : "";
  return raw.replace(/\s+/g, " ").replace(/[<>`]/g, "").trim().slice(0, 80);
}

function trimLine(text: string): string {
  const line = text.replace(/\s+/g, " ").replace(/^[「"']+|[」"']+$/g, "").trim();
  if (line.length <= 42) return line;
  const cut = line.slice(0, 42);
  const mark = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("，"), cut.lastIndexOf("…"));
  return (mark > 12 ? cut.slice(0, mark + 1) : cut).trim();
}

async function askGrok(apiKey: string, text: string): Promise<string | null> {
  const messages = [
    {
      role: "system",
      content: [
        "你是瑶瑶，住在一间没有天花板的蓝色木屋客厅里。圆乎乎的，没有嘴，只有一双大眼睛，戴着画家帽。",
        "说话温柔，但带一点刻薄。每次只回一两句，总共不超过36个字，适合头顶的小气泡。",
        "接住对方刚说的内容，再轻轻刺一下。不要重复自己上一句的句式。",
        "口语。不要解释人设，不要加引号，不要用表情符号，不要说自己是人工智能或模型。",
      ].join(""),
    },
    ...history,
    { role: "user", content: text },
  ];
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4",
      messages,
      max_tokens: 80,
      temperature: 0.95,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    console.error("yaoyao chat failed", res.status, (await res.text()).slice(0, 240));
    return null;
  }
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const line = trimLine(body.choices?.[0]?.message?.content ?? "");
  return line || null;
}

export const yaoyaoChat = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ text: cleanText(input) }))
  .handler(async ({ data }): Promise<{ line: string }> => {
    if (!data.text) return { line: yaoyaoReply("") };
    if (limited()) return { line: "说得有点勤。让我歇一口气，再刻薄给你听。" };
    const apiKey = process.env.XAI_API_KEY;
    const line = apiKey ? await askGrok(apiKey, data.text).catch(() => null) : null;
    const reply = line ?? yaoyaoReply(data.text);
    history.push({ role: "user", content: data.text }, { role: "assistant", content: reply });
    while (history.length > 8) history.shift();
    return { line: reply };
  });
