import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const mode = searchParams.get("mode");

  if (!date || !mode) return NextResponse.json({ results: [], specColLabel: "" });

  const rows = await prisma.rsiResult.findMany({
    where: { date, mode },
    orderBy: { createdAt: "asc" },
  });

  const specColLabel = rows[0]?.specColLabel ?? "";
  const results = rows.map((r) => ({
    code: r.code,
    name: r.name,
    rsi: r.rsi,
    signal: r.signal,
    price: r.price,
    volume: r.volume,
    special: r.special,
    ma5Break: r.ma5Break,
    specCol: r.specCol,
  }));

  return NextResponse.json({ results, specColLabel });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const mode = searchParams.get("mode");

  if (!date || !mode) return NextResponse.json({ error: "date and mode required" }, { status: 400 });

  await prisma.rsiResult.deleteMany({ where: { date, mode } });
  return NextResponse.json({ success: true });
}
