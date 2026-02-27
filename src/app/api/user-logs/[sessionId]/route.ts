import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { z } from "zod";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE_DIR = path.join(process.cwd(), "data", "user-logs");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? "";

    if (!UUID_RE.test(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (!UUID_RE.test(sessionId)) {
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
    }

    const userDir = path.join(BASE_DIR, userId);
    // Prevent path traversal: userDir must be a direct child of BASE_DIR
    if (!userDir.startsWith(BASE_DIR + path.sep)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const filePath = path.join(userDir, `${sessionId}.json`);
    // Prevent path traversal: filePath must be within userDir
    if (!filePath.startsWith(userDir + path.sep)) {
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const log = JSON.parse(raw);

    return NextResponse.json({ log });
  } catch {
    return NextResponse.json({ error: "Failed to fetch log" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? "";

    const userDir = path.join(BASE_DIR, userId);
    // Basic validation
    if (!UUID_RE.test(userId))
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    if (!UUID_RE.test(sessionId))
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });

    // Prevent path traversal
    if (!userDir.startsWith(BASE_DIR + path.sep))
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });

    const filePath = path.join(userDir, `${sessionId}.json`);
    if (!filePath.startsWith(userDir + path.sep))
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });

    if (!fs.existsSync(filePath))
      return NextResponse.json({ error: "Log not found" }, { status: 404 });

    // validate body using zod
    const body = await request.json().catch(() => ({}));
    const schema = z
      .object({
        displayName: z.string().min(1).max(200).optional(),
        pilotName: z.string().min(1).max(100).optional(),
        shipType: z.string().min(1).max(100).optional(),
      })
      .strict();

    const parsedBody = schema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsedBody.error.issues },
        { status: 400 },
      );
    }

    const { displayName, pilotName, shipType } = parsedBody.data;

    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (typeof displayName === "string")
      parsed.displayName = displayName.trim();
    if (typeof pilotName === "string") parsed.pilotName = pilotName.trim();
    if (typeof shipType === "string") parsed.shipType = shipType.trim();

    fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf-8");

    return NextResponse.json({ ok: true, log: parsed });
  } catch (err) {
    console.error("Failed to PATCH user log:", err);
    return NextResponse.json(
      { error: "Failed to update log" },
      { status: 500 },
    );
  }
}
