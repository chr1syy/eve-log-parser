import { describe, it, expect } from "vitest";
import { classifyWeaponSystem } from "@/lib/parser/eveLogParser";
import { WeaponSystemType } from "@/lib/types";

describe("classifyWeaponSystem", () => {
  it("classifies turrets", () => {
    expect(classifyWeaponSystem("AutoCannon II")).toBe(WeaponSystemType.TURRET);
    expect(classifyWeaponSystem("Heavy Pulse Laser")).toBe(
      WeaponSystemType.TURRET,
    );
    expect(classifyWeaponSystem("Experimental Blaster")).toBe(
      WeaponSystemType.TURRET,
    );
  });

  it("classifies missiles", () => {
    expect(classifyWeaponSystem("Caldari Navy Mjolnir Heavy Missile")).toBe(
      WeaponSystemType.MISSILE,
    );
    expect(classifyWeaponSystem("Nova Rocket")).toBe(WeaponSystemType.MISSILE);
    expect(classifyWeaponSystem("Torpedo Launcher")).toBe(
      WeaponSystemType.MISSILE,
    );
  });

  it("classifies drones", () => {
    expect(classifyWeaponSystem("Wasp II")).toBe(WeaponSystemType.DRONE);
    expect(classifyWeaponSystem("Infiltrator I")).toBe(WeaponSystemType.DRONE);
    expect(classifyWeaponSystem("Hobgoblin")).toBe(WeaponSystemType.DRONE);
  });

  it("returns UNKNOWN for unrelated strings", () => {
    expect(classifyWeaponSystem("Medium Remote Armor Repairer II")).toBe(
      WeaponSystemType.UNKNOWN,
    );
    expect(classifyWeaponSystem("")).toBe(WeaponSystemType.UNKNOWN);
  });
});
