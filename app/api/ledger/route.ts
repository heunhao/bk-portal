import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const categoryId = searchParams.get("categoryId");
  const paymentMethodId = searchParams.get("paymentMethodId");
  const counterpart = searchParams.get("counterpart");

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: start, lt: end },
      ...(categoryId ? { categoryId } : {}),
      ...(paymentMethodId ? { paymentMethodId } : {}),
      ...(counterpart ? { counterpart: { contains: counterpart, mode: "insensitive" } } : {}),
    },
    include: {
      category: true,
      paymentMethod: true,
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, amount, categoryId, paymentMethodId, counterpart, description, date } = body;

  if (!type || !amount || !date) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요" }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: session.user.id,
      type,
      amount: parseInt(amount),
      categoryId: categoryId || null,
      paymentMethodId: paymentMethodId || null,
      counterpart: counterpart || null,
      description: description || null,
      date: new Date(date),
    },
    include: {
      category: true,
      paymentMethod: true,
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}
