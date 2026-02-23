import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/fleet/sessionStore";
import type { FleetParticipant } from "@/types/fleet";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      code,
      pilotName,
      shipType = "",
    } = body as {
      code: string;
      pilotName: string;
      shipType?: string;
    };

    const session = getSession(id);
    if (!session) {
      return NextResponse.json({
        success: false,
        message: "Invalid code or session not found",
        session: null,
      });
    }

    if (session.code.toLowerCase() !== code.toLowerCase()) {
      return NextResponse.json({
        success: false,
        message: "Invalid code or session not found",
        session: null,
      });
    }

    // Check if pilot already joined
    const existingParticipant = session.participants.find(
      (p) => p.pilotName === pilotName,
    );
    if (existingParticipant) {
      return NextResponse.json({
        success: false,
        message: "Pilot already joined this session",
        session: null,
      });
    }

    // Add participant
    const newParticipant: FleetParticipant = {
      pilotName,
      shipType,
      damageDealt: 0,
      damageTaken: 0,
      repsGiven: 0,
      repsTaken: 0,
      status: "pending",
      logId: "", // Will be set when log is uploaded
    };

    const updatedParticipants = [...session.participants, newParticipant];
    const updatedSession = updateSession(id, {
      participants: updatedParticipants,
    });

    if (!updatedSession) {
      return NextResponse.json({
        success: false,
        message: "Failed to update session",
        session: null,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Joined session successfully",
      session: updatedSession,
    });
  } catch (error) {
    console.error("Error joining fleet session:", error);
    return NextResponse.json({
      success: false,
      message: "Internal server error",
      session: null,
    });
  }
}
