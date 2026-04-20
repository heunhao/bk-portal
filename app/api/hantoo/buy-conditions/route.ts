import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conditions = await prisma.buyCondition.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ conditions });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label } = await req.json();
  if (!label?.trim()) {
    return NextResponse.json({ error: "조건명을 입력해주세요." }, { status: 400 });
  }

  const count = await prisma.buyCondition.count();
  const condition = await prisma.buyCondition.create({
    data: { label: label.trim(), order: count },
  });
  return NextResponse.json({ condition });
}
