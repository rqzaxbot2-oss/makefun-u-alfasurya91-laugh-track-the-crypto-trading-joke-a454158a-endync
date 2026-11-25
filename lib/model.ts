export interface AxisScores {
  laugh: number;
  truth: number;
  economy: number;
}

export interface JokeEntry {
  id: string;
  author: string;
  title: string;
  text: string;
  joke: string;
  chars: number;
  withinLimit: boolean;
  tags: string[];
  seedScores?: Partial<AxisScores>;
  wins: number;
  losses: number;
  draws: number;
  rating: number;
}

export interface PairMatch {
  id: string;
  a: string;
  b: string;
  winner: string | null;
  margin: number;
  reason: string;
}

export interface Snapshot {
  id: string;
  title: string;
  contest: string;
  category: string;
  issue: string;
  capturedAt: string;
  maxChars: number;
  rewardPoolUsd: number;
  weights: AxisScores;
  entries: JokeEntry[];
  matches: PairMatch[];
}

export interface RankedEntry {
  rank: number;
  id: string;
  author: string;
  title: string;
  text: string;
  joke: string;
  chars: number;
  withinLimit: boolean;
  scores: AxisScores & { total: number };
  laugh: number;
  truth: number;
  economy: number;
  score: number;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  payoutUsd: number;
  sharePct: number;
  tier: "gold" | "silver" | "bronze" | "board" | "over-limit";
  verdict: string;
  tags: string[];
}

export interface RadarSummary {
  totalEntries: number;
  validEntries: number;
  overLimitEntries: number;
  totalMatches: number;
  rewardPoolUsd: number;
  maxChars: number;
  avgChars: number;
  avgScore: number;
  topId: string;
  topAuthor: string;
  topJoke: string;
  topScore: number;
  axisAverages: AxisScores;
}

export interface Radar {
  id: string;
  title: string;
  contest: string;
  category: string;
  issue: string;
  capturedAt: string;
  checksum: string;
  weights: AxisScores;
  axes: Array<{ key: keyof AxisScores; label: string; weight: number }>;
  entries: RankedEntry[];
  ranked: RankedEntry[];
  matches: PairMatch[];
  summary: RadarSummary;
  champion: RankedEntry | null;
}

export interface DataScriptOptions {
  id?: string;
  varName?: string;
  tag?: boolean;
}

const DEFAULT_WEIGHTS: AxisScores = { laugh: 0.42, truth: 0.33, economy: 0.25 };
const DEFAULT_MAX_CHARS = 200;
const DEFAULT_POOL_USD = 2;
const DEFAULT_CAPTURED_AT = "2026-01-01T00:00:00Z";

const DEFAULT_JOKES: Array<{ id: string; author: string; title: string; text: string; tags: string[] }> = [
  {
    id: "entry-01",
    author: "candle-witch",
    title: "Concierge Stop-Loss",
    text: "My stop-loss is basically a concierge service that sells my bottom so the candle can immediately reverse without me.",
    tags: ["stop-loss", "candles"]
  },
  {
    id: "entry-02",
    author: "bag-curator",
    title: "Museum of 3x",
    text: "I don't have a portfolio anymore, I have a museum of coins I refused to sell at 3x because I was waiting for 10x.",
    tags: ["portfolio", "greed"]
  },
  {
    id: "entry-03",
    author: "dip-archaeologist",
    title: "Secret Basement",
    text: "Every time I buy the dip, the chart unlocks a secret basement level the developers forgot to mention in the whitepaper.",
    tags: ["dip", "whitepaper"]
  },
  {
    id: "entry-04",
    author: "triangle-prophet",
    title: "Five-Minute Astrology",
    text: "Technical analysis is astrology for people who draw two triangles on a 5-minute chart and still get liquidated by a tweet.",
    tags: ["ta", "liquidation"]
  },
  {
    id: "entry-05",
    author: "zen-liquidator",
    title: "Long-Term Pivot",
    text: "My risk management strategy is closing TradingView, turning off notifications, and calling myself a long-term investor.",
    tags: ["risk", "investor"]
  },
  {
    id: "entry-06",
    author: "gwei-philanthropist",
    title: "Liquidity Donor",
    text: "I paid $42 in gas fees to claim a $3 airdrop, which technically makes me an institutional liquidity donor.",
    tags: ["gas", "airdrop"]
  },
  {
    id: "entry-07",
    author: "twenty-x-monk",
    title: "Generational Lesson",
    text: "Nothing humbles a 20x leverage trader faster than watching a generational entry become a generational lesson in six minutes.",
    tags: ["leverage", "humility"]
  },
  {
    id: "entry-08",
    author: "alert-heirloom",
    title: "Breakeven Ping",
    text: "I set a price alert for breakeven three years ago; if it ever rings I'm framing the notification as a family heirloom.",
    tags: ["breakeven", "alerts"]
  }
];

const HIGH_TRUTH_TERMS = [
  "stop-loss", "liquidat", "leverage", "candle", "whitepaper", "tradingview",
  "breakeven", "airdrop", "gas fee", "bagholder", "slippage", "margin",
  "orderbook", "drawdown", "rug", "staking", "yield", "pnl", "dip"
];

const CORE_TRUTH_TERMS = [
  "crypto", "bitcoin", "btc", "eth", "sol", "coin", "token", "chart",
  "portfolio", "wallet", "investor", "trader", "entry", "exit", "bottom",
  "bull", "bear", "pump", "dump", "liquidity", "whale", "hodl", "fomo",
  "fud", "technical analysis", "alert", "sell", "buy", "market", "10x", "20x", "3x"
];

const LAUGH_PIVOTS = [
  "basically", "technically", "instead", "until", "still", "actually",
  "every time", "nothing", "immediately", "faster", "calling", "forgot",
  "become", "becomes", "museum", "astrology", "concierge", "basement",
  "donor", "heirloom", "lesson", "tweet", "because", "so the"
];

const FILLER_TERMS = ["lol", "lmao", "rofl", "haha", "literally", "to be honest", "in my opinion"];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function pickStr(obj: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const k of keys) {
    const val = obj[k];
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
  }
  return fallback;
}

function pickNum(obj: Record<string, unknown>, keys: string[], fallback: number): number {
  for (const k of keys) {
    const val = obj[k];
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string" && val.trim() !== "") {
      const parsed = Number(val);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function normalizeWeights(raw: unknown): AxisScores {
  const rec = asRecord(raw);
  if (!rec) return { ...DEFAULT_WEIGHTS };
  const l = Math.max(0, pickNum(rec, ["laugh"], DEFAULT_WEIGHTS.laugh));
  const t = Math.max(0, pickNum(rec, ["truth"], DEFAULT_WEIGHTS.truth));
  const e = Math.max(0, pickNum(rec, ["economy"], DEFAULT_WEIGHTS.economy));
  const sum = l + t + e;
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  return { laugh: round2(l / sum), truth: round2(t / sum), economy: round2(1 - round2(l / sum) - round2(t / sum)) };
}

function normalizeEntry(raw: unknown, idx: number, maxChars: number): JokeEntry {
  const fallbackId = `entry-${String(idx + 1).padStart(2, "0")}`;
  if (typeof raw === "string") {
    const text = raw.replace(/\s+/g, " ").trim();
    return {
      id: fallbackId,
      author: `entrant-${idx + 1}`,
      title: `Line ${idx + 1}`,
      text,
      joke: text,
      chars: text.length,
      withinLimit: text.length > 0 && text.length <= maxChars,
      tags: [],
      wins: 0,
      losses: 0,
      draws: 0,
      rating: 1500
    };
  }
  const rec = asRecord(raw) ?? {};
  const id = pickStr(rec, ["id", "slug", "key"], fallbackId);
  const text = pickStr(rec, ["text", "joke", "line", "body", "content", "submission"], "").replace(/\s+/g, " ");
  const author = pickStr(rec, ["author", "handle", "agent", "entrant", "name"], `entrant-${idx + 1}`);
  const title = pickStr(rec, ["title", "label"], id);
  const tags = Array.isArray(rec.tags)
    ? rec.tags.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().toLowerCase())
    : [];
  const scoreObj = asRecord(rec.scores) ?? asRecord(rec.metrics) ?? rec;
  const seedScores: Partial<AxisScores> = {};
  for (const axis of ["laugh", "truth", "economy"] as const) {
    const v = scoreObj[axis];
    if (typeof v === "number" && Number.isFinite(v)) seedScores[axis] = clamp(v, 0, 100);
  }
  return {
    id,
    author,
    title,
    text,
    joke: text,
    chars: text.length,
    withinLimit: text.length > 0 && text.length <= maxChars,
    tags,
    seedScores: Object.keys(seedScores).length > 0 ? seedScores : undefined,
    wins: Math.max(0, Math.floor(pickNum(rec, ["wins"], 0))),
    losses: Math.max(0, Math.floor(pickNum(rec, ["losses"], 0))),
    draws: Math.max(0, Math.floor(pickNum(rec, ["draws"], 0))),
    rating: pickNum(rec, ["rating", "elo"], 1500)
  };
}

function normalizeMatch(raw: unknown, idx: number): PairMatch | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const a = pickStr(rec, ["a", "left", "first", "entryA"], "");
  const b = pickStr(rec, ["b", "right", "second", "entryB"], "");
  if (!a || !b || a === b) return null;
  const winnerRaw = rec.winner;
  const winner = typeof winnerRaw === "string" && (winnerRaw === a || winnerRaw === b) ? winnerRaw : null;
  return {
    id: pickStr(rec, ["id"], `match-${String(idx + 1).padStart(3, "0")}`),
    a,
    b,
    winner,
    margin: round2(Math.abs(pickNum(rec, ["margin", "delta"], winner ? 1 : 0))),
    reason: pickStr(rec, ["reason", "rationale", "note"], winner ? "Recorded pairwise verdict" : "Recorded draw")
  };
}

export function parseSnapshot(input?: unknown): Snapshot {
  let parsed: unknown = input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      parsed = null;
    } else if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      }
    } else {
      parsed = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    }
  }

  const root = asRecord(parsed);
  const maxChars = Math.max(20, Math.floor(root ? pickNum(root, ["maxChars", "charLimit", "limit"], DEFAULT_MAX_CHARS) : DEFAULT_MAX_CHARS));
  const rewardPoolUsd = Math.max(0, round2(root ? pickNum(root, ["rewardPoolUsd", "rewardPool", "poolUsd", "pool"], DEFAULT_POOL_USD) : DEFAULT_POOL_USD));

  let rawEntries: unknown[] | null = null;
  if (Array.isArray(parsed)) {
    rawEntries = parsed;
  } else if (root) {
    for (const k of ["entries", "submissions", "jokes", "items", "candidates", "lines", "rows", "board"]) {
      if (Array.isArray(root[k])) {
        rawEntries = root[k] as unknown[];
        break;
      }
    }
  }

  const sourceEntries = rawEntries !== null ? rawEntries : DEFAULT_JOKES;
  const seen = new Set<string>();
  const entries = sourceEntries.map((item, idx) => {
    const entry = normalizeEntry(item, idx, maxChars);
    let uniqueId = entry.id;
    let suffix = 2;
    while (seen.has(uniqueId)) {
      uniqueId = `${entry.id}-${suffix++}`;
    }
    seen.add(uniqueId);
    return uniqueId === entry.id ? entry : { ...entry, id: uniqueId };
  });

  let rawMatches: unknown[] = [];
  if (root) {
    for (const k of ["matches", "comparisons", "pairs", "duels", "votes", "judgments"]) {
      if (Array.isArray(root[k])) {
        rawMatches = root[k] as unknown[];
        break;
      }
    }
  }
  const matches = rawMatches
    .map((m, idx) => normalizeMatch(m, idx))
    .filter((m): m is PairMatch => m !== null && seen.has(m.a) && seen.has(m.b));

  return {
    id: root ? pickStr(root, ["id", "snapshotId"], "laugh-track-snapshot-01") : "laugh-track-snapshot-01",
    title: root ? pickStr(root, ["title", "name"], "Laugh Track: Crypto Trading Joke Board") : "Laugh Track: Crypto Trading Joke Board",
    contest: root ? pickStr(root, ["contest", "bounty"], "Laugh Track: The Crypto Trading Joke Contest") : "Laugh Track: The Crypto Trading Joke Contest",
    category: root ? pickStr(root, ["category"], "Growth") : "Growth",
    issue: root ? pickStr(root, ["issue", "edition", "round"], "Issue #01") : "Issue #01",
    capturedAt: root ? pickStr(root, ["capturedAt", "generatedAt", "updatedAt", "timestamp"], DEFAULT_CAPTURED_AT) : DEFAULT_CAPTURED_AT,
    maxChars,
    rewardPoolUsd,
    weights: normalizeWeights(root?.weights),
    entries,
    matches
  };
}

function scoreEntryAxes(entry: JokeEntry, maxChars: number): AxisScores {
  const text = entry.text;
  if (!text) return { laugh: 0, truth: 0, economy: 0 };
  const lower = text.toLowerCase();
  const words = lower.match(/[a-z0-9$'-]+/g) ?? [];
  const uniqueWords = new Set(words);
  const lexicalDensity = words.length > 0 ? uniqueWords.size / words.length : 0;

  let laugh = 54;
  let pivotHits = 0;
  for (const term of LAUGH_PIVOTS) {
    if (lower.includes(term)) pivotHits++;
  }
  laugh += Math.min(26, pivotHits * 8.5);
  if (/[,;:\u2014-]/.test(text)) laugh += 8;
  if (/\b(my|i|i'm|me|myself)\b/.test(lower)) laugh += 5;
  if (/\d+x|\$\d+/.test(lower)) laugh += 4;
  if (/!{2,}/.test(text)) laugh -= 10;
  if (text === text.toUpperCase() && text.length > 10) laugh -= 14;
  for (const filler of FILLER_TERMS) {
    if (lower.includes(filler)) laugh -= 8;
  }

  let truth = 42;
  let highHits = 0;
  for (const term of HIGH_TRUTH_TERMS) {
    if (lower.includes(term)) highHits++;
  }
  let coreHits = 0;
  for (const term of CORE_TRUTH_TERMS) {
    if (lower.includes(term)) coreHits++;
  }
  truth += Math.min(34, highHits * 11.5);
  truth += Math.min(20, coreHits * 5.5);
  if (words.length >= 8 && words.length <= 28) truth += 4;

  let economy: number;
  if (entry.chars > maxChars) {
    economy = Math.max(0, 28 - (entry.chars - maxChars) * 0.6);
  } else {
    const sweet = entry.chars >= 60 && entry.chars <= 135
      ? 100
      : entry.chars < 60
        ? 72 + (entry.chars / 60) * 24
        : 100 - ((entry.chars - 135) / Math.max(1, maxChars - 135)) * 28;
    economy = sweet * 0.65 + clamp(lexicalDensity * 100, 40, 100) * 0.35;
    for (const filler of FILLER_TERMS) {
      if (lower.includes(filler)) economy -= 9;
    }
  }

  return {
    laugh: round2(entry.seedScores?.laugh ?? clamp(laugh, 5, 99)),
    truth: round2(entry.seedScores?.truth ?? clamp(truth, 5, 99)),
    economy: round2(entry.seedScores?.economy ?? clamp(economy, 0, 99))
  };
}

function fnv1aHex(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const k of keys) {
      out[k] = sortKeysDeep((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function allocatePayouts(validCount: number, poolUsd: number): number[] {
  if (validCount <= 0 || poolUsd <= 0) return [];
  const totalCents = Math.round(poolUsd * 100);
  const rawWeights = Array.from({ length: validCount }, (_, i) => 1 / Math.pow(i + 1, 1.35));
  const weightSum = rawWeights.reduce((acc, w) => acc + w, 0);
  const cents = rawWeights.map((w) => Math.floor((w / weightSum) * totalCents));
  let remainder = totalCents - cents.reduce((acc, c) => acc + c, 0);
  for (let i = 0; remainder > 0; i = (i + 1) % validCount) {
    cents[i]++;
    remainder--;
  }
  return cents.map((c) => round2(c / 100));
}

function verdictFor(entry: RankedEntry): string {
  if (!entry.withinLimit) return "Disqualified for exceeding character cap";
  if (entry.rank === 1) return "Headline punchline with sharpest balance of laugh, truth, and economy";
  if (entry.laugh >= entry.truth && entry.laugh >= entry.economy) return "Wins on comedic timing and twist";
  if (entry.truth >= entry.laugh && entry.truth >= entry.economy) return "Hits hardest on authentic trading pain";
  return "Stands out for crisp line economy";
}

function isSnapshot(value: unknown): value is Snapshot {
  const rec = asRecord(value);
  return Boolean(rec && Array.isArray(rec.entries) && Array.isArray(rec.matches) && asRecord(rec.weights));
}

function isRadar(value: unknown): value is Radar {
  const rec = asRecord(value);
  return Boolean(rec && Array.isArray(rec.ranked) && asRecord(rec.summary) && typeof rec.checksum === "string");
}

export function buildRadar(input?: Snapshot | unknown): Radar {
  const snapshot = isSnapshot(input) ? input : parseSnapshot(input);
  const scored = snapshot.entries.map((entry) => {
    const axes = scoreEntryAxes(entry, snapshot.maxChars);
    const total = round2(
      axes.laugh * snapshot.weights.laugh +
      axes.truth * snapshot.weights.truth +
      axes.economy * snapshot.weights.economy
    );
    return { entry, axes, total };
  });

  const explicitMap = new Map<string, PairMatch>();
  for (const m of snapshot.matches) {
    const key = m.a < m.b ? `${m.a}::${m.b}` : `${m.b}::${m.a}`;
    explicitMap.set(key, m);
  }

  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  const draws = new Map<string, number>();
  const elo = new Map<string, number>();
  for (const item of scored) {
    wins.set(item.entry.id, 0);
    losses.set(item.entry.id, 0);
    draws.set(item.entry.id, 0);
    elo.set(item.entry.id, 1500);
  }

  const matches: PairMatch[] = [];
  let matchIdx = 1;
  for (let i = 0; i < scored.length; i++) {
    for (let j = i + 1; j < scored.length; j++) {
      const left = scored[i];
      const right = scored[j];
      const pairKey = left.entry.id < right.entry.id
        ? `${left.entry.id}::${right.entry.id}`
        : `${right.entry.id}::${left.entry.id}`;
      const existing = explicitMap.get(pairKey);
      let match: PairMatch;
      if (existing) {
        match = existing;
      } else {
        const lValid = left.entry.withinLimit;
        const rValid = right.entry.withinLimit;
        let winner: string | null = null;
        let reason = "Dead heat across all three axes";
        const diff = round2(left.total - right.total);
        if (lValid !== rValid) {
          winner = lValid ? left.entry.id : right.entry.id;
          reason = "Valid 200-char compliance beats over-limit line";
        } else if (Math.abs(diff) > 0.25) {
          winner = diff > 0 ? left.entry.id : right.entry.id;
          const lAxes = [
            left.axes.laugh > right.axes.laugh,
            left.axes.truth > right.axes.truth,
            left.axes.economy > right.axes.economy
          ].filter(Boolean).length;
          reason = diff > 0
            ? `${left.entry.id} leads by ${Math.abs(diff).toFixed(2)} pts (${lAxes}/3 axes)`
            : `${right.entry.id} leads by ${Math.abs(diff).toFixed(2)} pts (${3 - lAxes}/3 axes)`;
        } else {
          const lCount = (left.axes.laugh > right.axes.laugh ? 1 : 0) +
            (left.axes.truth > right.axes.truth ? 1 : 0) +
            (left.axes.economy > right.axes.economy ? 1 : 0);
          const rCount = (right.axes.laugh > left.axes.laugh ? 1 : 0) +
            (right.axes.truth > left.axes.truth ? 1 : 0) +
            (right.axes.economy > left.axes.economy ? 1 : 0);
          if (lCount !== rCount) {
            winner = lCount > rCount ? left.entry.id : right.entry.id;
            reason = "Axis majority tiebreak";
          }
        }
        match = {
          id: `match-${String(matchIdx++).padStart(3, "0")}`,
          a: left.entry.id,
          b: right.entry.id,
          winner,
          margin: round2(Math.abs(diff)),
          reason
        };
      }
      matches.push(match);

      const ra = elo.get(match.a) ?? 1500;
      const rb = elo.get(match.b) ?? 1500;
      const expectedA = 1 / (1 + Math.pow(10, (rb - ra) / 400));
      const scoreA = match.winner === match.a ? 1 : match.winner === match.b ? 0 : 0.5;
      const delta = 24 * (scoreA - expectedA);
      elo.set(match.a, round2(ra + delta));
      elo.set(match.b, round2(rb - delta));
      if (match.winner === match.a) {
        wins.set(match.a, (wins.get(match.a) ?? 0) + 1);
        losses.set(match.b, (losses.get(match.b) ?? 0) + 1);
      } else if (match.winner === match.b) {
        wins.set(match.b, (wins.get(match.b) ?? 0) + 1);
        losses.set(match.a, (losses.get(match.a) ?? 0) + 1);
      } else {
        draws.set(match.a, (draws.get(match.a) ?? 0) + 1);
        draws.set(match.b, (draws.get(match.b) ?? 0) + 1);
      }
    }
  }

  const prelim = scored.map(({ entry, axes, total }) => {
    const w = wins.get(entry.id) ?? 0;
    const l = losses.get(entry.id) ?? 0;
    const d = draws.get(entry.id) ?? 0;
    const played = w + l + d;
    const winRate = played > 0 ? round2(((w + d * 0.5) / played) * 100) : 50;
    const composite = round2(total * 0.7 + winRate * 0.3);
    return {
      entry,
      axes,
      total,
      composite,
      elo: round2(elo.get(entry.id) ?? 1500),
      wins: w,
      losses: l,
      draws: d,
      winRate
    };
  });

  prelim.sort((x, y) => {
    if (x.entry.withinLimit !== y.entry.withinLimit) return x.entry.withinLimit ? -1 : 1;
    if (y.composite !== x.composite) return y.composite - x.composite;
    if (y.elo !== x.elo) return y.elo - x.elo;
    if (y.winRate !== x.winRate) return y.winRate - x.winRate;
    if (x.entry.chars !== y.entry.chars) return x.entry.chars - y.entry.chars;
    return x.entry.id.localeCompare(y.entry.id);
  });

  const validCount = prelim.filter((p) => p.entry.withinLimit).length;
  const payouts = allocatePayouts(validCount, snapshot.rewardPoolUsd);
  let payoutCursor = 0;

  const ranked: RankedEntry[] = prelim.map((p, idx) => {
    const rank = idx + 1;
    const payoutUsd = p.entry.withinLimit ? (payouts[payoutCursor++] ?? 0) : 0;
    const sharePct = snapshot.rewardPoolUsd > 0 ? round2((payoutUsd / snapshot.rewardPoolUsd) * 100) : 0;
    const tier: RankedEntry["tier"] = !p.entry.withinLimit
      ? "over-limit"
      : rank === 1
        ? "gold"
        : rank === 2
          ? "silver"
          : rank === 3
            ? "bronze"
            : "board";
    const row: RankedEntry = {
      rank,
      id: p.entry.id,
      author: p.entry.author,
      title: p.entry.title,
      text: p.entry.text,
      joke: p.entry.text,
      chars: p.entry.chars,
      withinLimit: p.entry.withinLimit,
      scores: { laugh: p.axes.laugh, truth: p.axes.truth, economy: p.axes.economy, total: p.composite },
      laugh: p.axes.laugh,
      truth: p.axes.truth,
      economy: p.axes.economy,
      score: p.composite,
      elo: p.elo,
      wins: p.wins,
      losses: p.losses,
      draws: p.draws,
      winRate: p.winRate,
      payoutUsd,
      sharePct,
      tier,
      verdict: "",
      tags: p.entry.tags
    };
    row.verdict = verdictFor(row);
    return row;
  });

  const count = ranked.length;
  const avg = (fn: (r: RankedEntry) => number): number =>
    count > 0 ? round2(ranked.reduce((s, r) => s + fn(r), 0) / count) : 0;
  const champion = ranked[0] ?? null;

  const summary: RadarSummary = {
    totalEntries: count,
    validEntries: validCount,
    overLimitEntries: count - validCount,
    totalMatches: matches.length,
    rewardPoolUsd: snapshot.rewardPoolUsd,
    maxChars: snapshot.maxChars,
    avgChars: avg((r) => r.chars),
    avgScore: avg((r) => r.score),
    topId: champion?.id ?? "",
    topAuthor: champion?.author ?? "",
    topJoke: champion?.text ?? "",
    topScore: champion?.score ?? 0,
    axisAverages: {
      laugh: avg((r) => r.laugh),
      truth: avg((r) => r.truth),
      economy: avg((r) => r.economy)
    }
  };

  const checksum = fnv1aHex(canonicalJson({
    id: snapshot.id,
    issue: snapshot.issue,
    weights: snapshot.weights,
    ranked: ranked.map((r) => [r.rank, r.id, r.score, r.elo, r.payoutUsd, r.text])
  }));

  return {
    id: snapshot.id,
    title: snapshot.title,
    contest: snapshot.contest,
    category: snapshot.category,
    issue: snapshot.issue,
    capturedAt: snapshot.capturedAt,
    checksum,
    weights: snapshot.weights,
    axes: [
      { key: "laugh", label: "Laugh", weight: snapshot.weights.laugh },
      { key: "truth", label: "Trading Truth", weight: snapshot.weights.truth },
      { key: "economy", label: "Line Economy", weight: snapshot.weights.economy }
    ],
    entries: ranked,
    ranked,
    matches,
    summary,
    champion
  };
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function boardIssue(input?: Radar | Snapshot | unknown): string {
  const radar = isRadar(input) ? input : buildRadar(input);
  const s = radar.summary;
  const lines: string[] = [
    `# ${radar.title} — ${radar.issue}`,
    "",
    `- Contest: ${radar.contest}`,
    `- Category: ${radar.category} | Entries: ${s.totalEntries} (${s.validEntries} valid, ${s.overLimitEntries} over-limit) | Pairwise Matches: ${s.totalMatches}`,
    `- Reward Pool: $${s.rewardPoolUsd.toFixed(2)} USD | Character Cap: ${s.maxChars} | Checksum: \`${radar.checksum}\``,
    ""
  ];

  if (radar.champion) {
    lines.push("## Top Line", "", `> ${radar.champion.text}`, "");
    lines.push(
      `Ranked #1: **${radar.champion.title}** by \`${radar.champion.author}\` ` +
      `(${radar.champion.chars}/${s.maxChars} chars, score ${radar.champion.score.toFixed(2)}, ` +
      `Elo ${radar.champion.elo.toFixed(2)}, payout $${radar.champion.payoutUsd.toFixed(2)}).`,
      ""
    );
  }

  lines.push(
    "## Leaderboard",
    "",
    "| Rank | Entry | Author | Chars | Laugh | Truth | Economy | Score | W-L-D | Payout |",
    "| ---: | :--- | :--- | ---: | ---: | ---: | ---: | ---: | :---: | ---: |"
  );

  for (const r of radar.ranked) {
    lines.push(
      `| ${r.rank} | ${escapeCell(r.title)} | ${escapeCell(r.author)} | ${r.chars} | ` +
      `${r.laugh.toFixed(1)} | ${r.truth.toFixed(1)} | ${r.economy.toFixed(1)} | ` +
      `${r.score.toFixed(2)} | ${r.wins}-${r.losses}-${r.draws} | $${r.payoutUsd.toFixed(2)} |`
    );
  }

  lines.push(
    "",
    "## Axis Breakdown",
    "",
    `- Laugh (${Math.round(radar.weights.laugh * 100)}%): avg ${s.axisAverages.laugh.toFixed(2)}`,
    `- Trading Truth (${Math.round(radar.weights.truth * 100)}%): avg ${s.axisAverages.truth.toFixed(2)}`,
    `- Line Economy (${Math.round(radar.weights.economy * 100)}%): avg ${s.axisAverages.economy.toFixed(2)}`,
    "",
    "## Board Status",
    "",
    s.overLimitEntries > 0
      ? `Warning: ${s.overLimitEntries} submission(s) exceeded the ${s.maxChars}-character cap and were excluded from payouts.`
      : `Clean board: all ${s.totalEntries} submissions respect the ${s.maxChars}-character cap and passed deterministic pairwise judging.`
  );

  return lines.join("\n") + "\n";
}

function escapeHtmlJson(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function dataScript(data: unknown, idOrOpts?: string | DataScriptOptions): string {
  const safeJson = escapeHtmlJson(canonicalJson(data));
  const opts: DataScriptOptions = typeof idOrOpts === "string" ? { id: idOrOpts } : (idOrOpts ?? {});
  if (opts.tag === false) return safeJson;
  if (opts.varName) {
    const safeVar = opts.varName.replace(/[^A-Za-z0-9_$.]/g, "");
    return `<script>window.${safeVar || "__BOARD_DATA__"} = ${safeJson};</script>`;
  }
  const safeId = (opts.id ?? "board-data").replace(/[^A-Za-z0-9_:-]/g, "");
  return `<script id="${safeId || "board-data"}" type="application/json">${safeJson}</script>`;
}