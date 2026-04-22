import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date") || new Date().toISOString().slice(0, 10);

  const pythonCmd  = process.platform === "win32"
    ? "py"
    : path.join(process.cwd(), "venv", "bin", "python3");
  const scriptPath = path.join(process.cwd(), "python", "hantoo_buy_signals.py");

  try {
    const { stdout, stderr } = await execFileP(
      pythonCmd,
      [scriptPath, date],
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
