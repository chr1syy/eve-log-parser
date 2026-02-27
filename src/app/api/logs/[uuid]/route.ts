import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { z } from "zod";

const DATA_DIR = path.join(process.cwd(), "data", "shared-logs");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;

  // Strict UUID validation to prevent path traversal
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      uuid,
    )
  ) {
    return NextResponse.json({ error: "Invalid UUID" }, { status: 400 });
  }

  const filePath = path.join(DATA_DIR, `${uuid}.json`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return new NextResponse(data, {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to read log" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;

    // Strict UUID validation
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        uuid,
      )
    ) {
      return NextResponse.json({ error: "Invalid UUID" }, { status: 400 });
    }

    const filePath = path.join(DATA_DIR, `${uuid}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    // Validate input using zod to ensure sane lengths and types
    const body = await request.json().catch(() => ({}));
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

    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (typeof displayName === "string")
      parsed.displayName = displayName.trim();
    if (typeof pilotName === "string") parsed.pilotName = pilotName.trim();
    if (typeof shipType === "string") parsed.shipType = shipType.trim();

    // Pretty-print to keep on-disk store readable
    fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf-8");

    // best-effort audit
    try {
      const { appendAuditEntry } = await import("@/lib/audit");
      appendAuditEntry({
        action: "patchSharedLog",
        uuid,
        updates: { displayName, pilotName, shipType },
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, log: parsed });
  } catch (err) {
    console.error("Failed to PATCH shared log:", err);
    return NextResponse.json(
      { error: "Failed to update log" },
      { status: 500 },
    );
  }
}
