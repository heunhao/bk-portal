import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isMonitor(req: NextRequest) {
  return req.headers.get("x-monitor-secret") === process.env.MONITOR_SECRET;
}

export async function GET(req: NextRequest) {
  // Python 스케줄러 또는 로그인 사용자 모두 조회 가능
  const session = await getServerSession(authOptions);
  if (!session && !isMonitor(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targets = await prisma.rsiTarget.findMany({
    orderBy: { stockCode: "asc" },
  });
  return NextResponse.json({ targets });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stockCode, stockName } = await req.json();
  const code = String(stockCode ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "종목코드는 6자리 숫자여야 합니다." }, { status: 400 });
  }

  try {
    const target = await prisma.rsiTarget.upsert({
      where:  { stockCode: code },
      update: { stockName: String(stockName ?? "").trim() },
      create: { stockCode: code, stockName: String(stockName ?? "").trim() },
    });
    return NextResponse.json({ target });
  } catch (e) {
    console.error("[rsiTarget POST]", e);
    return NextResponse.json({ error: "추가 실패" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code 파라미터가 필요합니다." }, { status: 400 });

  await prisma.rsiTarget.delete({ where: { stockCode: code } }).catch(() => null);
  return NextResponse.json({ success: true });
}
