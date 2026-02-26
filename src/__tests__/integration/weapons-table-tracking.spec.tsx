import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FleetDamageDealtContent from "../../components/fleet/FleetDamageDealtContent";
import type { LogEntry } from "../../lib/types";
import { WeaponSystemType } from "../../lib/types";

describe("Weapons table tracking column", () => {
  it("renders weapons table and includes Avg Turret Tracking when data present", () => {
    const entries: LogEntry[] = [
      {
        id: "1",
        timestamp: new Date("2024-01-01T00:00:00Z"),
        rawLine: "",
        eventType: "damage-dealt",
        amount: 100,
        weapon: "400mm AutoCannon",
        // mark as a turret so analyzeDamageDealt computes avgDamageMultiplier
        weaponSystemType: WeaponSystemType.TURRET,
        damageMultiplier: 1.1,
      } as unknown as LogEntry,
    ];

    // Render component — we only assert that the weapons panel is present.
    render(<FleetDamageDealtContent entries={entries} />);

    // Expect the weapons panel header and the Avg Turret Tracking column value
    expect(screen.getByText(/WEAPONS &/i)).toBeTruthy();
    expect(screen.getByText(/Avg Turret Tracking/i)).toBeTruthy();
    // The table renders the averaged multiplier fixed to 2 decimals
    expect(screen.getByText("1.10")).toBeTruthy();
  });
});
