import { NextRequest, NextResponse } from "next/server";
import {
  findSessionByCode,
  getSession,
} from "@/lib/fleet/sessionStore";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { code } = body as { code: string };

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
