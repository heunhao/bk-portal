import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const configPath = path.join(process.cwd(), "python", "monitor_config.json");

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ lossThreshold: 3.0 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const threshold = parseFloat(body.lossThreshold);

  if (isNaN(threshold) || threshold < 0.5 || threshold > 30) {
    return NextResponse.json({ error: "0.5 ~ 30 범위로 입력해주세요." }, { status: 400 });
  }

  await fs.writeFile(configPath, JSON.stringify({ lossThreshold: threshold }, null, 2), "utf-8");
  return NextResponse.json({ success: true, lossThreshold: threshold });
}
