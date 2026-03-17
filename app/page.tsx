
"use client";

import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "trade_mentor_app_v2";

const preChecklistItems = [
  "This trade matches my setup",
  "Risk is defined before entry",
  "Stop loss is placed",
  "Reward-to-risk is acceptable",
  "I waited for confirmation",
  "No boredom or impulse entry",
  "No high-impact news nearby",
  "This matches my written rules",
];

const postChecklistItems = [
  "I followed my plan",
  "I did not move my stop emotionally",
  "I did not exit early from fear",
  "I did not overstay from greed",
  "My entry was patient and planned",
  "My execution matched my rules",
  "I reviewed what I learned",
];

const defaultRules = [
  "Trade only your defined setup",
  "Risk must be defined before entry",
  "Do not trade near high-impact news",
  "Wait for confirmation candle",
  "Minimum 2:1 reward-to-risk",
  "Only trade during planned session",
];

const defaultNews = [
  {
    id: 1,
    event: "CPI",
    market: "USD / Indices / Gold",
    time: "08:30 AM",
    impact: "High",
    minutesAway: 28,
  },
  {
    id: 2,
    event: "Fed Chair Speech",
    market: "USD / Bonds / Indices",
    time: "01:00 PM",
    impact: "High",
    minutesAway: 298,
  },
  {
    id: 3,
    event: "Crude Oil Inventories",
    market: "Oil / CAD",
    time: "09:30 AM",
    impact: "Medium",
    minutesAway: 88,
  },
];

type Trade = {
  id: string | null;
  market: string;
  direction: string;
  entry: string;
  stop: string;
  target: string;
  exitPrice: string;
  riskDollars: string;
  pnlDollars: string;
  size: string;
  setup: string;
  setupTag: string;
  timeframe: string;
  session: string;
  emotion: string;
  newsRisk: string;
  result: string;
  tradeDate: string;
  entryTime: string;
  exitTime: string;
  notesBefore: string;
  notesAfter: string;
  lesson: string;
  preChecklist: boolean[];
  postChecklist: boolean[];
  screenshots: {
    before: string;
    after: string;
  };
  createdAt: string;
  updatedAt?: string;
};

type AppState = {
  profile: {
    traderName: string;
    strategyName: string;
    riskRule: string;
    avoidNewsWindow: string;
  };
  rules: string[];
  trades: Trade[];
  draftRule: string;
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(
    2,
    "0"
  )}`;
}

function getEmptyTradeForm(): Trade {
  return {
    id: null,
    market: "",
    direction: "Long",
    entry: "",
    stop: "",
    target: "",
    exitPrice: "",
    riskDollars: "",
    pnlDollars: "",
    size: "",
    setup: "",
    setupTag: "Breakout",
    timeframe: "15m",
    session: "New York",
    emotion: "Calm",
    newsRisk: "No",
    result: "Open",
    tradeDate: getTodayDate(),
    entryTime: getCurrentTime(),
    exitTime: "",
    notesBefore: "",
    notesAfter: "",
    lesson: "",
    preChecklist: Array(preChecklistItems.length).fill(false),
    postChecklist: Array(postChecklistItems.length).fill(false),
    screenshots: {
      before: "",
      after: "",
    },
    createdAt: new Date().toISOString(),
  };
}

function getInitialState(): AppState {
  return {
    profile: {
      traderName: "Trader",
      strategyName: "Breakout + confirmation",
      riskRule: "Max 1% risk per trade",
      avoidNewsWindow: "15",
    },
    rules: defaultRules,
    trades: [],
    draftRule: "",
  };
}

function loadState(): AppState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(data: AppState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function scoreChecklist(list: boolean[]) {
  const total = list.length || 1;
  const checked = list.filter(Boolean).length;
  return Math.round((checked / total) * 100);
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function currency(n: string) {
  return n ? `$${n}` : "-";
}

function rrFromTrade(trade: Trade) {
  const entry = Number(trade.entry || 0);
  const stop = Number(trade.stop || 0);
  const target = Number(trade.target || 0);
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  return risk > 0 ? (reward / risk).toFixed(2) : "0.00";
}

function analyzeTrade(trade: Trade, rules: string[]) {
  const rr = Number(rrFromTrade(trade));
  let quality = scoreChecklist(trade.preChecklist) * 0.55;

  if (rr >= 2) quality += 18;
  else if (rr >= 1.5) quality += 10;
  else if (rr > 0) quality += 3;

  if (trade.newsRisk === "No") quality += 10;
  else quality -= 15;

  if (trade.emotion === "Calm") quality += 8;
  if (trade.emotion === "Focused") quality += 6;
  if (trade.emotion === "FOMO" || trade.emotion === "Anxious") quality -= 7;
  if (trade.emotion === "Revenge") quality -= 14;
  if (trade.screenshots.before) quality += 4;

  quality = clamp(Math.round(quality));

  let verdict = "Average";
  if (quality >= 80) verdict = "Strong";
  else if (quality >= 65) verdict = "Good";
  else if (quality >= 45) verdict = "Needs work";
  else verdict = "Low quality";

  const strengths: string[] = [];
  const concerns: string[] = [];
  const findings: string[] = [];

  if (trade.screenshots.before) {
    strengths.push("Pre-trade screenshot is saved, which improves visual review.");
  } else {
    concerns.push("No pre-trade screenshot is uploaded.");
  }

  if (rr >= 2) strengths.push("Reward-to-risk is aligned with a disciplined setup.");
  else concerns.push("Reward-to-risk looks weak for a high-quality setup.");

  if (trade.newsRisk === "No") strengths.push("Trade is marked outside the news danger window.");
  else concerns.push("Trade is marked near high-impact news.");

  if (scoreChecklist(trade.preChecklist) >= 75) {
    strengths.push("Pre-trade checklist suggests a planned entry.");
  } else {
    concerns.push("Checklist completion suggests this setup may not have been fully confirmed.");
  }

  if (trade.emotion === "Calm" || trade.emotion === "Focused") {
    strengths.push("Logged mental state looks stable for decision-making.");
  } else {
    concerns.push("Logged mental state may have reduced execution quality.");
  }

  const matchedRules = rules.filter((rule) => {
    const text = rule.toLowerCase();
    if (text.includes("risk") && trade.riskDollars) return true;
    if (text.includes("news") && trade.newsRisk === "No") return true;
    if (text.includes("reward") && rr >= 2) return true;
    if (text.includes("confirmation") && trade.preChecklist[4]) return true;
    if (text.includes("setup") && trade.preChecklist[0]) return true;
    if (text.includes("session") && trade.session) return true;
    return false;
  });

  findings.push(`Rule alignment: ${matchedRules.length}/${rules.length}`);
  findings.push(`Pre-trade process score: ${scoreChecklist(trade.preChecklist)}/100`);
  findings.push(`Post-trade review score: ${scoreChecklist(trade.postChecklist)}/100`);
  findings.push(`Reward-to-risk: ${rrFromTrade(trade)}`);

  return {
    rr: rrFromTrade(trade),
    quality,
    verdict,
    strengths,
    concerns,
    findings,
  };
}

function Panel({
  title,
  desc,
  children,
  className = "",
}: {
  title?: string;
  desc?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-zinc-800 bg-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] ${className}`}
    >
      {(title || desc) && (
        <div className="border-b border-zinc-800 p-5">
          {title ? <h3 className="text-lg font-semibold text-white">{title}</h3> : null}
          {desc ? <p className="mt-1 text-sm text-zinc-400">{desc}</p> : null}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs text-zinc-500">{note}</p>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
      <div
        className="h-full rounded-full bg-white transition-all"
        style={{ width: `${clamp(value)}%` }}
      />
    </div>
  );
}

export default function Page() {
  const [state, setState] = useState<AppState>(getInitialState());
  const [tab, setTab] = useState("dashboard");
  const [tradeForm, setTradeForm] = useState<Trade>(getEmptyTradeForm());
  const [search, setSearch] = useState("");

  useEffect(() => {
    const existing = loadState();
    if (existing) setState(existing);
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const enrichedTrades = useMemo(() => {
    return state.trades.map((trade) => ({
      ...trade,
      analysis: analyzeTrade(trade, state.rules),
    }));
  }, [state.trades, state.rules]);

  const filteredTrades = useMemo(() => {
    if (!search.trim()) return enrichedTrades;
    const q = search.toLowerCase();
    return enrichedTrades.filter((t) =>
      [
        t.market,
        t.setup,
        t.setupTag,
        t.timeframe,
        t.direction,
        t.session,
        t.emotion,
        t.result,
        t.tradeDate,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [enrichedTrades, search]);

  const averageQuality = enrichedTrades.length
    ? Math.round(
        enrichedTrades.reduce((sum, t) => sum + t.analysis.quality, 0) / enrichedTrades.length
      )
    : 0;

  const averagePre = enrichedTrades.length
    ? Math.round(
        enrichedTrades.reduce((sum, t) => sum + scoreChecklist(t.preChecklist), 0) /
          enrichedTrades.length
      )
    : 0;

  const calmTradesPct = enrichedTrades.length
    ? Math.round(
        (enrichedTrades.filter((t) => t.emotion === "Calm" || t.emotion === "Focused").length /
          enrichedTrades.length) *
          100
      )
    : 0;

  const closedTrades = enrichedTrades.filter((t) => t.result !== "Open");
  const winRate = closedTrades.length
    ? Math.round(
        (closedTrades.filter((t) => t.result === "Win").length / closedTrades.length) * 100
      )
    : 0;

  const mentorSummary = useMemo(() => {
    if (!enrichedTrades.length) {
      return [
        "Start by journaling your first trades so the mentor can learn your patterns.",
        "Upload a before screenshot for every trade so the mentor can review context.",
        "Use the checklist to measure process, not profit pressure.",
      ];
    }

    const lowQuality = enrichedTrades.filter((t) => t.analysis.quality < 60).length;
    const highQuality = enrichedTrades.filter((t) => t.analysis.quality >= 80).length;
    const emotional = enrichedTrades.filter((t) =>
      ["FOMO", "Revenge", "Anxious"].includes(t.emotion)
    ).length;
    const newsRisk = enrichedTrades.filter((t) => t.newsRisk === "Yes").length;
    const withBeforeShot = enrichedTrades.filter((t) => t.screenshots.before).length;

    const items: string[] = [];
    if (highQuality > 0) items.push(`${highQuality} trades show strong process quality.`);
    if (lowQuality > 0) items.push(`${lowQuality} trades show weak process quality to review.`);
    if (emotional > 0) items.push(`${emotional} trades were logged in emotional states.`);
    if (newsRisk > 0) items.push(`${newsRisk} trades were marked near high-impact news.`);
    if (withBeforeShot < enrichedTrades.length) {
      items.push("Some trades are missing pre-trade screenshots.");
    }
    if (averagePre >= 75) items.push(`Average pre-trade checklist score is ${averagePre}.`);

    return items.slice(0, 4);
  }, [enrichedTrades, averagePre]);

  function resetForm() {
    setTradeForm(getEmptyTradeForm());
  }

  function readFile(file: File, side: "before" | "after") {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = typeof e.target?.result === "string" ? e.target.result : "";
      setTradeForm((prev) => ({
        ...prev,
        screenshots: {
          ...prev.screenshots,
          [side]: result,
        },
      }));
    };
    reader.readAsDataURL(file);
  }

  function saveTrade() {
    const finalTrade: Trade = {
      ...tradeForm,
      id: tradeForm.id || crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    };

    setState((prev) => {
      const exists = prev.trades.some((t) => t.id === finalTrade.id);
      return {
        ...prev,
        trades: exists
          ? prev.trades.map((t) => (t.id === finalTrade.id ? finalTrade : t))
          : [finalTrade, ...prev.trades],
      };
    });

    resetForm();
    setTab("journal");
  }

  function editTrade(trade: Trade) {
    setTradeForm({ ...trade });
    setTab("capture");
  }

  function deleteTrade(id: string | null) {
    setState((prev) => ({
      ...prev,
      trades: prev.trades.filter((t) => t.id !== id),
    }));
  }

  const liveAnalysis = analyzeTrade(tradeForm, state.rules);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Trade Mentor
            </h1>
            <p className="mt-3 text-base leading-7 text-zinc-400 md:text-lg">
              A calm trading journal and review tool focused on process, screenshots,
              checklist discipline, and high-impact news awareness.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <span className="rounded-full border border-zinc-800 bg-white px-4 py-2 text-sm font-medium text-black">
              Process-first
            </span>
            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-300">
              No streak pressure
            </span>
            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-300">
              Screenshot review
            </span>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            ["dashboard", "Dashboard"],
            ["capture", "Trade Capture"],
            ["journal", "Journal"],
            ["mentor", "Mentor"],
            ["news", "News"],
            ["settings", "Rules"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm font-medium transition",
                tab === value
                  ? "border-white bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                  : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-5">
              <StatCard
                label="Journaled trades"
                value={enrichedTrades.length}
                note="Stored locally in this MVP"
              />
              <StatCard
                label="Average setup quality"
                value={`${averageQuality}/100`}
                note="Based on rules + checklist"
              />
              <StatCard
                label="Average pre-trade process"
                value={`${averagePre}/100`}
                note="Checklist completion"
              />
              <StatCard
                label="Stable-state entries"
                value={`${calmTradesPct}%`}
                note="Calm or focused logs"
              />
              <StatCard label="Win rate" value={`${winRate}%`} note="Closed trades only" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Panel
                title="Mentor overview"
                desc="Focus on quality, discipline, and rule-following instead of emotional pressure."
                className="lg:col-span-2"
              >
                <div className="space-y-3">
                  {mentorSummary.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel
                title="High-impact news watch"
                desc="Use this to avoid entering during unstable windows."
              >
                <div className="space-y-3">
                  {defaultNews
                    .filter((n) => n.impact === "High")
                    .map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-amber-900 bg-amber-950/40 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{item.event}</p>
                            <p className="mt-1 text-xs text-amber-200/70">{item.market}</p>
                          </div>
                          <span className="rounded-full bg-amber-600 px-3 py-1 text-xs text-white">
                            {item.time}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-amber-300">
                          Volatility risk in about {item.minutesAway} minutes
                        </p>
                      </div>
                    ))}
                </div>
              </Panel>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel
                title="Process score distribution"
                desc="A neutral view of your logged trade quality."
              >
                <div className="space-y-4">
                  {[
                    {
                      label: "Strong (80-100)",
                      count: enrichedTrades.filter((t) => t.analysis.quality >= 80).length,
                    },
                    {
                      label: "Good (65-79)",
                      count: enrichedTrades.filter(
                        (t) => t.analysis.quality >= 65 && t.analysis.quality < 80
                      ).length,
                    },
                    {
                      label: "Needs work (45-64)",
                      count: enrichedTrades.filter(
                        (t) => t.analysis.quality >= 45 && t.analysis.quality < 65
                      ).length,
                    },
                    {
                      label: "Low quality (<45)",
                      count: enrichedTrades.filter((t) => t.analysis.quality < 45).length,
                    },
                  ].map((row) => {
                    const max = Math.max(enrichedTrades.length, 1);
                    return (
                      <div key={row.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-300">{row.label}</span>
                          <span className="text-zinc-500">{row.count}</span>
                        </div>
                        <ProgressBar value={(row.count / max) * 100} />
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel
                title="Screenshot coverage"
                desc="The review becomes stronger when each trade has chart images."
              >
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-zinc-300">Before screenshots</span>
                      <span className="text-zinc-500">
                        {enrichedTrades.filter((t) => t.screenshots.before).length}/
                        {enrichedTrades.length || 0}
                      </span>
                    </div>
                    <ProgressBar
                      value={
                        enrichedTrades.length
                          ? (enrichedTrades.filter((t) => t.screenshots.before).length /
                              enrichedTrades.length) *
                            100
                          : 0
                      }
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-zinc-300">After screenshots</span>
                      <span className="text-zinc-500">
                        {enrichedTrades.filter((t) => t.screenshots.after).length}/
                        {enrichedTrades.length || 0}
                      </span>
                    </div>
                    <ProgressBar
                      value={
                        enrichedTrades.length
                          ? (enrichedTrades.filter((t) => t.screenshots.after).length /
                              enrichedTrades.length) *
                            100
                          : 0
                      }
                    />
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
                    This MVP uses a rule-based review layer. A production version can add image
                    analysis, broker imports, and live economic calendar APIs.
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        )}

        {tab === "capture" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Panel
              title={tradeForm.id ? "Edit trade" : "Capture a trade"}
              desc="Log the setup, screenshots, checklist, and review notes."
              className="xl:col-span-2"
            >
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["market", "Market", "ES, NQ, EURUSD, AAPL", "text"],
                    ["setup", "Setup", "Breakout retest, pullback, opening range", "text"],
                    ["entry", "Entry", "", "number"],
                    ["stop", "Stop", "", "number"],
                    ["target", "Target", "", "number"],
                    ["riskDollars", "Risk ($)", "", "number"],
                    ["size", "Position size", "2 contracts, 500 shares", "text"],
                    ["exitPrice", "Exit price", "", "number"],
                    ["pnlDollars", "PnL ($)", "", "number"],
                  ].map(([key, label, placeholder, type]) => (
                    <div className="space-y-2" key={key}>
                      <label className="text-sm text-zinc-400">{label}</label>
                      <input
                        type={type}
                        value={(tradeForm as any)[key]}
                        placeholder={placeholder}
                        onChange={(e) =>
                          setTradeForm({ ...tradeForm, [key]: e.target.value })
                        }
                        className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600"
                      />
                    </div>
                  ))}

                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Setup tag</label>
                    <select
                      value={tradeForm.setupTag}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, setupTag: e.target.value })
                      }
                      className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white"
                    >
                      {["Breakout", "Pullback", "Reversal", "Scalp", "Swing", "News Trade"].map(
                        (v) => (
                          <option key={v}>{v}</option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Direction</label>
                    <select
                      value={tradeForm.direction}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, direction: e.target.value })
                      }
                      className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white"
                    >
                      <option>Long</option>
                      <option>Short</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Timeframe</label>
                    <select
                      value={tradeForm.timeframe}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, timeframe: e.target.value })
                      }
                      className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white"
                    >
                      {["1m", "5m", "15m", "1h", "4h", "Daily"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Session</label>
                    <select
                      value={tradeForm.session}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, session: e.target.value })
                      }
                      className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white"
                    >
                      {["Asia", "London", "New York", "Power Hour", "Swing"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Mental state</label>
                    <select
                      value={tradeForm.emotion}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, emotion: e.target.value })
                      }
                      className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white"
                    >
                      {["Calm", "Focused", "Anxious", "FOMO", "Revenge"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Result</label>
                    <select
                      value={tradeForm.result}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, result: e.target.value })
                      }
                      className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white"
                    >
                      {["Open", "Win", "Loss", "Breakeven"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Trade date</label>
                    <input
                      type="date"
                      value={tradeForm.tradeDate}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, tradeDate: e.target.value })
                      }
                      className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Entry time</label>
                    <input
                      type="time"
                      value={tradeForm.entryTime}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, entryTime: e.target.value })
                      }
                      className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Exit time</label>
                    <input
                      type="time"
                      value={tradeForm.exitTime}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, exitTime: e.target.value })
                      }
                      className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm text-zinc-400">Near high-impact news?</label>
                    <select
                      value={tradeForm.newsRisk}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, newsRisk: e.target.value })
                      }
                      className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white"
                    >
                      <option>No</option>
                      <option>Yes</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="font-medium text-white">Before-trade screenshot</h3>
                    <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-zinc-800 bg-black p-4 hover:bg-zinc-950">
                      <div className="text-sm text-zinc-400">Upload chart image</div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) readFile(file, "before");
                        }}
                      />
                    </label>
                    {tradeForm.screenshots.before ? (
                      <img
                        src={tradeForm.screenshots.before}
                        alt="before trade screenshot"
                        className="h-56 w-full rounded-2xl border border-zinc-800 object-cover"
                      />
                    ) : (
                      <div className="flex h-56 items-center justify-center rounded-2xl border border-zinc-800 bg-black text-sm text-zinc-500">
                        No image yet
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-medium text-white">After-trade screenshot</h3>
                    <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-zinc-800 bg-black p-4 hover:bg-zinc-950">
                      <div className="text-sm text-zinc-400">Upload result image</div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) readFile(file, "after");
                        }}
                      />
                    </label>
                    {tradeForm.screenshots.after ? (
                      <img
                        src={tradeForm.screenshots.after}
                        alt="after trade screenshot"
                        className="h-56 w-full rounded-2xl border border-zinc-800 object-cover"
                      />
                    ) : (
                      <div className="flex h-56 items-center justify-center rounded-2xl border border-zinc-800 bg-black text-sm text-zinc-500">
                        No image yet
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="font-medium text-white">Pre-trade checklist</h3>
                    <div className="space-y-2">
                      {preChecklistItems.map((item, idx) => (
                        <label
                          key={item}
                          className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-black p-3"
                        >
                          <input
                            type="checkbox"
                            checked={tradeForm.preChecklist[idx]}
                            onChange={(e) => {
                              const next = [...tradeForm.preChecklist];
                              next[idx] = e.target.checked;
                              setTradeForm({ ...tradeForm, preChecklist: next });
                            }}
                            className="mt-1"
                          />
                          <span className="text-sm text-zinc-300">{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-medium text-white">Post-trade checklist</h3>
                    <div className="space-y-2">
                      {postChecklistItems.map((item, idx) => (
                        <label
                          key={item}
                          className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-black p-3"
                        >
                          <input
                            type="checkbox"
                            checked={tradeForm.postChecklist[idx]}
                            onChange={(e) => {
                              const next = [...tradeForm.postChecklist];
                              next[idx] = e.target.checked;
                              setTradeForm({ ...tradeForm, postChecklist: next });
                            }}
                            className="mt-1"
                          />
                          <span className="text-sm text-zinc-300">{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Pre-trade notes</label>
                    <textarea
                      value={tradeForm.notesBefore}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, notesBefore: e.target.value })
                      }
                      rows={5}
                      placeholder="Why this trade made sense..."
                      className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Post-trade notes / lesson</label>
                    <textarea
                      value={tradeForm.notesAfter}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, notesAfter: e.target.value })
                      }
                      rows={5}
                      placeholder="How it went and what to improve..."
                      className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={saveTrade}
                    className="rounded-2xl bg-white px-4 py-2 text-black hover:bg-zinc-200"
                  >
                    {tradeForm.id ? "Update trade" : "Save trade"}
                  </button>
                  <button
                    onClick={resetForm}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-zinc-200 hover:bg-zinc-900"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </Panel>

            <Panel
              title="Live AI review"
              desc="Rule-based feedback using your screenshots, checklist, and trade plan."
            >
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-zinc-300">Setup quality</span>
                    <span className="font-medium text-white">{liveAnalysis.quality}/100</span>
                  </div>
                  <ProgressBar value={liveAnalysis.quality} />
                  <p className="mt-2 text-xs text-zinc-500">Verdict: {liveAnalysis.verdict}</p>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium text-white">Strengths</h4>
                  <div className="space-y-2">
                    {liveAnalysis.strengths.length ? (
                      liveAnalysis.strengths.map((s, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-200"
                        >
                          {s}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-zinc-500">No strengths detected yet.</div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium text-white">Concerns</h4>
                  <div className="space-y-2">
                    {liveAnalysis.concerns.length ? (
                      liveAnalysis.concerns.map((s, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-amber-900 bg-amber-950/40 p-3 text-sm text-amber-200"
                        >
                          {s}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-zinc-500">No major concerns detected yet.</div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium text-white">Rule check</h4>
                  <div className="space-y-2">
                    {liveAnalysis.findings.map((s, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        )}

        {tab === "journal" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Trade journal</h2>
                <p className="text-sm text-zinc-500">
                  Review trades with screenshots, process scores, and AI feedback.
                </p>
              </div>

              <div className="relative w-full md:w-80">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by market, setup, tag, result..."
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {filteredTrades.length ? (
                filteredTrades.map((trade) => (
                  <Panel key={trade.id || trade.createdAt}>
                    <div className="space-y-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">
                              {trade.market || "Untitled trade"}
                            </h3>
                            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                              {trade.direction}
                            </span>
                            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                              {trade.setup || "No setup"}
                            </span>
                            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                              {trade.setupTag || "No tag"}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-3 py-1 text-xs text-white",
                                trade.result === "Win"
                                  ? "bg-emerald-600"
                                  : trade.result === "Loss"
                                    ? "bg-rose-600"
                                    : trade.result === "Breakeven"
                                      ? "bg-zinc-600"
                                      : "bg-sky-600"
                              )}
                            >
                              {trade.result}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-3 py-1 text-xs text-white",
                                trade.analysis.quality >= 80
                                  ? "bg-emerald-600"
                                  : trade.analysis.quality >= 65
                                    ? "bg-slate-800"
                                    : trade.analysis.quality >= 45
                                      ? "bg-amber-600"
                                      : "bg-rose-600"
                              )}
                            >
                              {trade.analysis.quality}/100
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">
                            {trade.tradeDate} • {trade.timeframe} • {trade.session} • Mental
                            state: {trade.emotion} • RR: {trade.analysis.rr}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => editTrade(trade)}
                            className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTrade(trade.id)}
                            className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-white">Trade details</p>
                          <div className="space-y-1 rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300">
                            <p>Entry: {trade.entry || "-"}</p>
                            <p>Stop: {trade.stop || "-"}</p>
                            <p>Target: {trade.target || "-"}</p>
                            <p>Exit price: {trade.exitPrice || "-"}</p>
                            <p>Risk: {currency(trade.riskDollars)}</p>
                            <p>PnL: {currency(trade.pnlDollars)}</p>
                            <p>Size: {trade.size || "-"}</p>
                            <p>Setup tag: {trade.setupTag || "-"}</p>
                            <p>Result: {trade.result || "-"}</p>
                            <p>Entry time: {trade.entryTime || "-"}</p>
                            <p>Exit time: {trade.exitTime || "-"}</p>
                            <p>Near news: {trade.newsRisk}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-white">AI review</p>
                          <div className="space-y-2 rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300">
                            <p className="font-medium text-white">{trade.analysis.verdict}</p>
                            {trade.analysis.findings.map((f: string, idx: number) => (
                              <p key={idx}>{f}</p>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-white">Screenshot analysis</p>
                          <div className="space-y-2 rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300">
                            <p>{trade.analysis.strengths[0] || "No strengths detected yet."}</p>
                            <p>{trade.analysis.concerns[0] || "No main concern detected yet."}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="mb-2 text-sm font-medium text-white">Before screenshot</p>
                          {trade.screenshots.before ? (
                            <img
                              src={trade.screenshots.before}
                              alt="before chart"
                              className="h-56 w-full rounded-2xl border border-zinc-800 object-cover"
                            />
                          ) : (
                            <div className="flex h-56 items-center justify-center rounded-2xl border border-zinc-800 bg-black text-sm text-zinc-500">
                              No screenshot
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="mb-2 text-sm font-medium text-white">After screenshot</p>
                          {trade.screenshots.after ? (
                            <img
                              src={trade.screenshots.after}
                              alt="after chart"
                              className="h-56 w-full rounded-2xl border border-zinc-800 object-cover"
                            />
                          ) : (
                            <div className="flex h-56 items-center justify-center rounded-2xl border border-zinc-800 bg-black text-sm text-zinc-500">
                              No screenshot
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Panel>
                ))
              ) : (
                <Panel>
                  <div className="text-center text-zinc-500">
                    No trades yet. Go to Trade Capture and add your first trade.
                  </div>
                </Panel>
              )}
            </div>
          </div>
        )}

        {tab === "mentor" && (
          <div className="mt-6 space-y-6">
            <Panel
              title="AI mentor"
              desc="Feedback based on your own process, screenshots, and rule alignment."
            >
              <div className="space-y-3">
                {mentorSummary.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              title="How screenshot review works"
              desc="This MVP simulates a mentor using the chart image + your rules + checklist."
            >
              <div className="space-y-3 text-sm text-zinc-300">
                <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                  1. Upload a before-trade chart screenshot.
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                  2. Fill out the pre-trade checklist and your rule context.
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                  3. The app scores the setup and checks if it matches your process.
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                  4. After the trade, upload the result screenshot and reflect on execution.
                </div>
              </div>
            </Panel>

            <Panel
              title="Example production upgrades"
              desc="Features to add after this MVP front-end."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  "Real AI vision analysis for screenshot markup and zone detection",
                  "Live economic calendar API for red-folder news",
                  "Cloud image storage and secure user accounts",
                  "Broker import or CSV upload for auto-journaling",
                  "Pattern analytics by setup, time, session, and instrument",
                  "Mobile push warnings before high-impact events",
                  "Coach mode with shared journal review",
                  "Weekly process reports without PnL hype",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {tab === "news" && (
          <div className="mt-6 space-y-6">
            <Panel
              title="High-impact news watch"
              desc="Track upcoming events that can create sudden volatility."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {defaultNews.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-800 bg-black p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.event}</p>
                        <p className="mt-1 text-sm text-zinc-500">{item.market}</p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs text-white",
                          item.impact === "High" ? "bg-rose-600" : "bg-slate-700"
                        )}
                      >
                        {item.impact}
                      </span>
                    </div>

                    <div className="mt-3 text-sm text-zinc-300">{item.time}</div>

                    <div
                      className={cn(
                        "mt-3 rounded-2xl border p-3 text-sm",
                        item.impact === "High"
                          ? "border-rose-900 bg-rose-950/40 text-rose-200"
                          : "border-zinc-800 bg-zinc-950 text-zinc-300"
                      )}
                    >
                      {item.impact === "High"
                        ? `Potential volatility in about ${item.minutesAway} minutes.`
                        : `Medium impact event in about ${item.minutesAway} minutes.`}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              title="Suggested product behavior"
              desc="How the real app should handle red-folder events."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300">
                  Warn the trader before a trade is logged inside the danger window.
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300">
                  Tag journal entries that happened near high-impact releases.
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300">
                  Compare process quality during news windows vs normal sessions.
                </div>
              </div>
            </Panel>
          </div>
        )}

        {tab === "settings" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel
              title="Your trading rules"
              desc="The mentor checks trades against these rules."
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  {state.rules.map((rule, idx) => (
                    <div
                      key={`${rule}-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-black p-4"
                    >
                      <span className="text-sm text-zinc-300">{rule}</span>
                      <button
                        onClick={() =>
                          setState((prev) => ({
                            ...prev,
                            rules: prev.rules.filter((_, i) => i !== idx),
                          }))
                        }
                        className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-900"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={state.draftRule}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, draftRule: e.target.value }))
                    }
                    placeholder="Add a new rule"
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-500"
                  />
                  <button
                    onClick={() => {
                      const draft = state.draftRule || "";
                      if (!draft.trim()) return;
                      setState((prev) => ({
                        ...prev,
                        rules: [...prev.rules, draft.trim()],
                        draftRule: "",
                      }));
                    }}
                    className="rounded-2xl bg-white px-4 py-2 text-black hover:bg-zinc-200"
                  >
                    Add
                  </button>
                </div>
              </div>
            </Panel>

            <Panel
              title="Profile settings"
              desc="Customize the mentor around your process."
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Trader name</label>
                  <input
                    value={state.profile.traderName}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, traderName: e.target.value },
                      }))
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Main strategy</label>
                  <input
                    value={state.profile.strategyName}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, strategyName: e.target.value },
                      }))
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Risk rule</label>
                  <input
                    value={state.profile.riskRule}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, riskRule: e.target.value },
                      }))
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Avoid-news window (minutes)</label>
                  <input
                    type="number"
                    value={state.profile.avoidNewsWindow}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, avoidNewsWindow: e.target.value },
                      }))
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-white"
                  />
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
                  In a real production app, these settings would also control notifications,
                  analytics filters, live news warnings, and model prompts for chart analysis.
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
