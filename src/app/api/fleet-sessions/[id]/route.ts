import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/fleet/sessionStore";
import { mergeFleetLogs, matchLogsByTimestamp } from "@/lib/fleet/logMerging";
import { calculateParticipantStats } from "@/lib/fleet/participantStats";
import type { ParsedLog } from "@/lib/types";
import type { FleetParticipant } from "@/types/fleet";

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

    const analysisReady =
      parsedLogs.length >= 2 && matchLogsByTimestamp(parsedLogs).overlapping;

    const sessionWithParticipants = {
      ...session,
      participants: computedParticipants,
    };

    // Ensure each returned log includes displayName (derived on server)
    const logsWithDisplay = session.logs.map((l) => ({
      ...l,
      displayName: l.displayName ?? undefined,
    }));

    return NextResponse.json({
      session: sessionWithParticipants,
      participants: computedParticipants,
      logs: logsWithDisplay,
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
