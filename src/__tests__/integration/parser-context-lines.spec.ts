import { describe, expect, it } from "vitest";
import { parseLogFile } from "@/lib/parser/eveLogParser";

describe("parser integration — context lines", () => {
  it("keeps notify/None lines as 'other' entries while still parsing combat", async () => {
    const raw = `
Listener: Test Pilot
Session Started: 2025.10.23 01:33:33
[ 2025.10.23 02:10:00 ] (notify) Ship stopping
[ 2025.10.23 02:10:01 ] (None) Jumping from A to B
[ 2025.10.23 02:10:02 ] (hint) Attempting to join a channel
[ 2025.10.23 02:10:03 ] (question) You have a fitting with the name Test, do you want to update it?
[ 2025.10.23 02:10:04 ] (combat) <color=0xff00ffff><b>100</b> to Test Target[TAG](Rifter) - 200mm AutoCannon II - Hits
`.trim();

    const parsed = await parseLogFile(raw);

    const others = parsed.entries.filter((e) => e.eventType === "other");
    const combat = parsed.entries.filter((e) => e.eventType === "damage-dealt");

    expect(others.length).toBe(2);
    expect(others.some((e) => e.rawLine.startsWith("(notify)"))).toBe(true);
    expect(others.some((e) => e.rawLine.startsWith("(None)"))).toBe(true);
    expect(combat.length).toBe(1);
  });
});
