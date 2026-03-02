import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect, beforeAll } from "vitest";
import { parseLogFile } from "../../lib/parser";
import type { ParsedLog } from "../../lib/types";

// Helper: create a File from disk path
function fileFromDisk(filePath: string): File {
  const buffer = readFileSync(filePath);
  const blob = new Blob([buffer], { type: "text/plain" });
  return new File([blob], filePath.split("/").pop()!, { type: "text/plain" });
}

const LOG_A_PATH = resolve(__dirname, "../../20251023_013333_151402274.txt");
const LOG_B_PATH = resolve(__dirname, "../../20260219_045352_151402274.txt");

let logA: ParsedLog;
let logB: ParsedLog;

beforeAll(async () => {
  logA = await parseLogFile(fileFromDisk(LOG_A_PATH));
  logB = await parseLogFile(fileFromDisk(LOG_B_PATH));
});

describe("Cross-log — same character", () => {
  it("both logs share the same listener name", () => {
    expect(logA.characterName).toBe(logB.characterName);
    expect(logA.characterName).toBe("Bungo Brown");
  });
});

describe("Cross-log — parser robustness", () => {
  it("no entry in either log has eventType 'other' that should have been classified (damage dealt - 0xff00ffff)", () => {
    const allEntries = [...logA.entries, ...logB.entries];
    const unexpectedOther = allEntries.filter(
      (e) => e.eventType === "other" && e.rawLine.includes("0xff00ffff"),
    );
    expect(unexpectedOther.length).toBe(0);
  });

  it("no entry in either log has eventType 'other' that should have been classified (damage received - 0xffcc0000)", () => {
    const allEntries = [...logA.entries, ...logB.entries];
    const unexpectedOther = allEntries.filter(
      (e) => e.eventType === "other" && e.rawLine.includes("0xffcc0000"),
    );
    expect(unexpectedOther.length).toBe(0);
  });

  it("no entry in either log has eventType 'other' that should have been classified (misses - 0xffcc9a00)", () => {
    const allEntries = [...logA.entries, ...logB.entries];
    const unexpectedOther = allEntries.filter(
      (e) => e.eventType === "other" && e.rawLine.includes("0xffcc9a00"),
    );
    expect(unexpectedOther.length).toBe(0);
  });

  it("no entry in either log has eventType 'other' that should have been classified (neut received - 0xffe57f7f)", () => {
    const allEntries = [...logA.entries, ...logB.entries];
    const unexpectedOther = allEntries.filter(
      (e) =>
        e.eventType === "other" &&
        e.rawLine.includes("0xffe57f7f") &&
        e.rawLine.includes("energy neutralized"),
    );
    expect(unexpectedOther.length).toBe(0);
  });

  it("no entry in either log has eventType 'other' that should have been classified (neut dealt - 0xff7fffff)", () => {
    const allEntries = [...logA.entries, ...logB.entries];
    const unexpectedOther = allEntries.filter(
      (e) =>
        e.eventType === "other" &&
        e.rawLine.includes("0xff7fffff") &&
        e.rawLine.includes("energy neutralized"),
    );
    expect(unexpectedOther.length).toBe(0);
  });

  it("no entry in either log has eventType 'other' that should have been classified (nos dealt - 0xffe57f7f with 'energy drained to')", () => {
    const allEntries = [...logA.entries, ...logB.entries];
    const unexpectedOther = allEntries.filter(
      (e) =>
        e.eventType === "other" &&
        e.rawLine.includes("0xffe57f7f") &&
        e.rawLine.includes("energy drained to"),
    );
    expect(unexpectedOther.length).toBe(0);
  });

  it("no entry in either log has eventType 'other' that should have been classified (rep received - 'repaired by')", () => {
    const allEntries = [...logA.entries, ...logB.entries];
    const unexpectedOther = allEntries.filter(
      (e) => e.eventType === "other" && e.rawLine.includes("repaired by"),
    );
    expect(unexpectedOther.length).toBe(0);
  });

  it("no entry in either log has eventType 'other' that should have been classified (rep outgoing - 'repaired to')", () => {
    const allEntries = [...logA.entries, ...logB.entries];
    const unexpectedOther = allEntries.filter(
      (e) => e.eventType === "other" && e.rawLine.includes("repaired to"),
    );
    expect(unexpectedOther.length).toBe(0);
  });

  it("all amounts are non-negative numbers", () => {
    const allEntries = [...logA.entries, ...logB.entries];
    const entriesWithAmount = allEntries.filter((e) => e.amount !== undefined);
    entriesWithAmount.forEach((e) => {
      expect(e.amount).toBeGreaterThanOrEqual(0);
    });
  });

  it("all capAmounts are non-negative numbers", () => {
    const allEntries = [...logA.entries, ...logB.entries];
    const entriesWithCapAmount = allEntries.filter(
      (e) => e.capAmount !== undefined,
    );
    entriesWithCapAmount.forEach((e) => {
      expect(e.capAmount).toBeGreaterThanOrEqual(0);
    });
  });

  it("all timestamps are valid Dates", () => {
    const allEntries = [...logA.entries, ...logB.entries];
    allEntries.forEach((e) => {
      expect(e.timestamp).toBeInstanceOf(Date);
      expect(isNaN(e.timestamp.getTime())).toBe(false);
    });
  });

  it("entries are sorted chronologically within each log", () => {
    // Check Log A
    for (let i = 0; i < logA.entries.length - 1; i++) {
      const current = logA.entries[i].timestamp.getTime();
      const next = logA.entries[i + 1].timestamp.getTime();
      expect(current).toBeLessThanOrEqual(next);
    }

    // Check Log B
    for (let i = 0; i < logB.entries.length - 1; i++) {
      const current = logB.entries[i].timestamp.getTime();
      const next = logB.entries[i + 1].timestamp.getTime();
      expect(current).toBeLessThanOrEqual(next);
    }
  });
});
