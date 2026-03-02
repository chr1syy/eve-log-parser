import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCurrentUser, isUserAuthenticated } from "@/lib/auth-utils";
import type { ParsedLog } from "@/lib/types";

const BASE_DIR = path.join(process.cwd(), "data", "user-logs");
// Accepts UUIDs, EVE character IDs (integers), and other safe identifiers
const SAFE_ID_RE = /^[0-9a-zA-Z_-]{1,64}$/;

function safeUserDir(userId: string): string | null {
  if (!SAFE_ID_RE.test(userId)) return null;
  const dir = path.join(BASE_DIR, userId);
  if (!dir.startsWith(BASE_DIR + path.sep)) return null;
  return dir;
}

/**
 * GET /api/logs
 * Authenticated: returns metadata for all logs belonging to the character.
 * Unauthenticated: returns empty list.
 */
export async function GET(_request: NextRequest) {
  const authenticated = await isUserAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ logs: [] });
  }

  const user = await getCurrentUser();
  // user.id is String(character_id) set by the profile() callback
  const userId = user?.id ?? null;

  const userDir = userId ? safeUserDir(userId) : null;
  if (!userDir) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!fs.existsSync(userDir)) {
    return NextResponse.json({ logs: [] });
  }

  const files = fs.readdirSync(userDir).filter((f) => f.endsWith(".json"));
  const metas: Record<string, unknown>[] = [];

  for (const file of files) {
    const filePath = path.join(userDir, file);
    if (!filePath.startsWith(userDir + path.sep)) continue;
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      // Strip entries — return metadata only for the list view
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { entries: _e, ...meta } = parsed as {
        entries: unknown;
        [key: string]: unknown;
      };
      if (!meta.displayName) {
        if (typeof meta.characterName === "string")
          meta.displayName = meta.characterName;
        else if (typeof meta.fileName === "string")
          meta.displayName = meta.fileName;
      }
      metas.push(meta);
    } catch {
      // Skip corrupt files
    }
  }

  metas.sort((a, b) => {
    const aDate = a.parsedAt ? new Date(a.parsedAt as string).getTime() : 0;
    const bDate = b.parsedAt ? new Date(b.parsedAt as string).getTime() : 0;
    return bDate - aDate;
  });

  return NextResponse.json({ logs: metas.slice(0, 50) });
}

/**
 * POST /api/logs
 * Saves a log to the authenticated user's directory (or anonymous directory).
 * Authenticated: uses character ID as the storage key.
 * Unauthenticated: uses the sessionId from the log body as the key.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      log: ParsedLog;
      filename?: string;
      rawLogText?: string;
      rawFileName?: string;
    };
    const { log, rawLogText, rawFileName } = body;

    if (!log?.sessionId) {
      return NextResponse.json(
        { error: "Missing log.sessionId" },
        { status: 400 },
      );
    }

    const authenticated = await isUserAuthenticated();
    let userId: string | null = null;

    if (authenticated) {
      const user = await getCurrentUser();
      userId = user?.id ?? null;
    } else {
      // Anonymous: use sessionId as the userId (single-log-per-session)
      userId = log.sessionId;
    }

    const userDir = userId ? safeUserDir(userId) : null;
    if (!userDir) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(log.sessionId)) {
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
    }

    const filePath = path.join(userDir, `${log.sessionId}.json`);
    if (!filePath.startsWith(userDir + path.sep)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    fs.mkdirSync(userDir, { recursive: true });
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(log), "utf-8");
    }

    if (rawLogText && rawLogText.length > 0) {
      const safeRawName = (rawFileName || `${log.sessionId}.txt`)
        .replace(/[\u0000-\u001f\u007f]/g, "-")
        .replace(/[\\\/]/g, "-");
      const baseName = path.basename(safeRawName);
      const parsedName = path.parse(baseName);
      const rawName =
        parsedName.ext.toLowerCase() === ".txt"
          ? baseName
          : `${parsedName.name}.txt`;
      const rawPath = path.join(userDir, rawName);
      if (rawPath.startsWith(userDir + path.sep) && !fs.existsSync(rawPath)) {
        fs.writeFileSync(rawPath, rawLogText, "utf-8");
      }
    }

    return NextResponse.json({ id: log.sessionId, sessionId: log.sessionId });
  } catch {
    return NextResponse.json({ error: "Failed to save log" }, { status: 500 });
  }
}
