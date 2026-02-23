import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/fleet/sessionStore";
import { parseLogFile } from "@/lib/parser";
import type { FleetLog } from "@/types/fleet";

const { randomUUID } = require("crypto");

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const session = getSession(id);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Session not found" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const pilotName = formData.get("pilotName") as string;
    const shipType = (formData.get("shipType") as string) || "";

    if (!file || !pilotName) {
      return NextResponse.json(
        { success: false, message: "Missing file or pilotName" },
        { status: 400 },
      );
    }

    // Parse the log file
    const parsedLog = await parseLogFile(file);

    // Extract pilot name and timestamp range from parsed log (for validation if needed)
    const extractedPilotName = parsedLog.characterName;
    // Timestamp range: parsedLog.sessionStart to parsedLog.sessionEnd

    // Create FleetLog
    const fleetLog: FleetLog = {
      id: randomUUID(),
      sessionId: id,
      pilotName,
      shipType,
      logData: JSON.stringify(parsedLog),
      uploadedAt: new Date(),
      pilotId: pilotName, // Using pilotName as pilotId for now
    };

    // Add log to session's logs array
    const updatedLogs = [...session.logs, fleetLog];

    // Update participant status to "ready" and set logId
    const updatedParticipants = session.participants.map((participant) =>
      participant.pilotName === pilotName
        ? { ...participant, status: "ready" as const, logId: fleetLog.id }
        : participant,
    );

    // Update the session
    const updatedSession = updateSession(id, {
      logs: updatedLogs,
      participants: updatedParticipants,
    });

    if (!updatedSession) {
      return NextResponse.json(
        { success: false, message: "Failed to update session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, fleetLog });
  } catch (error) {
    console.error("Error uploading fleet log:", error);
    return NextResponse.json(
      { success: false, message: "Failed to upload log" },
      { status: 500 },
    );
  }
}
