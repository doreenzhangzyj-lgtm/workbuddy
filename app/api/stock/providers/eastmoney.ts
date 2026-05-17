export type StockMarket = "A_SHARE" | "HK";

export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: StockMarket;
  updateTime: string;
};

type EastmoneyResponse = {
  data?: {
    f43?: number | string;
    f57?: string;
    f58?: string;
    f86?: number;
    f152?: number;
    f169?: number | string;
    f170?: number | string;
  };
};

function getSecid(symbol: string) {
  if (/^6\d{5}$/.test(symbol)) {
    return { secid: `1.${symbol}`, market: "A_SHARE" as const };
  }

  if (/^(0|3)\d{5}$/.test(symbol)) {
    return { secid: `0.${symbol}`, market: "A_SHARE" as const };
  }

  if (/^\d{5}$/.test(symbol)) {
    return { secid: `116.${symbol}`, market: "HK" as const };
  }

  return null;
}

function normalizeNumber(value: number | string | undefined, precision = 2) {
  if (value === undefined || value === null || value === "-") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed / 10 ** precision;
}

function formatUpdateTime(timestamp?: number) {
  if (!timestamp) {
    return new Date().toISOString();
  }

  const milliseconds = String(timestamp).length === 10 ? timestamp * 1000 : timestamp;
  return new Date(milliseconds).toISOString();
}

export async function getEastmoneyQuote(symbol: string): Promise<StockQuote> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const target = getSecid(normalizedSymbol);

  if (!target) {
    throw new Error("UNSUPPORTED_SYMBOL");
  }

  const fields = ["f43", "f57", "f58", "f86", "f152", "f169", "f170"].join(",");
  const response = await fetch(
    `https://push2.eastmoney.com/api/qt/stock/get?secid=${target.secid}&fields=${fields}`,
    {
      headers: {
        Referer: "https://quote.eastmoney.com/",
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 0 },
    },
  );

  if (!response.ok) {
    throw new Error("PROVIDER_UNAVAILABLE");
  }

  const json = (await response.json()) as EastmoneyResponse;
  const data = json.data;

  if (!data) {
    throw new Error("QUOTE_NOT_FOUND");
  }

  const precision = data.f152 ?? 2;
  const pricePrecision = target.market === "HK" ? precision + 1 : precision;
  const price = normalizeNumber(data.f43, pricePrecision);
  const change = normalizeNumber(data.f169, pricePrecision);
  const changePercent = normalizeNumber(data.f170, precision);

  if (price === null || change === null || changePercent === null) {
    throw new Error("QUOTE_NOT_FOUND");
  }

  return {
    symbol: data.f57 || normalizedSymbol,
    name: data.f58 || normalizedSymbol,
    price,
    change,
    changePercent,
    market: target.market,
    updateTime: formatUpdateTime(data.f86),
  };
}
