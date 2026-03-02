import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request?: NextRequest) {
  try {
    // If request is not provided (unit tests call GET() directly), treat as no query params.
    const searchParams = request
      ? new URL(request.url).searchParams
      : new URL("http://localhost").searchParams;
    const rawIds = searchParams.get("ids");
    const ids = rawIds ? rawIds.split(",").filter(Boolean) : [];

    const allSessions = listUserSessions();
    const filtered =
      ids.length > 0
        ? allSessions.filter((s) => ids.includes(s.id))
        : allSessions;

    const userSessions = filtered.map((session) => ({
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
