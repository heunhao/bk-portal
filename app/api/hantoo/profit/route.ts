import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileP = promisify(execFile);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { startDate, endDate } = body;

  if (!startDate || !endDate) {
    return NextResponse.json({ success: false, error: "날짜를 입력해주세요." }, { status: 400 });
  }

  const start = startDate.replace(/-/g, "");
  const end   = endDate.replace(/-/g, "");

  const pythonCmd  = process.platform === "win32"
    ? "py"
    : path.join(process.cwd(), "venv", "bin", "python3");
  const scriptPath = path.join(process.cwd(), "python", "hantoo_profit.py");

  try {
    const { stdout, stderr } = await execFileP(
      pythonCmd,
      [scriptPath, start, end],
      { env: { ...process.env, PYTHONIOENCODING: "utf-8" }, timeout: 30000 }
    );
    if (stderr) console.error("[hantoo_profit stderr]", stderr);
    return NextResponse.json(JSON.parse(stdout.trim()));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "조회 실패";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
