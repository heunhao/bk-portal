import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileP = promisify(execFile);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, qty, side, orderType, price, conditionId, name, exchange = "KRX" } = body;

  if (!code || !qty || !side || !orderType)
    return NextResponse.json({ success: false, error: "필수 항목이 누락되었습니다." }, { status: 400 });
  if (!["BUY", "SELL"].includes(side))
    return NextResponse.json({ success: false, error: "side는 BUY 또는 SELL 이어야 합니다." }, { status: 400 });

  const pythonCmd = process.platform === "win32"
    ? "py"
    : path.join(process.cwd(), "venv", "bin", "python3");
  const scriptPath = path.join(process.cwd(), "python", "hantoo_trade.py");
  const finalPrice = price ? String(price) : "0";

  try {
    const { stdout, stderr } = await execFileP(
      pythonCmd,
      [scriptPath, String(code), String(qty), side, orderType, finalPrice, String(exchange)],
      { env: { ...process.env, PYTHONIOENCODING: "utf-8" }, timeout: 30000 },
    );
    if (stderr) console.error("[hantoo_trade stderr]", stderr);
    const result = JSON.parse(stdout.trim());

    if (result.success && side === "BUY") {
      await prisma.buyRecord.create({
        data: {
          code:        String(code),
          name:        name ? String(name) : "",
          qty:         parseInt(String(qty)),
          price:       parseInt(finalPrice),
          orderType,
          conditionId: conditionId || null,
        },
      }).catch((e) => console.error("[buyRecord save error]", e));
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "주문 실패";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
