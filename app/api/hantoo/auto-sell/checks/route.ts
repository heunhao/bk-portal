import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isMonitor(req: NextRequest) {
  return req.headers.get("x-monitor-secret") === process.env.MONITOR_SECRET;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const code = searchParams.get("code");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (date) {
    const start = new Date(date);
    const end   = new Date(date);
    end.setDate(end.getDate() + 1);
    where.checkTime = { gte: start, lt: end };
  }
  if (code) where.stockCode = code;

  const checks = await prisma.autoSellCheck.findMany({
    where,
    orderBy: { checkTime: "desc" },
    take: 500,
  });
  return NextResponse.json({ checks });
}

export async function POST(req: NextRequest) {
  if (!isMonitor(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { checkTime, stocks, triggeredCodes } = await req.json();
  const triggered = new Set<string>(triggeredCodes ?? []);
  const dt = new Date(checkTime);

  if (!Array.isArray(stocks) || stocks.length === 0) {
    return NextResponse.json({ success: true });
  }

  try {
    await prisma.autoSellCheck.createMany({
      data: stocks.map((s: {
        stockCode: string; stockName: string; holdQty: number;
        avgPrice: number; currentPrice: number; evalAmount: number;
        evalPflsAmount: number; evalPflsRate: number;
      }) => ({
        checkTime:      dt,
        stockCode:      s.stockCode,
        stockName:      s.stockName,
        holdQty:        s.holdQty,
        avgPrice:       s.avgPrice,
        currentPrice:   s.currentPrice,
        evalAmount:     s.evalAmount,
        evalPflsAmount: s.evalPflsAmount,
        evalPflsRate:   s.evalPflsRate,
        sellTriggered:  triggered.has(s.stockCode),
      })),
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[auto-sell/checks POST]", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (date) {
    const start = new Date(date);
    const end   = new Date(date);
    end.setDate(end.getDate() + 1);
    await prisma.autoSellCheck.deleteMany({ where: { checkTime: { gte: start, lt: end } } });
  } else {
    await prisma.autoSellCheck.deleteMany({});
  }
  return NextResponse.json({ success: true });
}
