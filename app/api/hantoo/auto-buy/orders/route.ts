import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isMonitor(req: NextRequest) {
  return req.headers.get("x-monitor-secret") === process.env.MONITOR_SECRET;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const checkMode = searchParams.get("check");

  // Python 스케줄러: 당일 특정 종목 매수 여부 확인
  if (checkMode === "1" && isMonitor(req)) {
    const date = searchParams.get("date");
    const code = searchParams.get("code");
    if (!date || !code) return NextResponse.json({ exists: false });

    const start = new Date(date);
    const end   = new Date(date);
    end.setDate(end.getDate() + 1);

    const exists = await prisma.autoBuyOrder.findFirst({
      where: { stockCode: code, orderTime: { gte: start, lt: end }, resultCode: "0" },
    });
    return NextResponse.json({ exists: !!exists });
  }

  // 웹 페이지용 주문 목록 조회
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = searchParams.get("date");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (date) {
    const start = new Date(date);
    const end   = new Date(date);
    end.setDate(end.getDate() + 1);
    where.orderTime = { gte: start, lt: end };
  }

  const orders = await prisma.autoBuyOrder.findMany({
    where,
    orderBy: { orderTime: "desc" },
    take: 500,
  });
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  if (!isMonitor(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  try {
    await prisma.autoBuyOrder.create({
      data: {
        orderTime:   new Date(body.orderTime),
        stockCode:   String(body.stockCode),
        stockName:   String(body.stockName),
        orderQty:    Number(body.orderQty),
        refPrice:    Number(body.refPrice),
        rsiValue:    Number(body.rsiValue),
        signalValue: Number(body.signalValue),
        orderNo:     body.orderNo   || null,
        resultCode:  body.resultCode || null,
        resultMsg:   body.resultMsg  || null,
      },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[auto-buy/orders POST]", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
