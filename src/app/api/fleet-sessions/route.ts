import { NextRequest, NextResponse } from "next/server";
import type { FleetSession, FleetSessionCode } from "@/types/fleet";
import { createSession, listUserSessions } from "@/lib/fleet/sessionStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fightName, tags = [] } = body as {
      fightName?: string;
      tags?: string[];
    };

    const session = createSession(fightName, tags);

    return NextResponse.json({
      id: session.id,
      code: session.code,
      createdAt: session.createdAt,
      creator: session.creator,
    });
  } catch (error) {
    console.error("Error creating fleet session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const userSessions = listUserSessions().map((session) => ({
      ...session,
      participantCount: session.participants.length,
      logCount: session.logs.length,
    }));

    return NextResponse.json(userSessions);
  } catch (error) {
    console.error("Error listing fleet sessions:", error);
    return NextResponse.json(
      { error: "Failed to list sessions" },
      { status: 500 },
    );
  }
}
