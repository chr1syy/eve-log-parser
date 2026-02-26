import { NextRequest, NextResponse } from "next/server";
import { updateLogMetadata, getSession } from "@/lib/fleet/sessionStore";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> },
) {
  try {
    const { id, logId } = await params;
    const session = getSession(id);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Session not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const allowed: Array<"displayName" | "pilotName" | "shipType"> = [
      "displayName",
      "pilotName",
      "shipType",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updates[key] = (body as any)[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: "No updatable fields provided" },
        { status: 400 },
      );
    }

    const updated = updateLogMetadata(id, logId, updates as any);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Log not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, fleetLog: updated });
  } catch (err) {
    console.error("Error updating log metadata:", err);
    return NextResponse.json(
      { success: false, message: "Failed to update log" },
      { status: 500 },
    );
  }
}
