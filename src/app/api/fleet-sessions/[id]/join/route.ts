import { NextRequest, NextResponse } from "next/server";
import {
  findSessionByCode,
  getSession,
  updateSession,
} from "@/lib/fleet/sessionStore";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { code, pilotName, shipType } = body as {
      code: string;
      pilotName?: string;
      shipType?: string;
    };

    if (!pilotName) {
      return NextResponse.json(
        { success: false, message: "Pilot name is required", session: null },
        { status: 400 },
      );
    }

    const normalizedCode = code?.trim().toUpperCase();
    const session =
      getSession(id) ||
      (normalizedCode ? findSessionByCode(normalizedCode) : undefined) ||
      (id ? findSessionByCode(id) : undefined);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Invalid code or session not found", session: null },
        { status: 404 },
      );
    }

    if (!normalizedCode || session.code.toUpperCase() !== normalizedCode) {
      return NextResponse.json(
        { success: false, message: "Invalid code or session not found", session: null },
        { status: 400 },
      );
    }

    // Register participant if not already present
    const alreadyJoined = session.participants.some(
      (p) => p.pilotName === pilotName,
    );
    if (!alreadyJoined) {
      const updatedParticipants = [
        ...session.participants,
        {
          pilotName,
          shipType: shipType?.trim() || "",
          damageDealt: 0,
          damageTaken: 0,
          repsGiven: 0,
          repsTaken: 0,
          status: "pending" as const,
          logId: "",
        },
      ];
      updateSession(session.id, { participants: updatedParticipants });
    }

    return NextResponse.json({
      success: true,
      message: "Joined session successfully",
      session: { id: session.id },
    });
  } catch (error) {
    console.error("Error joining fleet session:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", session: null },
      { status: 500 },
    );
  }
}
