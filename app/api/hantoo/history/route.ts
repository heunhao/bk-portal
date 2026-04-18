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
  const { startDate, endDate, sideCode } = body;

  if (!startDate || !endDate) {
    return NextResponse.json({ success: false, error: "날짜를 입력해주세요." }, { status: 400 });
  }

  // YYYY-MM-DD → YYYYMMDD
  const start = startDate.replace(/-/g, "");
  const end   = endDate.replace(/-/g, "");
  const side  = ["00", "01", "02"].includes(sideCode) ? sideCode : "00";

  const pythonCmd  = process.platform === "win32"
    ? "py"
    : path.join(process.cwd(), "venv", "bin", "python3");
  const scriptPath = path.join(process.cwd(), "python", "hantoo_history.py");

  try {
    const { stdout, stderr } = await execFileP(
      pythonCmd,
      [scriptPath, start, end, side],
      { env: { ...process.env, PYTHONIOENCODING: "utf-8" }, timeout: 30000 }
    );
    if (stderr) console.error("[hantoo_history stderr]", stderr);
    const result = JSON.parse(stdout.trim());
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "조회 실패";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
