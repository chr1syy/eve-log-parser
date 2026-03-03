import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "shared-logs");
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/shared-logs/[uuid]
 * Public: returns the shared log (read-only).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;

  if (!UUID_RE.test(uuid)) {
    return NextResponse.json({ error: "Invalid UUID" }, { status: 400 });
  }

  try {
    const filePath = path.join(DATA_DIR, `${uuid}.json`);
    if (!filePath.startsWith(DATA_DIR + path.sep)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const log = JSON.parse(raw);

    return NextResponse.json({ log });
  } catch (error) {
    console.error("[API] GET /api/shared-logs/[uuid] error:", error);
    return NextResponse.json({ error: "Failed to fetch log" }, { status: 500 });
  }
}
