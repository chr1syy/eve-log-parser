import { NextRequest, NextResponse } from "next/server";
import type { ParsedLog } from "@/lib/types";
import { getCurrentUser, isUserAuthenticated } from "@/lib/auth-utils";
import {
  createLog,
  getUserLogs,
  updateAnonymousLog,
  getAnonymousLog,
} from "@/lib/db/logs";
import type { Log } from "@/lib/db/models";

/**
 * GET /api/logs
 * Returns:
 * - Authenticated: Array of all logs for the user
 * - Unauthenticated: Single anonymous log from localStorage session
 */
export async function GET(request: NextRequest) {
  try {
    const authenticated = await isUserAuthenticated();

    if (authenticated) {
      // Authenticated: return all user logs
      const user = await getCurrentUser();
      if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const logs = await getUserLogs(user.id);
      return NextResponse.json({ logs });
    } else {
      // Unauthenticated: get session ID from query or cookies
      const sessionId =
        request.nextUrl.searchParams.get("sessionId") ||
        request.cookies.get("eve-session-id")?.value;

      if (!sessionId) {
        // No session, return empty array
        return NextResponse.json({ logs: [] });
      }

      const log = await getAnonymousLog(sessionId);
      return NextResponse.json({ logs: log ? [log] : [] });
    }
  } catch (error) {
    console.error("[API] GET /api/logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/logs
 * Stores a log:
 * - Authenticated: Creates new log in database
 * - Unauthenticated: Replaces anonymous log in database
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      log: ParsedLog;
      filename?: string;
    };
    const { log, filename } = body;

    if (!log?.sessionId) {
      return NextResponse.json(
        { error: "Invalid log data: missing sessionId" },
        { status: 400 },
      );
    }

    if (!log.entries || !Array.isArray(log.entries)) {
      return NextResponse.json(
        { error: "Invalid log data: missing entries" },
        { status: 400 },
      );
    }

    const authenticated = await isUserAuthenticated();

    if (authenticated) {
      // Authenticated: create new log in database
      const user = await getCurrentUser();
      if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const createdLog = await createLog({
        user_id: user.id,
        filename: filename || log.fileName || "combat_log.txt",
        log_data: log,
        metadata: {
          entries_count: log.entries.length,
          combat_duration_ms: log.stats.activeTimeMinutes
            ? log.stats.activeTimeMinutes * 60 * 1000
            : undefined,
        },
      });

      return NextResponse.json({
        id: createdLog.id,
        sessionId: log.sessionId,
      });
    } else {
      // Unauthenticated: update/replace anonymous log
      const sessionId = log.sessionId;

      const updatedLog = await updateAnonymousLog(
        sessionId,
        filename || log.fileName || "combat_log.txt",
        log,
      );

      // Set session ID cookie for future requests
      const response = NextResponse.json({
        id: updatedLog.id,
        sessionId: log.sessionId,
      });

      response.cookies.set("eve-session-id", sessionId, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        httpOnly: true,
        sameSite: "lax",
      });

      return response;
    }
  } catch (error) {
    console.error("[API] POST /api/logs error:", error);
    return NextResponse.json({ error: "Failed to save log" }, { status: 500 });
  }
}
