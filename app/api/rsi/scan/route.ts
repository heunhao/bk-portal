import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const targetDate: string = body.targetDate;
  const mode: string = body.mode === "dead" ? "dead" : "golden";

  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return NextResponse.json({ error: "올바른 날짜 형식을 입력해주세요 (YYYY-MM-DD)" }, { status: 400 });
  }

  const scriptPath = path.join(process.cwd(), "python", "rsi_cutler_golden_dead_5days.py");
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const pythonCmd = process.platform === "win32"
        ? "py"
        : path.join(process.cwd(), "venv", "bin", "python3");
      const proc = spawn(pythonCmd, [scriptPath, mode, targetDate], {
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      });

      let buffer = "";

      proc.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            controller.enqueue(encoder.encode(`data: ${trimmed}\n\n`));
          }
        }
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        const msg = chunk.toString("utf8").trim();
        if (msg) console.error("[rsi_scan stderr]", msg);
      });

      proc.on("close", () => {
        if (buffer.trim()) {
          controller.enqueue(encoder.encode(`data: ${buffer.trim()}\n\n`));
        }
        controller.close();
      });

      proc.on("error", (err: Error) => {
        const errData = JSON.stringify({ type: "error", message: err.message });
        controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
