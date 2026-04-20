import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isMonitor(req: NextRequest) {
  return req.headers.get("x-monitor-secret") === process.env.MONITOR_SECRET;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alerts = await prisma.lossAlert.findMany({
    orderBy: { alertedAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ alerts });
}

export async function POST(req: NextRequest) {
  if (!isMonitor(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { date, code, name, lossRate, price, threshold } = body;

  try {
    await prisma.lossAlert.upsert({
      where: { date_code: { date, code } },
      update: { name, lossRate, price, threshold },
      create: { date, code, name, lossRate, price, threshold },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.lossAlert.deleteMany({});
  return NextResponse.json({ success: true });
}
