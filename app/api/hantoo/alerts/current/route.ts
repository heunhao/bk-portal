import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pythonCmd = process.platform === "win32"
    ? "py"
    : path.join(process.cwd(), "venv", "bin", "python3");
  const scriptPath = path.join(process.cwd(), "python", "hantoo_account.py");

  let threshold = 3.0;
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "python", "monitor_config.json"),
      "utf-8"
    );
    threshold = parseFloat(JSON.parse(raw).lossThreshold ?? 3.0);
  } catch { /* use default */ }

  try {
    const { stdout, stderr } = await execFileP(pythonCmd, [scriptPath], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      timeout: 30000,
    });
    if (stderr) console.error("[hantoo_account stderr]", stderr);

    const result = JSON.parse(stdout.trim());
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "조회 실패" }, { status: 500 });
    }

    const holdings: Array<{
      code: string;
      name: string;
      qty: string;
      currPrice: string;
      avgPrice: string;
      profitRate: string;
      evalAmt: string;
      profitAmt: string;
    }> = result.holdings ?? [];

    const losing = holdings
      .filter((h) => parseFloat(h.profitRate) <= -threshold)
      .map((h) => ({
        code: h.code,
        name: h.name,
        qty: parseInt(h.qty),
        price: parseInt(h.currPrice),
        avgPrice: parseFloat(h.avgPrice),
        lossRate: parseFloat(h.profitRate),
        evalAmt: parseInt(h.evalAmt),
      }));

    return NextResponse.json({ threshold, stocks: losing });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "조회 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
