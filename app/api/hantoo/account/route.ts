import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileP = promisify(execFile);

export async function POST(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pythonCmd = process.platform === "win32"
    ? "py"
    : path.join(process.cwd(), "venv", "bin", "python3");
  const scriptPath = path.join(process.cwd(), "python", "hantoo_account.py");

  try {
    const { stdout, stderr } = await execFileP(pythonCmd, [scriptPath], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      timeout: 30000,
    });
    if (stderr) console.error("[hantoo_account stderr]", stderr);
    const result = JSON.parse(stdout.trim());
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "계좌 조회 실패";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
