"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const QUOTES = [
  "今天的效率，就是把复杂问题优雅地拖到明天。",
  "摸鱼不是逃避工作，是给灵感一个低功耗模式。",
  "只要鼠标还在动，职业精神就在闪光。",
  "真正的高手，会把忙碌演成一种安静的艺术。",
  "下班不是终点，是灵魂重新上线。",
];

const fakeTasks = [
  ["需求评审", "83%", "bg-cyan-300"],
  ["数据校验", "61%", "bg-fuchsia-300"],
  ["风险同步", "74%", "bg-lime-300"],
  ["周报沉淀", "92%", "bg-sky-300"],
];

const START_WORK_HOURS = [7, 8, 9, 10, 11, 12];
const OFF_WORK_HOURS = [18, 19, 20, 21, 22];
const WORK_DAYS_PER_MONTH = 22;
const SETTINGS_STORAGE_KEY = "workbuddy-settings";
const STOCKS_STORAGE_KEY = "workbuddy-stocks";
const DEFAULT_STOCK_SYMBOLS = ["600036", "00700", "09988"];

type WorkBuddySettings = {
  startWorkHour: number;
  offWorkHour: number;
  monthlySalary: string;
  bossLink: string;
};

type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: "A_SHARE" | "HK";
  updateTime: string;
};

const DEFAULT_SETTINGS: WorkBuddySettings = {
  startWorkHour: 9,
  offWorkHour: 18,
  monthlySalary: "30000",
  bossLink: "",
};

function readStoredSettings() {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    const settings = JSON.parse(stored) as Partial<WorkBuddySettings>;

    return {
      startWorkHour: START_WORK_HOURS.includes(Number(settings.startWorkHour)) ? Number(settings.startWorkHour) : DEFAULT_SETTINGS.startWorkHour,
      offWorkHour: OFF_WORK_HOURS.includes(Number(settings.offWorkHour)) ? Number(settings.offWorkHour) : DEFAULT_SETTINGS.offWorkHour,
      monthlySalary: typeof settings.monthlySalary === "string" ? settings.monthlySalary : DEFAULT_SETTINGS.monthlySalary,
      bossLink: typeof settings.bossLink === "string" ? settings.bossLink : DEFAULT_SETTINGS.bossLink,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function readStoredStockSymbols() {
  if (typeof window === "undefined") {
    return DEFAULT_STOCK_SYMBOLS;
  }

  try {
    const stored = window.localStorage.getItem(STOCKS_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_STOCK_SYMBOLS;
    }

    const symbols = JSON.parse(stored);
    if (!Array.isArray(symbols)) {
      return DEFAULT_STOCK_SYMBOLS;
    }

    const normalized = symbols
      .map((symbol) => String(symbol).trim().toUpperCase())
      .filter(Boolean);

    return normalized.length > 0 ? Array.from(new Set(normalized)) : DEFAULT_STOCK_SYMBOLS;
  } catch {
    return DEFAULT_STOCK_SYMBOLS;
  }
}

function getWorkDurationHours(startWorkHour: number, offWorkHour: number) {
  return Math.max(1, offWorkHour - startWorkHour);
}

function getTimeLeft(startWorkHour = 9, offWorkHour = 18, currentTime = new Date()) {
  const now = currentTime;
  const offWork = new Date(now);
  offWork.setHours(offWorkHour, 0, 0, 0);
  const workStart = new Date(now);
  workStart.setHours(startWorkHour, 0, 0, 0);

  const diff = offWork.getTime() - now.getTime();
  if (diff <= 0) {
    return { done: true, hours: "00", minutes: "00", seconds: "00", percent: 100 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const workTotal = offWork.getTime() - workStart.getTime();
  const elapsed = now.getTime() - workStart.getTime();
  const percent = Math.min(100, Math.max(0, (elapsed / workTotal) * 100));

  return {
    done: false,
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    percent,
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatStockNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function getRemainingMotivation(value: number) {
  if (value <= 0) {
    return "安心收工";
  }

  if (value <= 20) {
    return "一杯奶茶钱";
  }

  if (value <= 50) {
    return "一顿饭钱";
  }

  if (value <= 100) {
    return "一场电影";
  }

  if (value <= 200) {
    return "一次小聚";
  }

  if (value <= 500) {
    return "一件快乐装备";
  }

  if (value <= 1000) {
    return "一次周末回血";
  }

  return "一笔认真奖励";
}

export default function Home() {
  const [settings, setSettings] = useState(readStoredSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stockSymbols, setStockSymbols] = useState(readStoredStockSymbols);
  const [stockInput, setStockInput] = useState("");
  const [stockQuotes, setStockQuotes] = useState<Record<string, StockQuote>>({});
  const [stockError, setStockError] = useState("");
  const [stocksLoading, setStocksLoading] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [coverMode, setCoverMode] = useState(false);
  const { bossLink, monthlySalary, offWorkHour, startWorkHour } = settings;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    window.localStorage.setItem(STOCKS_STORAGE_KEY, JSON.stringify(stockSymbols));
  }, [stockSymbols]);

  const refreshStocks = useCallback(async () => {
    setStocksLoading(true);
    setStockError("");

    const results = await Promise.all(
      stockSymbols.map(async (symbol) => {
        try {
          const response = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}`);
          const data = (await response.json()) as StockQuote | { error?: string };

          if (!response.ok) {
            return { symbol, error: "error" in data ? data.error : "行情加载失败。" };
          }

          return { symbol, quote: data as StockQuote };
        } catch {
          return { symbol, error: "网络有点不稳，行情暂时没取到。" };
        }
      }),
    );

    const nextQuotes: Record<string, StockQuote> = {};
    const errors: string[] = [];

    results.forEach((result) => {
      if ("quote" in result && result.quote) {
        nextQuotes[result.symbol] = result.quote;
      } else {
        errors.push(`${result.symbol}: ${result.error}`);
      }
    });

    setStockQuotes(nextQuotes);
    setStockError(errors.length > 0 ? "行情源暂时不可用，请稍后刷新" : "");
    setStocksLoading(false);
  }, [stockSymbols]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshStocks();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshStocks]);

  const timeLeft = useMemo(() => getTimeLeft(startWorkHour, offWorkHour, now), [startWorkHour, offWorkHour, now]);
  const salaryStats = useMemo(() => {
    const salary = Number(monthlySalary);
    const safeMonthlySalary = Number.isFinite(salary) && salary > 0 ? salary : 0;
    const dailySalary = safeMonthlySalary / WORK_DAYS_PER_MONTH;
    const workDurationHours = getWorkDurationHours(startWorkHour, offWorkHour);
    const earnedToday = dailySalary * (timeLeft.percent / 100);
    const hourlySalary = dailySalary / workDurationHours;

    return {
      dailySalary,
      earnedToday,
      hourlySalary,
      remainingToday: Math.max(0, dailySalary - earnedToday),
    };
  }, [monthlySalary, offWorkHour, startWorkHour, timeLeft.percent]);

  const quote = useMemo(() => {
    const dayKey = new Date().toDateString();
    const index = [...dayKey].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return QUOTES[index % QUOTES.length];
  }, []);

  function handleBossComing() {
    const link = bossLink.trim();

    if (!link) {
      setCoverMode(true);
      return;
    }

    const target = /^https?:\/\//i.test(link) ? link : `https://${link}`;
    window.location.href = target;
  }

  function addStockSymbol() {
    const symbol = stockInput.trim().toUpperCase();
    if (!symbol) {
      return;
    }

    setStockSymbols((current) => (current.includes(symbol) ? current : [...current, symbol]));
    setStockInput("");
  }

  function removeStockSymbol(symbol: string) {
    setStockSymbols((current) => {
      const next = current.filter((item) => item !== symbol);
      return next.length > 0 ? next : DEFAULT_STOCK_SYMBOLS;
    });
  }

  if (coverMode) {
    return (
      <main className="min-h-screen bg-[#05070b] px-4 py-5 text-zinc-100 sm:px-8">
        <section className="mx-auto flex min-h-[calc(100vh-40px)] max-w-7xl flex-col rounded-[28px] border border-white/10 bg-[#0b0f16]/95 shadow-2xl shadow-cyan-950/40">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">Workspace</p>
              <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">季度增长模型复盘</h1>
            </div>
            <button
              onClick={() => setCoverMode(false)}
              className="h-10 rounded-full border border-white/15 px-4 text-sm text-zinc-200 transition hover:border-cyan-300/60 hover:bg-cyan-300/10"
            >
              返回
            </button>
          </header>

          <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[1.15fr_0.85fr] lg:p-6">
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium text-zinc-100">核心指标趋势</h2>
                <span className="rounded-full bg-lime-300/10 px-3 py-1 text-xs text-lime-200">Live</span>
              </div>
              <div className="mt-7 flex h-64 items-end gap-3 border-b border-l border-white/10 px-3 pb-3">
                {[48, 72, 54, 86, 63, 92, 78, 96, 69, 88, 76, 98].map((height, index) => (
                  <div key={index} className="flex flex-1 items-end">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-cyan-400 via-sky-300 to-fuchsia-300 shadow-lg shadow-cyan-500/20"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {["转化率 +12.8%", "交付准时率 96%", "待确认 7 项"].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-base font-medium text-zinc-100">今日事项</h2>
              <div className="mt-5 space-y-4">
                {fakeTasks.map(([name, value, color]) => (
                  <div key={name}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-zinc-300">{name}</span>
                      <span className="font-mono text-zinc-400">{value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${color}`} style={{ width: value }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-2xl bg-zinc-950 p-4 font-mono text-xs leading-6 text-cyan-100/80">
                <p>sync_status: aligned</p>
                <p>owner_review: pending</p>
                <p>next_action: consolidate_notes()</p>
              </div>
            </section>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative h-screen overflow-hidden bg-[#03050a] px-4 py-4 text-white sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_86%_8%,rgba(217,70,239,0.16),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:54px_54px] opacity-30" />

      <section className="relative mx-auto grid h-full max-w-7xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex min-h-0 flex-col justify-between rounded-[32px] border border-white/12 bg-white/[0.07] p-5 shadow-2xl shadow-cyan-950/50 backdrop-blur-2xl sm:p-7">
          <header className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.36em] text-cyan-200/70">Work Buddy</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-normal text-white sm:text-5xl">上班搭子</h1>
            </div>
          </header>

          <section className="my-6 grid gap-4 xl:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-black/20 p-4 shadow-inner shadow-white/5 sm:p-5">
              <div className="flex flex-col gap-3">
                <p className="text-sm text-zinc-400">距离 {offWorkHour}:00 下班还有</p>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                  <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-500">
                    <span className="shrink-0">上班</span>
                    <select
                      value={startWorkHour}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          startWorkHour: Number(event.target.value),
                        }))
                      }
                      className="h-10 min-w-24 rounded-full border border-white/10 bg-black/35 px-3 text-sm text-zinc-100 outline-none transition hover:border-cyan-200/40 focus:border-cyan-200/70"
                    >
                      {START_WORK_HOURS.map((hour) => (
                        <option key={hour} value={hour} className="bg-zinc-950 text-zinc-100">
                          {hour}:00
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-500">
                    <span className="shrink-0">下班</span>
                    <select
                      value={offWorkHour}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          offWorkHour: Number(event.target.value),
                        }))
                      }
                      className="h-10 min-w-24 rounded-full border border-white/10 bg-black/35 px-3 text-sm text-zinc-100 outline-none transition hover:border-cyan-200/40 focus:border-cyan-200/70"
                    >
                      {OFF_WORK_HOURS.map((hour) => (
                        <option key={hour} value={hour} className="bg-zinc-950 text-zinc-100">
                          {hour}:00
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ["时", timeLeft.hours],
                  ["分", timeLeft.minutes],
                  ["秒", timeLeft.seconds],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-3xl border border-white/10 bg-black/30 p-3 text-center">
                    <div className="font-mono text-4xl font-semibold text-white">{value}</div>
                    <div className="mt-2 text-xs text-zinc-500">{label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-lime-300 shadow-[0_0_26px_rgba(34,211,238,0.55)] transition-all duration-700"
                  style={{ width: `${timeLeft.percent}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-zinc-400">
                {timeLeft.done ? "今日打工电量已释放完毕。" : "保持在线，灵魂低耗运行中。"}
              </p>
            </div>

            <div className="rounded-[28px] border border-cyan-200/15 bg-cyan-200/[0.055] p-4 shadow-inner shadow-cyan-200/5 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-400">今日已赚</p>
                <label className="flex items-center gap-2 text-xs text-zinc-500">
                  月薪
                  <input
                    value={monthlySalary}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        monthlySalary: event.target.value.replace(/[^\d.]/g, ""),
                      }))
                    }
                    inputMode="decimal"
                    className="h-9 w-28 rounded-full border border-white/10 bg-black/35 px-3 text-right text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 hover:border-cyan-200/40 focus:border-cyan-200/70"
                    placeholder="30000"
                  />
                </label>
              </div>
              <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-end gap-2">
                  <span className="text-2xl text-cyan-100">¥</span>
                  <strong className="font-mono text-4xl font-semibold text-white sm:text-5xl">
                    {formatMoney(salaryStats.earnedToday)}
                  </strong>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-lime-300 via-cyan-300 to-fuchsia-300 shadow-[0_0_24px_rgba(132,204,22,0.38)] transition-all duration-700"
                    style={{ width: `${timeLeft.percent}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                {[
                  ["日薪", salaryStats.dailySalary],
                  ["时薪", salaryStats.hourlySalary],
                  ["剩余", salaryStats.remainingToday],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-2 py-3">
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className="mt-1 font-mono text-sm text-zinc-100">¥{formatMoney(value as number)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-2xl border border-cyan-200/10 bg-cyan-200/[0.05] px-3 py-2 text-center text-xs leading-5 text-cyan-100/75">
                {salaryStats.remainingToday <= 0
                  ? "安心收工"
                  : `还差 ${formatMoney(salaryStats.remainingToday)} 元，约等于${getRemainingMotivation(salaryStats.remainingToday)}`}
              </p>
            </div>
          </section>

          <blockquote className="rounded-3xl border border-cyan-200/15 bg-cyan-200/[0.06] p-4 text-lg leading-8 text-cyan-50 sm:text-xl">
            “{quote}”
          </blockquote>
        </div>

        <aside className="min-h-0">
          <section className="flex h-full min-h-0 flex-col rounded-[32px] border border-white/12 bg-zinc-950/70 p-5 backdrop-blur-2xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/60">Market</p>
                <h2 className="mt-1 text-xl font-semibold">摸鱼看盘</h2>
              </div>
              <button
                onClick={() => void refreshStocks()}
                disabled={stocksLoading}
                className="h-10 rounded-full border border-white/10 bg-white/10 px-4 text-sm text-zinc-200 transition hover:border-cyan-200/40 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {stocksLoading ? "刷新中" : "刷新"}
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={stockInput}
                onChange={(event) => setStockInput(event.target.value.replace(/[^a-zA-Z0-9.:-]/g, "").toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    addStockSymbol();
                  }
                }}
                placeholder="添加股票代码"
                className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-black/35 px-4 text-sm uppercase text-zinc-100 outline-none transition placeholder:text-zinc-600 hover:border-cyan-200/40 focus:border-cyan-200/70"
              />
              <button
                onClick={addStockSymbol}
                className="h-10 rounded-full bg-white px-4 text-sm font-medium text-zinc-950 transition hover:bg-cyan-100 active:scale-95"
              >
                添加
              </button>
            </div>

            {stockError && (
              <p className="mt-3 rounded-2xl border border-amber-200/15 bg-amber-200/10 px-4 py-3 text-sm leading-6 text-amber-100">
                {stockError}
              </p>
            )}

            <div className="mt-4 grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1">
              {stockSymbols.map((symbol) => {
                const quote = stockQuotes[symbol];
                const isUp = (quote?.change ?? 0) >= 0;

                return (
                  <article key={symbol} className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{quote?.name ?? symbol}</h3>
                        <p className="mt-1 font-mono text-xs text-zinc-500">
                          {quote ? `${quote.symbol} · ${quote.market === "A_SHARE" ? "A 股" : "港股"}` : symbol}
                        </p>
                      </div>
                      <button
                        onClick={() => removeStockSymbol(symbol)}
                        aria-label={`移除 ${symbol}`}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-500 transition hover:border-white/25 hover:text-zinc-100"
                      >
                        ×
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-zinc-500">最新价</p>
                        <p className="mt-1 font-mono text-xl text-zinc-100">
                          {quote ? formatStockNumber(quote.price) : "--"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">涨跌额</p>
                        <p className={`mt-1 font-mono text-lg ${isUp ? "text-lime-200" : "text-fuchsia-200"}`}>
                          {quote ? `${isUp ? "+" : ""}${formatStockNumber(quote.change)}` : "--"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">涨跌幅</p>
                        <p className={`mt-1 font-mono text-lg ${isUp ? "text-lime-200" : "text-fuchsia-200"}`}>
                          {quote ? `${isUp ? "+" : ""}${formatStockNumber(quote.changePercent)}%` : "--"}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-zinc-600">
                      {quote ? `更新 ${new Date(quote.updateTime).toLocaleString("zh-CN", { hour12: false })}` : "等待刷新"}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </aside>
      </section>
      <div className="fixed bottom-5 right-5 z-20 flex w-[calc(100%-40px)] max-w-sm flex-col items-stretch gap-3 sm:bottom-8 sm:right-8 sm:w-80">
        {settingsOpen && (
          <section className="rounded-[28px] border border-white/10 bg-zinc-950/85 p-4 shadow-2xl shadow-black/50 backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-medium text-zinc-100">设置</h2>
              <span className="text-xs text-zinc-500">已自动保存</span>
              <button
                onClick={() => setSettingsOpen(false)}
                aria-label="关闭设置"
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base leading-none text-zinc-400 transition hover:border-white/25 hover:bg-white/10 hover:text-zinc-100"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs text-zinc-500">
                上班
                <select
                  value={startWorkHour}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      startWorkHour: Number(event.target.value),
                    }))
                  }
                  className="h-10 rounded-full border border-white/10 bg-black/45 px-3 text-sm text-zinc-100 outline-none transition hover:border-cyan-200/40 focus:border-cyan-200/70"
                >
                  {START_WORK_HOURS.map((hour) => (
                    <option key={hour} value={hour} className="bg-zinc-950 text-zinc-100">
                      {hour}:00
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-xs text-zinc-500">
                下班
                <select
                  value={offWorkHour}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      offWorkHour: Number(event.target.value),
                    }))
                  }
                  className="h-10 rounded-full border border-white/10 bg-black/45 px-3 text-sm text-zinc-100 outline-none transition hover:border-cyan-200/40 focus:border-cyan-200/70"
                >
                  {OFF_WORK_HOURS.map((hour) => (
                    <option key={hour} value={hour} className="bg-zinc-950 text-zinc-100">
                      {hour}:00
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-4 block text-xs text-zinc-500">
              月薪
              <input
                value={monthlySalary}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    monthlySalary: event.target.value.replace(/[^\d.]/g, ""),
                  }))
                }
                inputMode="decimal"
                placeholder="30000"
                className="mt-2 h-10 w-full rounded-full border border-white/10 bg-black/45 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 hover:border-cyan-200/40 focus:border-cyan-200/70"
              />
            </label>

            <label className="mt-4 block text-xs text-zinc-500">
              <span className="flex items-center gap-2">
                跳转链接
                <span className="group relative inline-flex">
                  <button
                    type="button"
                    aria-label="跳转链接说明"
                    className="flex h-4 w-4 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] text-zinc-400 transition hover:border-cyan-200/40 hover:text-cyan-100 focus:border-cyan-200/60 focus:text-cyan-100 focus:outline-none"
                  >
                    ?
                  </button>
                  <span className="pointer-events-none absolute bottom-6 left-1/2 hidden w-52 -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs leading-5 text-zinc-300 shadow-2xl shadow-black/40 group-focus-within:block group-hover:block">
                    填写后，可点击右下角箭头跳转到该页面。
                  </span>
                </span>
              </span>
              <input
                value={bossLink}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    bossLink: event.target.value,
                  }))
                }
                placeholder="例如 docs.qq.com"
                className="mt-2 h-10 w-full rounded-full border border-white/10 bg-black/45 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 hover:border-cyan-200/40 focus:border-cyan-200/70"
              />
            </label>
          </section>
        )}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsOpen}
            className="h-10 rounded-full border border-white/10 bg-white/10 px-4 text-sm text-zinc-200 shadow-2xl shadow-black/30 backdrop-blur-2xl transition hover:border-white/25 hover:bg-white/15 active:scale-95"
          >
            设置
          </button>
        <button
          onClick={handleBossComing}
          aria-label="快速切换"
          title="快速切换"
          className="flex h-12 w-12 items-center justify-center self-end rounded-full border border-white/20 bg-white/12 text-xl font-light text-zinc-100 shadow-2xl shadow-black/40 backdrop-blur-2xl transition hover:border-white/35 hover:bg-white/18 active:scale-95"
        >
          →
        </button>
        </div>
      </div>
    </main>
  );
}
