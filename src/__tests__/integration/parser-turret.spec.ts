import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseLogFile } from "@/lib/parser/eveLogParser";

describe("parser integration — turret mix fixture", () => {
  it("parses fixture and assigns turret classifications and multipliers", async () => {
    const path = join(__dirname, "../fixtures/sample-turret-mix.txt");
    const raw = readFileSync(path, "utf-8");
    const parsed = await parseLogFile(raw);

    // Must have entries
    expect(parsed.entries.length).toBeGreaterThan(0);

    // Find at least one turret damage-dealt entry and assert classification
    const turretEntry = parsed.entries.find(
      (e) =>
        e.eventType === "damage-dealt" &&
        e.weapon?.toLowerCase().includes("autocannon"),
    );
    expect(turretEntry).toBeDefined();
    if (turretEntry) {
      expect(turretEntry.weaponSystemType).toBeDefined();
      expect(turretEntry.weaponSystemType).toBeTruthy();
      // multiplier should be a number for known outcomes
      expect(typeof turretEntry.damageMultiplier).toBe("number");
    }

    // Ensure a miss-outgoing is parsed
    const missOutgoing = parsed.entries.find(
      (e) => e.eventType === "miss-outgoing",
    );
    expect(missOutgoing).toBeDefined();

    // Ensure a drone entry exists and is flagged
    const drone = parsed.entries.find((e) => e.isDrone === true);
    expect(drone).toBeDefined();
  });
});
