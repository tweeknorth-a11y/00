function pick(items: string[]): string {
  return items[Math.floor(Math.random() * items.length)] ?? items[0]!;
}

function clip(text: string): string {
  const clean = text.replace(/\s+/g, "").replace(/[「」]/g, "");
  return clean.length > 14 ? `${clean.slice(0, 14)}…` : clean;
}

/** Short head-bubble reply. Soft voice, a little sharp. */
export function yaoyaoReply(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim().slice(0, 40);
  if (!text) return "话呢。空着手，我也刻薄不起来。";
  const said = clip(text);
  if (/你好|在吗|早上好|早安|晚安|嗨|hello|hi\b/i.test(text)) {
    return pick(["你来啦。问候倒是周到，人就不一定。", "在的。这么客气，是有事要说吧。"]);
  }
  if (/瑶瑶/.test(text)) {
    return pick(["点我的名字，就当我会回头？……好吧，我听见了。", "叫得这么亲。我又不是随叫随到的。"]);
  }
  if (/喜欢|爱你|可爱|漂亮|好看/.test(text)) {
    return pick([`「${said}」。嘴倒是甜，我先收下，先不还你。`, "夸可以。太满了，后半句我就当没听见。"]);
  }
  if (/讨厌|笨|丑|烦|闭嘴/.test(text)) {
    return pick(["哦。说完了？我还在这儿，并没有因此消失。", "语气这么冲。屋子倒是还让你进。"]);
  }
  if (/无聊|累|难过|伤心|想你/.test(text)) {
    return pick(["累了就坐一会儿。沙发比我有耐心，我只是看起来温柔。", "难过可以。别指望我跟着一起沉下去。"]);
  }
  if (/[?？]|吗|呢$/.test(text)) {
    return pick([`「${said}」……答案我有，只是不一定给你。`, "这个问题倒会挑时候。我先想一会儿，你别催。"]);
  }
  return pick([
    `「${said}」。我听见了。听见，和答应，差得远。`,
    `${said}。说得轻巧。我这边可没那么好打发。`,
    `嗯，${said}。你说完了？那我收下，不回礼。`,
  ]);
}
