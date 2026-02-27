import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "shared-logs");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    if (!UUID_RE.test(sessionId))
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });

    ensureDir();
    const filePath = path.join(DATA_DIR, `${sessionId}.json`);
    if (!filePath.startsWith(DATA_DIR + path.sep))
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });

    if (!fs.existsSync(filePath))
      return NextResponse.json({ error: "Log not found" }, { status: 404 });

    const raw = fs.readFileSync(filePath, "utf-8");
    const log = JSON.parse(raw);
    return NextResponse.json(log);
  } catch {
    return NextResponse.json({ error: "Failed to read log" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    if (!UUID_RE.test(sessionId))
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });

    ensureDir();
    const filePath = path.join(DATA_DIR, `${sessionId}.json`);
    if (!filePath.startsWith(DATA_DIR + path.sep))
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });

    if (!fs.existsSync(filePath))
      return NextResponse.json({ error: "Log not found" }, { status: 404 });

    const body = await request.json();
    const { displayName, pilotName, shipType } = body as Partial<{
      displayName?: string;
      pilotName?: string;
      shipType?: string;
    }>;

    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (typeof displayName === "string") parsed.displayName = displayName;
    if (typeof pilotName === "string") parsed.pilotName = pilotName;
    if (typeof shipType === "string") parsed.shipType = shipType;

    fs.writeFileSync(filePath, JSON.stringify(parsed), "utf-8");
    return NextResponse.json({ ok: true, log: parsed });
  } catch {
    return NextResponse.json(
      { error: "Failed to update log" },
      { status: 500 },
    );
  }
}
