import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isMonitor(req: NextRequest) {
  return req.headers.get("x-monitor-secret") === process.env.MONITOR_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isMonitor(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const code = searchParams.get("code");

  if (!date || !code) return NextResponse.json({ exists: false });

  const record = await prisma.lossAlert.findUnique({
    where: { date_code: { date, code } },
  });

  return NextResponse.json({ exists: !!record });
}
