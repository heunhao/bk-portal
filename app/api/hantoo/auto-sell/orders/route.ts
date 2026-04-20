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

  // Python 스케줄러가 당일 매도 여부 확인할 때 사용
  if (checkMode === "1" && isMonitor(req)) {
    const date = searchParams.get("date");
    const code = searchParams.get("code");
    if (!date || !code) return NextResponse.json({ exists: false });

    const start = new Date(date);
    const end   = new Date(date);
    end.setDate(end.getDate() + 1);

    const exists = await prisma.autoSellOrder.findFirst({
      where: {
        stockCode:  code,
        orderTime:  { gte: start, lt: end },
        resultCode: "0",
      },
    });
    return NextResponse.json({ exists: !!exists });
  }

  // 웹 페이지용 주문 목록 조회
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.autoSellOrder.findMany({
    orderBy: { orderTime: "desc" },
    take: 500,
  });
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  if (!isMonitor(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  try {
    await prisma.autoSellOrder.create({
      data: {
        orderTime:   new Date(body.orderTime),
        stockCode:   String(body.stockCode),
        stockName:   String(body.stockName),
        orderQty:    Number(body.orderQty),
        triggerRate: Number(body.triggerRate),
        orderNo:     body.orderNo  || null,
        resultCode:  body.resultCode || null,
        resultMsg:   body.resultMsg  || null,
      },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[auto-sell/orders POST]", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
