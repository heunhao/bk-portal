import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const alertsPath = path.join(process.cwd(), "python", "loss_alerts.json");

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const raw = await fs.readFile(alertsPath, "utf-8");
    const alerts = JSON.parse(raw) as unknown[];
    // 최신순 정렬
    const sorted = [...alerts].sort((a, b) => {
      const ta = (a as { alertedAt: string }).alertedAt;
      const tb = (b as { alertedAt: string }).alertedAt;
      return tb.localeCompare(ta);
    });
    return NextResponse.json({ alerts: sorted });
  } catch {
    return NextResponse.json({ alerts: [] });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await fs.writeFile(alertsPath, "[]", "utf-8");
  return NextResponse.json({ success: true });
}
