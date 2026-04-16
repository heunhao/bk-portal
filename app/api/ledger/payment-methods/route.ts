import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { userId: session.user.id },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(paymentMethods);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, type } = await req.json();
  if (!name || !type) {
    return NextResponse.json({ error: "이름과 유형을 입력해주세요" }, { status: 400 });
  }

  const paymentMethod = await prisma.paymentMethod.create({
    data: { userId: session.user.id, name, type },
  });

  return NextResponse.json(paymentMethod, { status: 201 });
}
