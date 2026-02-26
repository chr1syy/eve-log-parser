import { describe, it, expect } from "vitest";
import { multiplierForOutcome } from "@/lib/parser/eveLogParser";

describe("multiplierForOutcome", () => {
  it("returns expected multipliers for known outcomes", () => {
    expect(multiplierForOutcome("Wreck")).toBeCloseTo(3.0);
    expect(multiplierForOutcome("Smashes")).toBeCloseTo(1.37);
    expect(multiplierForOutcome("Penetrates")).toBeCloseTo(1.125);
    expect(multiplierForOutcome("Hits")).toBeCloseTo(0.875);
    expect(multiplierForOutcome("Glances Off")).toBeCloseTo(0.625);
    expect(multiplierForOutcome("Grazes")).toBeCloseTo(0.5625);
    expect(multiplierForOutcome("Misses")).toBeCloseTo(0.0);
  });

  it("returns 0.0 for unknown outcomes", () => {
    expect(multiplierForOutcome("SomethingElse")).toBeCloseTo(0.0);
    expect(multiplierForOutcome("")).toBeCloseTo(0.0);
    expect(multiplierForOutcome("  ")).toBeCloseTo(0.0);
  });
});
