import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isUserAuthenticated } from "@/lib/auth-utils";
import { getLog, deleteLog, getAnonymousLog } from "@/lib/db/logs";

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

  // Validate UUID format to prevent path traversal
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
