import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const raw = await fs.readFile(path.join(process.cwd(), "python", "config.json"), "utf-8");
    const cfg = JSON.parse(raw);
    return NextResponse.json({
      cano:       cfg.HANTOO_CANO       ?? "",
      acntPrdtCd: cfg.HANTOO_ACNT_PRDT_CD ?? "01",
    });
  } catch {
    return NextResponse.json({ cano: "", acntPrdtCd: "01" });
  }
}
