import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { z } from "zod";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE_DIR = path.join(process.cwd(), "data", "user-logs");

function safeUserDir(userId: string): string | null {
  if (!UUID_RE.test(userId)) return null;
  const dir = path.join(BASE_DIR, userId);
  // Prevent path traversal: resolved path must be a direct child of BASE_DIR
  if (!dir.startsWith(BASE_DIR + path.sep)) return null;
  return dir;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, log } = body as {
      userId?: string;
      log?: { sessionId?: string };
    };

    if (!userId || !log?.sessionId) {
      return NextResponse.json(
        { error: "Missing userId or log.sessionId" },
        { status: 400 },
      );
    }

    const userDir = safeUserDir(userId);
    if (!userDir) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (!UUID_RE.test(log.sessionId)) {
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
    }

    const filePath = path.join(userDir, `${log.sessionId}.json`);
    // Validate filePath is within userDir (double-check)
    if (!filePath.startsWith(userDir + path.sep)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Skip write if file already exists (same content-hash sessionId = idempotent)
    if (fs.existsSync(filePath)) {
      return NextResponse.json({ ok: true });
    }

    fs.mkdirSync(userDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(log), "utf-8");

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save log" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? "";

    const userDir = safeUserDir(userId);
    if (!userDir) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (!fs.existsSync(userDir)) {
      return NextResponse.json({ logs: [] });
    }

    const files = fs.readdirSync(userDir).filter((f) => f.endsWith(".json"));

    const metas: Record<string, unknown>[] = [];
    for (const file of files) {
      const filePath = path.join(userDir, file);
      // Paranoid path check
      if (!filePath.startsWith(userDir + path.sep)) continue;
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        // Strip entries to return metadata only
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { entries: _e, ...meta } = parsed as {
          entries: unknown;
          [key: string]: unknown;
        };
        // Ensure displayName is present when possible
        if (!meta.displayName) {
          // attempt to derive from characterName or fileName
          if ("characterName" in meta && typeof meta.characterName === "string")
            meta.displayName = meta.characterName as string;
          else if ("fileName" in meta && typeof meta.fileName === "string")
            meta.displayName = meta.fileName as string;
        }
        metas.push(meta);
      } catch {
        // Skip corrupt files
      }
    }

    // Sort by parsedAt descending, cap at 50
    metas.sort((a, b) => {
      const aDate = a.parsedAt ? new Date(a.parsedAt as string).getTime() : 0;
      const bDate = b.parsedAt ? new Date(b.parsedAt as string).getTime() : 0;
      return bDate - aDate;
    });

    return NextResponse.json({ logs: metas.slice(0, 50) });
  } catch {
    return NextResponse.json({ error: "Failed to list logs" }, { status: 500 });
  }
}
