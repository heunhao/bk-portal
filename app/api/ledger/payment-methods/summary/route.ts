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

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { userId: session.user.id },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    include: {
      transactions: {
        where: {
          userId: session.user.id,
          date: { gte: start, lt: end },
        },
        include: { category: true },
        orderBy: { date: "desc" },
      },
    },
  });

  return NextResponse.json(paymentMethods);
}
