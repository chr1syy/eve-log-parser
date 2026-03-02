import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isUserAuthenticated } from "@/lib/auth-utils";
import { getLog, deleteLog, getAnonymousLog } from "@/lib/db/logs";
import fs from "fs";
import path from "path";
import { z } from "zod";

const DATA_DIR = path.join(process.cwd(), "data", "shared-logs");

/**
 * GET /api/logs/[id]
 * Retrieves a specific log:
 * - Authenticated: Returns log if user owns it
 * - Unauthenticated: Returns anonymous log if session matches
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;

  // Strict UUID validation to prevent path traversal
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      uuid,
    )
  ) {
    return NextResponse.json({ error: "Invalid UUID" }, { status: 400 });
  }

  try {
    const authenticated = await isUserAuthenticated();

    if (authenticated) {
      // Authenticated: verify ownership
      const user = await getCurrentUser();
      if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const log = await getLog(uuid, user.id);
      if (!log) {
        return NextResponse.json({ error: "Log not found" }, { status: 404 });
      }

      return NextResponse.json({ log });
    } else {
      // Unauthenticated: check if session ID matches or use query param
      const sessionId =
        request.nextUrl.searchParams.get("sessionId") ||
        request.cookies.get("eve-session-id")?.value;

      if (!sessionId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const log = await getAnonymousLog(sessionId);
      if (!log || log.id !== uuid) {
        return NextResponse.json({ error: "Log not found" }, { status: 404 });
      }

      return NextResponse.json({ log });
    }
  } catch (error) {
    console.error("[API] GET /api/logs/[uuid] error:", error);
    return NextResponse.json({ error: "Failed to fetch log" }, { status: 500 });
  }
}

/**
 * DELETE /api/logs/[id]
 * Deletes a log:
 * - Authenticated: Deletes if user owns it
 * - Unauthenticated: Deletes if session matches
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;

  // Validate UUID format
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      uuid,
    )
  ) {
    return NextResponse.json({ error: "Invalid UUID" }, { status: 400 });
  }

  try {
    const authenticated = await isUserAuthenticated();

    if (authenticated) {
      // Authenticated: verify ownership and delete
      const user = await getCurrentUser();
      if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const rowsDeleted = await deleteLog(uuid, user.id);
      if (rowsDeleted === 0) {
        return NextResponse.json({ error: "Log not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } else {
      // Unauthenticated: must be in the database already to delete
      const sessionId =
        request.nextUrl.searchParams.get("sessionId") ||
        request.cookies.get("eve-session-id")?.value;

      if (!sessionId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // For anonymous logs, we use sessionId as user_id
      const rowsDeleted = await deleteLog(uuid, sessionId);
      if (rowsDeleted === 0) {
        return NextResponse.json({ error: "Log not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    }
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
 * Updates metadata (displayName, pilotName, shipType) for a shared log.
 * Operates on the file-based shared-logs store.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;

    // Strict UUID validation
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        uuid,
      )
    ) {
      return NextResponse.json({ error: "Invalid UUID" }, { status: 400 });
    }

    const filePath = path.join(DATA_DIR, `${uuid}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    // Validate input using zod to ensure sane lengths and types
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

    // Pretty-print to keep on-disk store readable
    fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf-8");

    // best-effort audit
    try {
      const { appendAuditEntry } = await import("@/lib/audit");
      appendAuditEntry({
        action: "patchSharedLog",
        uuid,
        updates: { displayName, pilotName, shipType },
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, log: parsed });
  } catch (err) {
    console.error("Failed to PATCH shared log:", err);
    return NextResponse.json(
      { error: "Failed to update log" },
      { status: 500 },
    );
  }
}
