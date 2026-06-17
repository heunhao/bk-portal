import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pythonCmd  = process.platform === "win32"
    ? "py"
    : path.join(process.cwd(), "venv", "bin", "python3");
  const scriptPath = path.join(process.cwd(), "python", "pharmaresearch_rsi.py");

  try {
    const { stdout, stderr } = await execFileP(
      pythonCmd,
      [scriptPath],
      {
        env:     { ...process.env, PYTHONIOENCODING: "utf-8" },
        timeout: 30000,
      }
    );
    if (stderr) console.error("[pharmaresearch-rsi stderr]", stderr);

    const data = JSON.parse(stdout.trim());
    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "분석 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
