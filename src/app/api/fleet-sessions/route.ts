import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { FleetSession, FleetSessionCode } from "@/types/fleet";

// In-memory store for sessions (temporary - will be replaced by dedicated store)
const sessionStore = new Map<string, FleetSession>();

function generateUniqueCode(): FleetSessionCode {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code: string;
  do {
    code = "FLEET-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (Array.from(sessionStore.values()).some((s) => s.code === code));
  return code as FleetSessionCode;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fightName, tags = [] } = body as {
      fightName?: string;
      tags?: string[];
    };

    const id = randomUUID();
    const code = generateUniqueCode();
    const creator = "anonymous"; // TODO: Get from auth context
    const createdAt = new Date();

    const session: FleetSession = {
      id,
      code,
      creator,
      createdAt,
      participants: [],
      logs: [],
      fightName,
      tags,
      status: "PENDING",
    };

    sessionStore.set(id, session);

    return NextResponse.json({
      id,
      code,
      createdAt,
      creator,
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
    const userSessions = Array.from(sessionStore.values()).map((session) => ({
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
