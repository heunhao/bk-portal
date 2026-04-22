import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date") || new Date().toISOString().slice(0, 10);

  // DB에서 직접 종목 목록 조회 (Python→API 콜백 없이)
  const targets = await prisma.rsiTarget.findMany({ orderBy: { stockCode: "asc" } });
  if (targets.length === 0) {
    return NextResponse.json({ success: false, error: "설정 페이지에 스캔 대상 종목이 없습니다." });
  }

  const stocksJson = JSON.stringify(targets.map(t => ({ code: t.stockCode, name: t.stockName })));

  const pythonCmd  = process.platform === "win32"
    ? "py"
    : path.join(process.cwd(), "venv", "bin", "python3");
  const scriptPath = path.join(process.cwd(), "python", "hantoo_buy_signals.py");

  try {
    const { stdout, stderr } = await execFileP(
      pythonCmd,
      [scriptPath, date, stocksJson],
      { env: { ...process.env, PYTHONIOENCODING: "utf-8" }, timeout: 120000 }
    );
    if (stderr) console.error("[buy-signals stderr]", stderr);
    const result = JSON.parse(stdout.trim());
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "스캔 실패";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
