import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LOG_PATH = path.resolve(process.cwd(), "dsr-requests.log");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      body,
    };
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(LOG_PATH, line, "utf8");
    return NextResponse.json({ ok: true, id: entry.id }, { status: 202 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
