import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileP = promisify(execFile);

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = req.nextUrl.searchParams.get("code");
  if (!code || !/^\d{6}$/.test(code))
    return NextResponse.json({ error: "6자리 종목코드 필요" }, { status: 400 });

  const pythonCmd = process.platform === "win32"
    ? "py"
    : path.join(process.cwd(), "venv", "bin", "python3");
  const scriptPath = path.join(process.cwd(), "python", "hantoo_quote.py");

  try {
    const { stdout } = await execFileP(pythonCmd, [scriptPath, code], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      timeout: 15000,
    });
    const result = JSON.parse(stdout.trim());
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "시세 조회 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
