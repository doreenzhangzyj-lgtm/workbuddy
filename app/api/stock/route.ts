import { NextResponse } from "next/server";
import { getEastmoneyQuote } from "./providers/eastmoney";

const STOCK_SOURCE_ERROR = "行情源暂时不可用，请稍后刷新";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "请先输入股票代码。" }, { status: 400 });
  }

  try {
    const quote = await getEastmoneyQuote(symbol);
    return NextResponse.json(quote);
  } catch {
    return NextResponse.json({ error: STOCK_SOURCE_ERROR }, { status: 502 });
  }
}
