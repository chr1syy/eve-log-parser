import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/fleet/sessionStore";
import type { FleetSession, FleetParticipant, FleetLog } from "@/types/fleet";

function isAnalysisReady(logs: FleetLog[]): boolean {
  if (logs.length < 2) return false;

  // Parse timestamps from logs
  const timeRanges = logs
    .map((log) => {
      try {
        const parsed = JSON.parse(log.logData);
        return {
          start: new Date(parsed.sessionStart),
          end: new Date(parsed.sessionEnd),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (timeRanges.length !== logs.length) return false;

  // Check for overlap within ±5 min tolerance
  const toleranceMs = 5 * 60 * 1000; // 5 minutes
  for (let i = 0; i < timeRanges.length; i++) {
    for (let j = i + 1; j < timeRanges.length; j++) {
      const range1 = timeRanges[i]!;
      const range2 = timeRanges[j]!;

      // Check if ranges overlap considering tolerance
      const overlapStart = Math.max(
        range1.start.getTime(),
        range2.start.getTime() - toleranceMs,
      );
      const overlapEnd = Math.min(
        range1.end.getTime(),
        range2.end.getTime() + toleranceMs,
      );

      if (overlapStart < overlapEnd) {
        return true;
      }
    }
  }

  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = getSession(id);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const analysisReady = isAnalysisReady(session.logs);

    return NextResponse.json({
      session,
      participants: session.participants,
      logs: session.logs,
      analysisReady,
    });
  } catch (error) {
    console.error("Error retrieving fleet session:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const deleted = deleteSession(id);
    if (!deleted) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fleet session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 },
    );
  }
}
