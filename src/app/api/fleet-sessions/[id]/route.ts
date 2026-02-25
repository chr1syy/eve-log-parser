import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/fleet/sessionStore";
import { mergeFleetLogs } from "@/lib/fleet/logMerging";
import { calculateParticipantStats } from "@/lib/fleet/participantStats";
import type { ParsedLog } from "@/lib/types";
import type { FleetParticipant, FleetLog } from "@/types/fleet";

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

    const parsedLogs = session.logs
      .map((log) => {
        try {
          const parsed = JSON.parse(log.logData) as ParsedLog;
          const entries = parsed.entries.map((entry) => ({
            ...entry,
            timestamp: new Date(entry.timestamp as unknown as string),
          }));
          return {
            pilot: log.pilotName,
            shipType: log.shipType,
            entries,
          };
        } catch {
          return null;
        }
      })
      .filter(
        (
          log,
        ): log is {
          pilot: string;
          shipType: string;
          entries: ParsedLog["entries"];
        } => Boolean(log),
      );

    const baseParticipants: FleetParticipant[] =
      session.participants.length > 0
        ? session.participants
        : session.logs.map((log) => ({
            pilotName: log.pilotName,
            shipType: log.shipType,
            damageDealt: 0,
            damageTaken: 0,
            repsGiven: 0,
            repsTaken: 0,
            status: "ready" as const,
            logId: log.id,
          }));

    const mergedEntries = mergeFleetLogs(parsedLogs);
    const computedParticipants = calculateParticipantStats(
      mergedEntries,
      baseParticipants,
    );

    const analysisReady = session.logs.length > 0;

    const sessionWithParticipants = {
      ...session,
      participants: computedParticipants,
    };

    return NextResponse.json({
      session: sessionWithParticipants,
      participants: computedParticipants,
      logs: session.logs,
      analysisReady,
      mergedEntries,
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
