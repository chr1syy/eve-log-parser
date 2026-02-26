import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { getSession, updateSession } from "@/lib/fleet/sessionStore";
import { parseLogFile } from "@/lib/parser";
import { broadcastToSession } from "@/lib/fleet/sseConnections";
import type { FleetLog } from "@/types/fleet";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = getSession(id);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Session not found" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const pilotNameRaw = (formData.get("pilotName") as string) || "";
    const shipTypeRaw = (formData.get("shipType") as string) || "";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Missing log file" },
        { status: 400 },
      );
    }

    // Parse the log file
    const parsedLog = await parseLogFile(file);

    // Persist the original uploaded file to disk so it can be reused for testing.
    // Saved path: <repo-root>/data/uploads/<sessionId>/<original-filename>
    try {
      if (typeof (file as File)?.arrayBuffer === "function") {
        const ab = await (file as File).arrayBuffer();
        const buffer = Buffer.from(ab);

        const uploadsDir = path.join(process.cwd(), "data", "uploads", id);
        await mkdir(uploadsDir, { recursive: true });

        const origName = (file as File).name || `upload-${Date.now()}.log`;
        let outName = origName;
        const outPath = path.join(uploadsDir, outName);

        // If a file with the same name already exists, prefix with timestamp
        try {
          await access(outPath);
          outName = `${Date.now()}-${origName}`;
        } catch {
          // access failed = file doesn't exist, keep origName
        }

        const finalPath = path.join(uploadsDir, outName);
        await writeFile(finalPath, buffer);
      }
    } catch (err) {
      console.error("Failed to save uploaded file:", err);
      // Do not fail the request for inability to persist the raw file.
    }

    const resolvedPilotName =
      pilotNameRaw.trim() || parsedLog.characterName?.trim() || "";
    if (!resolvedPilotName) {
      return NextResponse.json(
        { success: false, message: "Missing pilot name" },
        { status: 400 },
      );
    }
    const resolvedShipType = shipTypeRaw.trim() || "Unknown";

    // Create FleetLog
    const fleetLog: FleetLog = {
      id: randomUUID(),
      sessionId: id,
      pilotName: resolvedPilotName,
      shipType: resolvedShipType,
      logData: JSON.stringify(parsedLog),
      uploadedAt: new Date(),
      pilotId: resolvedPilotName, // Using pilotName as pilotId for now
    };

    // Add log to session's logs array
    const updatedLogs = [...session.logs, fleetLog];

    const existingParticipant = session.participants.find(
      (participant) => participant.pilotName === resolvedPilotName,
    );

    const updatedParticipants = existingParticipant
      ? session.participants.map((participant) =>
          participant.pilotName === resolvedPilotName
            ? { ...participant, status: "ready" as const, logId: fleetLog.id }
            : participant,
        )
      : [
          ...session.participants,
          {
            pilotName: resolvedPilotName,
            shipType: resolvedShipType,
            damageDealt: 0,
            damageTaken: 0,
            repsGiven: 0,
            repsTaken: 0,
            status: "ready" as const,
            logId: fleetLog.id,
          },
        ];

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

    // Notify all viewers of this session that new data is available
    broadcastToSession(id, {
      type: "log-uploaded",
      pilotName: resolvedPilotName,
    });

    return NextResponse.json({ success: true, fleetLog });
  } catch (error) {
    console.error("Error uploading fleet log:", error);
    return NextResponse.json(
      { success: false, message: "Failed to upload log" },
      { status: 500 },
    );
  }
}
