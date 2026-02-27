import { NextRequest, NextResponse } from "next/server";
import { updateLogMetadata, getSession } from "@/lib/fleet/sessionStore";
import type { FleetLog } from "@/types/fleet";
import { z } from "zod";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> },
) {
  try {
    const { id, logId } = await params;
    const body = await request.json();
    // validate/sanitize incoming payload
    const schema = z
      .object({
        displayName: z.string().min(1).max(200).optional(),
        pilotName: z.string().min(1).max(100).optional(),
        shipType: z.string().min(1).max(100).optional(),
      })
      .strict();

    const parsedBody = schema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsedBody.error.issues },
        { status: 400 },
      );
    }

    const { displayName, pilotName, shipType } = parsedBody.data;

    const session = getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const updates: Partial<
      Pick<FleetLog, "displayName" | "pilotName" | "shipType">
    > = {};
    if (typeof displayName === "string") updates.displayName = displayName;
    if (typeof pilotName === "string") updates.pilotName = pilotName;
    if (typeof shipType === "string") updates.shipType = shipType;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 },
      );
    }

    const updated = updateLogMetadata(id, logId, updates);
    if (!updated) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    // best-effort audit trail
    try {
      const { appendAuditEntry } = await import("@/lib/audit");
      appendAuditEntry({
        action: "updateLogMetadata",
        sessionId: id,
        logId,
        updates,
      });
    } catch {
      // ignore audit failures
    }

    return NextResponse.json({ success: true, log: updated });
  } catch (err) {
    console.error("Error updating log metadata:", err);
    return NextResponse.json(
      { error: "Failed to update log" },
      { status: 500 },
    );
  }
}
