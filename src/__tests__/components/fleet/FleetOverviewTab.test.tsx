import { render, screen } from "@testing-library/react";
import FleetOverviewTab from "@/components/fleet/FleetOverviewTab";
import type { FleetCombatAnalysis } from "@/types/fleet";
import type { LogEntry } from "@/lib/types";

describe("FleetOverviewTab", () => {
  const mockFleetCombatAnalysis: FleetCombatAnalysis = {
    totalDamageDealt: 2400000000, // 2.4B
    totalDamageTaken: 1800000000, // 1.8B
    totalRepsGiven: 890000000, // 890M
    fightDuration: 932, // 15m 32s
    participants: [
      {
        pilotName: "Pilot Alpha",
        shipType: "Typhoon",
        damageDealt: 1200000000,
        damageTaken: 800000000,
        repsGiven: 500000000,
        repsTaken: 300000000,
        status: "active",
        logId: "log-1",
      },
      {
        pilotName: "Pilot Beta",
        shipType: "Tempest",
        damageDealt: 1000000000,
        damageTaken: 700000000,
        repsGiven: 300000000,
        repsTaken: 200000000,
        status: "active",
        logId: "log-2",
      },
      {
        pilotName: "Pilot Gamma",
        shipType: "Hurricane",
        damageDealt: 200000000,
        damageTaken: 300000000,
        repsGiven: 90000000,
        repsTaken: 100000000,
        status: "active",
        logId: "log-3",
      },
    ],
    enemies: [
      {
        name: "Enemy One",
        corp: "Corp A",
        damageDealt: 500000000,
        damageReceived: 600000000,
        kills: 1,
      },
      {
        name: "Enemy Two",
        corp: "Corp B",
        damageDealt: 400000000,
        damageReceived: 500000000,
        kills: 1,
      },
      {
        name: "Enemy Three",
        corp: "Corp A",
        damageDealt: 300000000,
        damageReceived: 400000000,
        kills: 1,
      },
      {
        name: "Enemy Four",
        corp: "Corp C",
        damageDealt: 200000000,
        damageReceived: 300000000,
        kills: 0,
      },
      {
        name: "Enemy Five",
        corp: "Corp D",
        damageDealt: 100000000,
        damageReceived: 200000000,
        kills: 0,
      },
    ],
  };

  it("renders all metric cards with correct values", () => {
    render(<FleetOverviewTab fleetCombatAnalysis={mockFleetCombatAnalysis} />);

    expect(screen.getByText("Fight Duration")).toBeInTheDocument();
    expect(screen.getByText("15m 32s")).toBeInTheDocument();

    expect(screen.getByText("Total Damage Dealt")).toBeInTheDocument();
    expect(screen.getByText("2.4B HP")).toBeInTheDocument();

    expect(screen.getByText("Total Damage Received")).toBeInTheDocument();
    expect(screen.getByText("1.8B HP")).toBeInTheDocument();

    expect(screen.getByText("Total Reps Given")).toBeInTheDocument();
    expect(screen.getByText("890.0M HP")).toBeInTheDocument();

    expect(screen.getByText("Enemy Count")).toBeInTheDocument();
    expect(screen.getByText("5 enemies")).toBeInTheDocument();

    expect(screen.getByText("Enemy Kills")).toBeInTheDocument();
    expect(screen.getByText("3 killed")).toBeInTheDocument();
  });

  it("renders FleetParticipantsTable", () => {
    render(<FleetOverviewTab fleetCombatAnalysis={mockFleetCombatAnalysis} />);

    expect(screen.getByText("Fleet Participants")).toBeInTheDocument();
  });

  it("renders FleetEnemiesTable", () => {
    render(<FleetOverviewTab fleetCombatAnalysis={mockFleetCombatAnalysis} />);

    expect(screen.getByText("Fleet Enemies")).toBeInTheDocument();
  });

  it("recomputes total stats from brush-windowed entries when provided", () => {
    const entries: LogEntry[] = [
      {
        id: "1",
        timestamp: new Date("2026-01-01T00:00:00.000Z"),
        rawLine: "[combat]",
        eventType: "damage-dealt",
        amount: 1000,
      },
      {
        id: "2",
        timestamp: new Date("2026-01-01T00:00:10.000Z"),
        rawLine: "[combat]",
        eventType: "damage-received",
        amount: 500,
      },
      {
        id: "3",
        timestamp: new Date("2026-01-01T00:00:20.000Z"),
        rawLine: "[combat]",
        eventType: "rep-outgoing",
        amount: 200,
      },
      {
        id: "4",
        timestamp: new Date("2026-01-01T00:05:00.000Z"),
        rawLine: "[combat]",
        eventType: "damage-dealt",
        amount: 50000,
      },
    ];

    render(
      <FleetOverviewTab
        fleetCombatAnalysis={mockFleetCombatAnalysis}
        entries={entries}
        brushWindow={{ start: new Date("2026-01-01T00:00:00.000Z"), end: new Date("2026-01-01T00:00:30.000Z") }}
      />,);

    expect(screen.getByText("Showing zoomed selection")).toBeInTheDocument();
    expect(screen.getByText("1.0K HP")).toBeInTheDocument();
    expect(screen.getByText("500 HP")).toBeInTheDocument();
    expect(screen.getByText("200 HP")).toBeInTheDocument();
  });
});
