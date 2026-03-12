import { describe, expect, it } from "vitest";
import { parseLogFile } from "@/lib/parser/eveLogParser";

const LOG_HEADER = `
Listener: Test Pilot
Session Started: 2025.10.23 01:33:33
`.trim();

function makeLog(...lines: string[]): string {
  return `${LOG_HEADER}\n${lines.join("\n")}`;
}

describe("kill candidate parser", () => {
  it("parses weapon deactivation on target destroy from notify channel", async () => {
    const raw = makeLog(
      "[ 2025.10.23 02:10:00 ] (notify) Dual 180mm AutoCannon II deactivates as TL Domi begins to explode.",
    );
    const parsed = await parseLogFile(raw);
    const kills = parsed.entries.filter((e) => e.eventType === "kill-candidate");

    expect(kills).toHaveLength(1);
    expect(kills[0].killCandidateWeapon).toBe("Dual 180mm AutoCannon II");
    expect(kills[0].killCandidateTarget).toBe("TL Domi");
    expect(kills[0].killCandidateIsLoss).toBe(false);
  });

  it("parses NPC weapon deactivation pattern from notify channel", async () => {
    const raw = makeLog(
      "[ 2025.10.23 02:10:00 ] (notify) Arch Angel Rogue deactivates as Serpentis Scout begins to explode.",
    );
    const parsed = await parseLogFile(raw);
    const kills = parsed.entries.filter((e) => e.eventType === "kill-candidate");

    expect(kills).toHaveLength(1);
    expect(kills[0].killCandidateWeapon).toBe("Arch Angel Rogue");
    expect(kills[0].killCandidateTarget).toBe("Serpentis Scout");
    expect(kills[0].killCandidateIsLoss).toBe(false);
  });

  it("parses deactivation pattern from None channel", async () => {
    const raw = makeLog(
      "[ 2025.10.23 02:10:00 ] (None) Heavy Pulse Laser II deactivates as Blood Raider begins to explode.",
    );
    const parsed = await parseLogFile(raw);
    const kills = parsed.entries.filter((e) => e.eventType === "kill-candidate");

    expect(kills).toHaveLength(1);
    expect(kills[0].killCandidateWeapon).toBe("Heavy Pulse Laser II");
    expect(kills[0].killCandidateTarget).toBe("Blood Raider");
    expect(kills[0].killCandidateIsLoss).toBe(false);
  });

  it("parses own ship destroyed pattern", async () => {
    const raw = makeLog(
      "[ 2025.10.23 02:10:00 ] (notify) Your Vexor has been destroyed.",
    );
    const parsed = await parseLogFile(raw);
    const kills = parsed.entries.filter((e) => e.eventType === "kill-candidate");

    expect(kills).toHaveLength(1);
    expect(kills[0].killCandidateTarget).toBe("Vexor");
    expect(kills[0].killCandidateWeapon).toBeUndefined();
    expect(kills[0].killCandidateIsLoss).toBe(true);
  });

  it("non-destruction notify lines fall through to eventType other", async () => {
    const raw = makeLog(
      "[ 2025.10.23 02:10:00 ] (notify) Ship stopping",
    );
    const parsed = await parseLogFile(raw);
    const kills = parsed.entries.filter((e) => e.eventType === "kill-candidate");
    const others = parsed.entries.filter((e) => e.eventType === "other");

    expect(kills).toHaveLength(0);
    expect(others).toHaveLength(1);
    expect(others[0].rawLine).toContain("Ship stopping");
  });

  it("non-destruction None lines fall through to eventType other", async () => {
    const raw = makeLog(
      "[ 2025.10.23 02:10:00 ] (None) Jumping from Jita to Perimeter",
    );
    const parsed = await parseLogFile(raw);
    const kills = parsed.entries.filter((e) => e.eventType === "kill-candidate");
    const others = parsed.entries.filter((e) => e.eventType === "other");

    expect(kills).toHaveLength(0);
    expect(others).toHaveLength(1);
  });

  it("handles multiple kill candidates in one log", async () => {
    const raw = makeLog(
      "[ 2025.10.23 02:10:00 ] (notify) Dual 180mm AutoCannon II deactivates as TL Domi begins to explode.",
      "[ 2025.10.23 02:10:05 ] (notify) Your Vexor has been destroyed.",
      "[ 2025.10.23 02:10:10 ] (notify) Ship stopping",
    );
    const parsed = await parseLogFile(raw);
    const kills = parsed.entries.filter((e) => e.eventType === "kill-candidate");
    const others = parsed.entries.filter((e) => e.eventType === "other");

    expect(kills).toHaveLength(2);
    expect(others).toHaveLength(1);
    expect(kills[0].killCandidateIsLoss).toBe(false);
    expect(kills[1].killCandidateIsLoss).toBe(true);
  });

  it("deactivation pattern is case-insensitive", async () => {
    const raw = makeLog(
      "[ 2025.10.23 02:10:00 ] (notify) Pulse Laser II DEACTIVATES AS Target Ship BEGINS TO EXPLODE.",
    );
    const parsed = await parseLogFile(raw);
    const kills = parsed.entries.filter((e) => e.eventType === "kill-candidate");

    expect(kills).toHaveLength(1);
    expect(kills[0].killCandidateTarget).toBe("Target Ship");
  });

  it("kill candidates coexist with combat entries", async () => {
    const raw = makeLog(
      "[ 2025.10.23 02:10:00 ] (combat) <color=0xff00ffff><b>100</b> to Test Target[TAG](Rifter) - 200mm AutoCannon II - Hits",
      "[ 2025.10.23 02:10:01 ] (notify) 200mm AutoCannon II deactivates as Test Target begins to explode.",
    );
    const parsed = await parseLogFile(raw);
    const combat = parsed.entries.filter((e) => e.eventType === "damage-dealt");
    const kills = parsed.entries.filter((e) => e.eventType === "kill-candidate");

    expect(combat).toHaveLength(1);
    expect(kills).toHaveLength(1);
    expect(kills[0].killCandidateTarget).toBe("Test Target");
  });
});
