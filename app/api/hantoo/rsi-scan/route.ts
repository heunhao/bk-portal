import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body        = await req.json().catch(() => ({}));
  const targetDate  = (body.date as string) || new Date().toISOString().slice(0, 10);

  const pythonCmd  = process.platform === "win32"
    ? "py"
    : path.join(process.cwd(), "venv", "bin", "python3");
  const scriptPath = path.join(process.cwd(), "python", "hantoo_rsi_golden.py");

  try {
    const { stdout, stderr } = await execFileP(
      pythonCmd,
      [scriptPath, targetDate],
      {
        env:     { ...process.env, PYTHONIOENCODING: "utf-8" },
        timeout: 120000,   // 최대 2분
      }
    );

    if (stderr) console.error("[rsi-scan stderr]", stderr);

    // stdout은 JSON 라인의 스트림 — 마지막 "done" 라인에서 results 추출
    const lines = stdout.trim().split("\n").filter(Boolean);
    const done  = lines.map(l => { try { return JSON.parse(l); } catch { return null; } })
                       .find(o => o?.type === "done");

    if (done) {
      return NextResponse.json({ success: true, results: done.results ?? [], date: targetDate });
    }

    // 에러 라인 확인
    const errLine = lines.map(l => { try { return JSON.parse(l); } catch { return null; } })
                         .find(o => o?.type === "error");
    return NextResponse.json({
      success: false,
      error: errLine?.message ?? "스캔 중 오류가 발생했습니다.",
    }, { status: 500 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "스캔 실패";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
