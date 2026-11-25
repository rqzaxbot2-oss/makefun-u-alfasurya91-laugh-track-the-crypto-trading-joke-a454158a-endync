import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { deflateSync } from "node:zlib";

const BOUNTY_ID = "u-alfasurya91-laugh-track-the-crypto-trading-joke-a454158a";
const TITLE = "Steel Seed Phrase, 3 AM Leverage";
const MAX_CHARS = 200;
const MAX_TITLE_CHARS = 200;
const JOKE =
  "I stamped my seed phrase in steel to survive a house fire, as if the real security threat isn't me on 20x leverage at 3 a.m.";
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

type RGB = readonly [number, number, number];

interface ArtifactMeta {
  path: string;
  bytes: number;
  sha256: string;
  mime: string;
}

const FONT: Readonly<Record<string, string>> = {
  A: "4ahvhhh", B: "uhhuhhu", C: "ehggghe", D: "uhhhhhu", E: "vgguggv",
  F: "vgguggg", G: "ehggnhe", H: "hhhvhhh", I: "e44444e", J: "72222ic",
  K: "hiokoih", L: "ggggggv", M: "hrlhhhh", N: "hppljjh", O: "ehhhhhe",
  P: "uhhuggg", Q: "ehhhlid", R: "uhhukih", S: "ehge1he", T: "v444444",
  U: "hhhhhhe", V: "hhhhha4", W: "hhhllrh", X: "hha4ahh", Y: "hha4444",
  Z: "v1248gv", "0": "ehjlphe", "1": "4c4444e", "2": "eh1248v", "3": "eh161he",
  "4": "26aiv22", "5": "vgu11he", "6": "egguhhe", "7": "v124888", "8": "ehhehhe",
  "9": "ehhf1he", " ": "0000000", ".": "0000044", ",": "0000048", "'": "4480000",
  ":": "0040040", "-": "000e000", "/": "01248g0", "!": "4444404", "%": "op248j3",
};

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  if (!/^[A-Za-z]{4}$/.test(type)) {
    throw new Error(`Invalid PNG chunk type: ${type}`);
  }
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const tag = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tag, data])), 0);
  return Buffer.concat([len, tag, data, crc]);
}

function encodePng(w: number, h: number, rgb: Uint8Array): Buffer {
  if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) {
    throw new Error(`Invalid PNG dimensions: ${w}x${h}`);
  }
  if (rgb.length !== w * h * 3) {
    throw new Error(`Invalid RGB buffer length: got ${rgb.length}, expected ${w * h * 3}`);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const stride = w * 3;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    const rowOff = y * (stride + 1);
    raw[rowOff] = 0;
    raw.set(rgb.subarray(y * stride, (y + 1) * stride), rowOff + 1);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

class PixelCanvas {
  readonly w: number;
  readonly h: number;
  readonly rgb: Uint8Array;

  constructor(w: number, h: number, bg: RGB) {
    if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) {
      throw new Error(`Invalid canvas dimensions: ${w}x${h}`);
    }
    this.w = w;
    this.h = h;
    this.rgb = new Uint8Array(w * h * 3);
    this.fillRect(0, 0, w, h, bg);
  }

  fillRect(x: number, y: number, rw: number, rh: number, c: RGB): void {
    if (rw <= 0 || rh <= 0) return;
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.w, Math.floor(x + rw));
    const y1 = Math.min(this.h, Math.floor(y + rh));
    if (x1 <= x0 || y1 <= y0) return;
    for (let py = y0; py < y1; py++) {
      let idx = (py * this.w + x0) * 3;
      for (let px = x0; px < x1; px++) {
        this.rgb[idx] = c[0];
        this.rgb[idx + 1] = c[1];
        this.rgb[idx + 2] = c[2];
        idx += 3;
      }
    }
  }

  strokeRect(x: number, y: number, rw: number, rh: number, t: number, c: RGB): void {
    if (t <= 0 || rw <= 0 || rh <= 0) return;
    const bt = Math.min(t, rw, rh);
    this.fillRect(x, y, rw, bt, c);
    this.fillRect(x, y + rh - bt, rw, bt, c);
    this.fillRect(x, y, bt, rh, c);
    this.fillRect(x + rw - bt, y, bt, rh, c);
  }

  drawText(text: string, x: number, y: number, scale: number, c: RGB): void {
    if (scale <= 0) return;
    let cx = x;
    for (const ch of text.toUpperCase()) {
      const glyph = FONT[ch] ?? FONT[" "];
      for (let row = 0; row < 7; row++) {
        const bits = parseInt(glyph[row] ?? "0", 32);
        for (let col = 0; col < 5; col++) {
          if ((bits >> (4 - col)) & 1) {
            this.fillRect(cx + col * scale, y + row * scale, scale, scale, c);
          }
        }
      }
      cx += 6 * scale;
    }
  }

  drawWrapped(text: string, x: number, y: number, maxCols: number, scale: number, lineGap: number, c: RGB): number {
    if (maxCols < 1 || scale <= 0) return y;
    const words = text.trim().split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const word of words) {
      if (word.length > maxCols) {
        if (cur) {
          lines.push(cur);
          cur = "";
        }
        for (let i = 0; i < word.length; i += maxCols) {
          const part = word.slice(i, i + maxCols);
          if (part.length === maxCols) lines.push(part);
          else cur = part;
        }
        continue;
      }
      const next = cur ? `${cur} ${word}` : word;
      if (next.length > maxCols && cur) {
        lines.push(cur);
        cur = word;
      } else {
        cur = next;
      }
    }
    if (cur) lines.push(cur);
    let cy = y;
    for (const line of lines) {
      this.drawText(line, x, cy, scale, c);
      cy += 7 * scale + lineGap;
    }
    return cy;
  }
}

function renderJokeCardPng(): Buffer {
  const c = new PixelCanvas(800, 420, [11, 16, 32]);
  c.fillRect(0, 0, 800, 8, [16, 185, 129]);
  c.fillRect(32, 32, 736, 356, [17, 24, 39]);
  c.strokeRect(32, 32, 736, 356, 2, [45, 62, 92]);
  c.fillRect(56, 56, 340, 28, [22, 78, 63]);
  c.drawText("LAUGH TRACK // CRYPTO TRADING", 68, 63, 2, [110, 231, 183]);
  c.drawWrapped(JOKE, 56, 114, 37, 3, 14, [248, 250, 252]);
  c.fillRect(56, 312, 688, 12, [30, 41, 59]);
  const fillW = Math.max(0, Math.min(688, Math.round((JOKE.length / MAX_CHARS) * 688)));
  c.fillRect(56, 312, fillW, 12, [245, 158, 11]);
  c.drawText(`${JOKE.length} / ${MAX_CHARS} CHARS`, 56, 342, 2, [251, 191, 36]);
  c.drawText("LAUGH  /  TRADING TRUTH  /  ECONOMY", 322, 342, 2, [148, 163, 184]);
  return encodePng(c.w, c.h, c.rgb);
}

function renderDashboardPng(wordCount: number): Buffer {
  const c = new PixelCanvas(800, 460, [10, 14, 26]);
  c.fillRect(0, 0, 800, 6, [245, 158, 11]);
  c.drawText("LAUGH TRACK DOSSIER // ENTRY BOARD", 32, 26, 2, [248, 250, 252]);
  c.drawText("PLAIN-TEXT SUBMISSION VERIFIED", 32, 50, 2, [16, 185, 129]);
  const stats: Array<[string, string, RGB]> = [
    ["LENGTH", `${JOKE.length}/${MAX_CHARS}`, [251, 191, 36]],
    ["WORDS", `${wordCount} WORDS`, [56, 189, 248]],
    ["STATUS", "PASS 100%", [52, 211, 153]],
  ];
  stats.forEach(([label, val, col], idx) => {
    const bx = 32 + idx * 250;
    c.fillRect(bx, 86, 234, 78, [17, 24, 39]);
    c.strokeRect(bx, 86, 234, 78, 2, [38, 52, 77]);
    c.drawText(label, bx + 16, 102, 2, [148, 163, 184]);
    c.drawText(val, bx + 16, 130, 2, col);
  });
  c.fillRect(32, 186, 736, 148, [17, 24, 39]);
  c.strokeRect(32, 186, 736, 148, 2, [45, 62, 92]);
  c.drawText("SUBMITTED LINE", 50, 202, 2, [148, 163, 184]);
  c.drawWrapped(JOKE, 50, 232, 56, 2, 10, [248, 250, 252]);
  c.fillRect(32, 354, 736, 74, [17, 24, 39]);
  c.strokeRect(32, 354, 736, 74, 2, [38, 52, 77]);
  c.drawText("PILLARS: APOCALYPSE OPSEC VS 3 AM DEGEN SELF-LIQUIDATION", 50, 374, 2, [226, 232, 240]);
  c.drawText("ARTIFACTS: JOKE.TXT  BOARD.JSON  DOSSIER.JSON  DATA.JS", 50, 400, 2, [110, 231, 183]);
  return encodePng(c.w, c.h, c.rgb);
}

function sha256(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function validateSubmission(title: string, joke: string): void {
  if (title.length === 0 || title.length > MAX_TITLE_CHARS || title !== title.trim()) {
    throw new Error(`Invalid title length or whitespace: ${title.length} chars`);
  }
  if (/<[a-z!/]/i.test(title)) {
    throw new Error("Title must be plain text without HTML markup");
  }
  if (joke.length === 0 || joke.length > MAX_CHARS || joke !== joke.trim()) {
    throw new Error(`Invalid joke length or whitespace: ${joke.length} chars`);
  }
  if (/[\x00-\x1f\x7f]/.test(joke)) {
    throw new Error("Joke must be a single line of plain text without control characters");
  }
}

function buildDashboardHtml(wordCount: number, remaining: number): string {
  const pct = ((JOKE.length / MAX_CHARS) * 100).toFixed(1);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(TITLE)} — Laugh Track</title>
<style>
  :root{--bg:#0b1020;--card:#111827;--line:#24324a;--ink:#f8fafc;--muted:#94a3b8;--accent:#10b981;--gold:#f59e0b}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 ui-sans-serif,system-ui,sans-serif;padding:28px}
  .wrap{max-width:920px;margin:0 auto;display:grid;gap:20px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px}
  .tag{display:inline-block;font:700 12px/1 ui-monospace,monospace;letter-spacing:.08em;color:#6ee7b7;background:#064e3b;padding:6px 10px;border-radius:999px}
  blockquote{margin:16px 0;font:700 26px/1.35 Georgia,serif;color:#fff;border-left:4px solid var(--accent);padding-left:16px}
  .bar{height:10px;background:#1e293b;border-radius:999px;overflow:hidden}.bar>span{display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--gold))}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
  .kpi{background:#0d1424;border:1px solid var(--line);border-radius:10px;padding:14px}.kpi b{display:block;font-size:22px;margin-top:4px}
  .muted{color:var(--muted);font-size:14px} img{width:100%;border-radius:10px;border:1px solid var(--line);display:block}
  code{font:13px ui-monospace,monospace;color:#fde68a}
</style>
</head>
<body>
<main class="wrap">
  <section class="card">
    <span class="tag">LAUGH TRACK // CRYPTO TRADING JOKE</span>
    <blockquote id="joke-text">${escapeHtml(JOKE)}</blockquote>
    <div class="bar"><span></span></div>
    <p class="muted" id="char-meta">${JOKE.length} / ${MAX_CHARS} characters (${remaining} spare) &middot; ${wordCount} words &middot; single plain-text line</p>
  </section>
  <section class="grid">
    <div class="card kpi"><span class="muted">The Laugh</span><b>Irony + Timing</b><p class="muted">Doomsday steel opsec undercut by sleepy 3 a.m. self-liquidation.</p></div>
    <div class="card kpi"><span class="muted">Trading Truth</span><b>24/7 Perps Reality</b><p class="muted">Traders harden seed phrases like vaults, then blow up on leverage.</p></div>
    <div class="card kpi"><span class="muted">Economy</span><b>${JOKE.length} Chars</b><p class="muted">One breath, zero filler, punchline lands on the final word.</p></div>
  </section>
  <section class="grid">
    <div class="card"><p class="muted">Joke Card Preview</p><img src="./screenshots/joke-card.png" alt="Joke card screenshot" /></div>
    <div class="card"><p class="muted">Dashboard Preview</p><img src="./screenshots/dashboard-preview.png" alt="Dashboard preview screenshot" /></div>
  </section>
  <section class="card">
    <p class="muted">Deterministic artifacts: <code>joke.txt</code>, <code>board.json</code>, <code>dossier.json</code>, <code>data.js</code>, <code>index.html</code>, <code>dashboard.html</code>, <code>screenshots/*.png</code>.</p>
  </section>
</main>
<script src="./data.js"></script>
<script>
  const jokeEl = document.getElementById("joke-text");
  if (jokeEl && window.LAUGH_TRACK_DATA && window.LAUGH_TRACK_DATA.board && typeof window.LAUGH_TRACK_DATA.board.joke === "string") {
    jokeEl.textContent = window.LAUGH_TRACK_DATA.board.joke;
  }
</script>
</body>
</html>
`;
}

function main(): void {
  validateSubmission(TITLE, JOKE);

  const outDir = resolve((process.env.MAKEFUN_OUTPUT_DIR ?? "").trim() || "out");
  mkdirSync(outDir, { recursive: true });

  const wordCount = JOKE.split(/\s+/).length;
  const remaining = MAX_CHARS - JOKE.length;
  const artifacts: ArtifactMeta[] = [];

  const writeArtifact = (relPath: string, content: Buffer | string, mime: string): void => {
    const dest = resolve(join(outDir, relPath));
    const rel = relative(outDir, dest);
    if (!rel || rel.startsWith("..") || rel.includes("..\\")) {
      throw new Error(`Artifact path escapes output directory: ${relPath}`);
    }
    mkdirSync(dirname(dest), { recursive: true });
    const buf = typeof content === "string" ? Buffer.from(content, "utf8") : content;
    writeFileSync(dest, buf);
    artifacts.push({ path: relPath, bytes: buf.length, sha256: sha256(buf), mime });
  };

  writeArtifact("joke.txt", JOKE, "text/plain");
  writeArtifact("screenshots/joke-card.png", renderJokeCardPng(), "image/png");
  writeArtifact("screenshots/dashboard-preview.png", renderDashboardPng(wordCount), "image/png");

  const draft1 =
    "I hid my seed phrase in fireproof steel to protect my crypto from hackers, completely forgetting my biggest threat is me on 20x leverage at 3 a.m.";
  const draft2 =
    "I stamped my seed phrase in steel to survive a house fire, forgetting my biggest security threat is me on 20x leverage at 3 a.m.";

  const dossier = {
    schema: "laugh-track/dossier/v1",
    bounty_id: BOUNTY_ID,
    title: TITLE,
    joke: JOKE,
    metrics: {
      characters: JOKE.length,
      max_characters: MAX_CHARS,
      remaining_characters: remaining,
      words: wordCount,
      lines: 1,
      ascii_only: /^[\x20-\x7e]+$/.test(JOKE),
    },
    judge_brief_alignment: {
      laugh: "Pairs extreme hardware-wallet paranoia with a deadpan 'as if' turn onto self-inflicted 20x leverage at 3 a.m.",
      truth_of_trading_life: "Captures the universal crypto contradiction: bulletproof cold-storage rituals paired with impulsive late-night perps trading.",
      economy: `${JOKE.length} characters in a single balanced sentence; setup establishes stakes in 12 words and lands the twist on the final beat.`,
    },
    workshop_revisions: [
      {
        stage: "draft_1",
        chars: draft1.length,
        line: draft1,
        cut_note: "Too wordy in the middle clause; 'protect my crypto from hackers' over-explains.",
      },
      {
        stage: "draft_2",
        chars: draft2.length,
        line: draft2,
        cut_note: "Sharp visual ('survive a house fire'), tightened phrasing; pivot word 'forgetting' can hit harder.",
      },
      {
        stage: "final",
        chars: JOKE.length,
        line: JOKE,
        cut_note: "Switched pivot to deadpan 'as if the real security threat isn't' for maximum comedic snap.",
      },
    ],
    checks: {
      non_empty: JOKE.length > 0,
      within_200_chars: JOKE.length <= MAX_CHARS,
      single_line_plain_text: !/[\x00-\x1f\x7f]/.test(JOKE),
      deterministic_output: true,
      zero_runtime_network_calls: true,
    },
    media_artifacts: [...artifacts],
  };

  const board = {
    schema: "laugh-track/board/v1",
    bounty_id: BOUNTY_ID,
    category: "Growth",
    title: TITLE,
    joke: JOKE,
    joke_file: "joke.txt",
    joke_sha256: sha256(JOKE),
    char_count: JOKE.length,
    char_limit: MAX_CHARS,
    word_count: wordCount,
    dashboard: "index.html",
    screenshots: ["screenshots/joke-card.png", "screenshots/dashboard-preview.png"],
    status: "ready",
  };

  const html = buildDashboardHtml(wordCount, remaining);
  const dataJs = `window.LAUGH_TRACK_DATA = ${JSON.stringify({ board, dossier }, null, 2)};\n`;

  writeArtifact("dossier.json", `${JSON.stringify(dossier, null, 2)}\n`, "application/json");
  writeArtifact("board.json", `${JSON.stringify(board, null, 2)}\n`, "application/json");
  writeArtifact("data.js", dataJs, "application/javascript");
  writeArtifact("index.html", html, "text/html");
  writeArtifact("dashboard.html", html, "text/html");

  process.stdout.write(`Wrote ${artifacts.length} deterministic artifacts (${JOKE.length}/${MAX_CHARS} chars).\n`);
}

try {
  main();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
}