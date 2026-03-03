import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isUserAuthenticated } from "@/lib/auth-utils";
import fs from "fs";
import path from "path";
const BASE_DIR = path.join(process.cwd(), "data", "user-logs");
// Accepts UUIDs, EVE character IDs (integers), and other safe identifiers
const SAFE_ID_RE = /^[0-9a-zA-Z_-]{1,64}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeFilePath(userId: string, uuid: string): string | null {
  if (!SAFE_ID_RE.test(userId)) return null;
  if (!UUID_RE.test(uuid)) return null;
  const userDir = path.join(BASE_DIR, userId);
  if (!userDir.startsWith(BASE_DIR + path.sep)) return null;
  const filePath = path.join(userDir, `${uuid}.json`);
  if (!filePath.startsWith(userDir + path.sep)) return null;
  return filePath;
}

/**
 * GET /api/logs/[id]
 * Returns the full log (including entries) for the owner.
 * Authenticated: looks in data/user-logs/<characterId>/<uuid>.json
 * Unauthenticated: looks in data/user-logs/<uuid>/<uuid>.json
 *   (anonymous users use sessionId as their userId directory)
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
    const authenticated = await isUserAuthenticated();
    let userId: string | null = null;

    if (authenticated) {
      const user = await getCurrentUser();
      userId = user?.id ?? null;
    } else {
      // Anonymous: sessionId IS the userId directory
      userId = uuid;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filePath = safeFilePath(userId, uuid);
    if (!filePath) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const log = JSON.parse(raw);

    return NextResponse.json({ log });
  } catch (error) {
    console.error("[API] GET /api/logs/[uuid] error:", error);
    return NextResponse.json({ error: "Failed to fetch log" }, { status: 500 });
  }
}

/**
 * DELETE /api/logs/[id]
 * Deletes a log file owned by the caller.
 * Authenticated: deletes data/user-logs/<characterId>/<uuid>.json
 * Unauthenticated: deletes data/user-logs/<uuid>/<uuid>.json
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;

  if (!UUID_RE.test(uuid)) {
    return NextResponse.json({ error: "Invalid UUID" }, { status: 400 });
  }

  try {
    const authenticated = await isUserAuthenticated();
    let userId: string | null = null;

    if (authenticated) {
      const user = await getCurrentUser();
      userId = user?.id ?? null;
    } else {
      // Anonymous: sessionId IS the userId directory
      userId = uuid;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filePath = safeFilePath(userId, uuid);
    if (!filePath) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    fs.unlinkSync(filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/logs/[uuid] error:", error);
    return NextResponse.json(
      { error: "Failed to delete log" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/logs/[id]
 * Shared logs are read-only via this route.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;
  if (!UUID_RE.test(uuid)) {
    return NextResponse.json({ error: "Invalid UUID" }, { status: 400 });
  }
  return NextResponse.json(
    { error: "Shared logs are read-only" },
    { status: 405 },
  );
}
