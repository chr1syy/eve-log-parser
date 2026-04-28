import { render, screen, fireEvent } from "@testing-library/react";
import FleetAnalysisTabs from "@/components/fleet/FleetAnalysisTabs";
import type { FleetSession } from "@/types/fleet";
import type { LogEntry } from "@/lib/types";

describe("FleetAnalysisTabs", () => {
  const mockSession: FleetSession = {
    id: "session-1",
    code: "FLEET-ABC123",
    creator: "user-1",
    createdAt: new Date(),
    participants: [
      {
        pilotName: "Pilot One",
        shipType: "Typhoon",
        damageDealt: 1500,
        damageTaken: 800,
        repsGiven: 0,
        repsTaken: 0,
        status: "active",
        logId: "log-1",
      },
    ],
    logs: [],
    tags: [],
    status: "ACTIVE",
  };

  it("renders tabs with notice when analysisReady is false", () => {
    render(
      <FleetAnalysisTabs sessionData={mockSession} analysisReady={false} />,
    );

    expect(
      screen.getByText("Upload logs to populate fleet analysis metrics"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Overview" }),
    ).toBeInTheDocument();
  });

  it("renders tabs when analysisReady is true", () => {
    render(
      <FleetAnalysisTabs sessionData={mockSession} analysisReady={true} />,
    );

    expect(
      screen.getByRole("button", { name: "Overview" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Damage Dealt" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Damage Taken" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reps" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cap" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Composition" }),
    ).toBeInTheDocument();
  });

  it("shows Overview tab as active by default", () => {
    render(
      <FleetAnalysisTabs sessionData={mockSession} analysisReady={true} />,
    );

    const overviewTab = screen.getByRole("button", { name: "Overview" });
    expect(overviewTab).toHaveClass("border-b-2", "border-accent");
  });

  it("switches tab content on click", () => {
    render(
      <FleetAnalysisTabs sessionData={mockSession} analysisReady={true} />,
    );

    // Initially shows Overview content
    expect(screen.getByText("Fleet Participants")).toBeInTheDocument();

    // Click Damage Dealt
    fireEvent.click(screen.getByRole("button", { name: "Damage Dealt" }));

    // No entries passed → empty state
    expect(
      screen.getByText("No outgoing damage in uploaded logs"),
    ).toBeInTheDocument();
  });

  it("does not render FleetOverviewTab for non-overview tabs", () => {
    render(
      <FleetAnalysisTabs sessionData={mockSession} analysisReady={true} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Damage Dealt" }));

    expect(screen.queryByText("Fleet Participants")).not.toBeInTheDocument();
  });

  it("renders rep rows from rep entries even when participant totals are zero", () => {
    const entries: LogEntry[] = [
      {
        id: "rep-1",
        timestamp: new Date("2026-03-08T12:00:00.000Z"),
        rawLine: "125 remote armor repaired to",
        eventType: "rep-outgoing",
        amount: 125,
        fleetPilot: "Pilot One",
      },
    ];

    render(
      <FleetAnalysisTabs
        sessionData={mockSession}
        analysisReady={true}
        entries={entries}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reps" }));

    expect(screen.getByText("Pilot One")).toBeInTheDocument();
    expect(screen.getByText("125")).toBeInTheDocument();
    expect(screen.getByText("Total reps given")).toBeInTheDocument();
  });

  describe("CapTab", () => {
    const fleetSession: FleetSession = {
      id: "session-cap",
      code: "FLEET-CAP1",
      creator: "user-1",
      createdAt: new Date(),
      participants: [
        {
          pilotName: "Logi One",
          shipType: "Guardian",
          damageDealt: 0,
          damageTaken: 0,
          repsGiven: 0,
          repsTaken: 0,
          status: "active",
          logId: "log-1",
        },
        {
          pilotName: "DPS One",
          shipType: "Typhoon",
          damageDealt: 0,
          damageTaken: 0,
          repsGiven: 0,
          repsTaken: 0,
          status: "active",
          logId: "log-2",
        },
      ],
      logs: [],
      tags: [],
      status: "ACTIVE",
    };

    const baseEntry = {
      rawLine: "",
    };

    function makeCapEntry(
      idx: number,
      ts: string,
      eventType: LogEntry["eventType"],
      capAmount: number,
      fleetPilot: string,
    ): LogEntry {
      return {
        ...baseEntry,
        id: `cap-${idx}`,
        timestamp: new Date(ts),
        eventType,
        capAmount,
        fleetPilot,
        capEventType: eventType as LogEntry["capEventType"],
      };
    }

    it("shows empty state when there are no cap events", () => {
      const entries: LogEntry[] = [
        {
          ...baseEntry,
          id: "rep-only",
          timestamp: new Date("2026-04-28T12:00:00.000Z"),
          eventType: "rep-outgoing",
          amount: 100,
          fleetPilot: "Logi One",
        },
      ];

      render(
        <FleetAnalysisTabs
          sessionData={fleetSession}
          analysisReady={true}
          entries={entries}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Cap" }));

      expect(
        screen.getByText(
          /No energy neutraliser or nosferatu events recorded/i,
        ),
      ).toBeInTheDocument();
    });

    it("aggregates cap dealt and cap taken per pilot from all four cap event types", () => {
      const entries: LogEntry[] = [
        // Logi One — receives 600 GJ neut + 150 GJ nos drained
        makeCapEntry(
          1,
          "2026-04-28T12:00:00.000Z",
          "neut-received",
          400,
          "Logi One",
        ),
        makeCapEntry(
          2,
          "2026-04-28T12:00:30.000Z",
          "neut-received",
          200,
          "Logi One",
        ),
        makeCapEntry(
          3,
          "2026-04-28T12:01:00.000Z",
          "nos-received",
          150,
          "Logi One",
        ),
        // DPS One — deals 80 GJ neut + 20 GJ nos
        makeCapEntry(
          4,
          "2026-04-28T12:00:15.000Z",
          "neut-dealt",
          80,
          "DPS One",
        ),
        makeCapEntry(
          5,
          "2026-04-28T12:00:45.000Z",
          "nos-dealt",
          20,
          "DPS One",
        ),
      ];

      render(
        <FleetAnalysisTabs
          sessionData={fleetSession}
          analysisReady={true}
          entries={entries}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Cap" }));

      // Both pilots present
      expect(screen.getByText("Logi One")).toBeInTheDocument();
      expect(screen.getByText("DPS One")).toBeInTheDocument();

      // Logi One: 0 dealt / 750 GJ taken — at least one element shows "750 GJ"
      expect(
        screen.getAllByText((c) => c.replace(/\s+/g, " ").includes("750 GJ"))
          .length,
      ).toBeGreaterThan(0);

      // DPS One: 100 dealt / 0 taken (80 + 20)
      expect(
        screen.getAllByText((c) => c.replace(/\s+/g, " ").includes("100 GJ"))
          .length,
      ).toBeGreaterThan(0);

      // Totals row
      expect(screen.getByText("Total cap dealt / taken")).toBeInTheDocument();
    });

    it("sorts pilots by cap taken descending", () => {
      const entries: LogEntry[] = [
        makeCapEntry(
          1,
          "2026-04-28T12:00:00.000Z",
          "neut-received",
          50,
          "DPS One",
        ),
        makeCapEntry(
          2,
          "2026-04-28T12:00:01.000Z",
          "neut-received",
          500,
          "Logi One",
        ),
      ];

      render(
        <FleetAnalysisTabs
          sessionData={fleetSession}
          analysisReady={true}
          entries={entries}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Cap" }));

      const pilotNodes = screen.getAllByText(/Logi One|DPS One/);
      // First match should be Logi One (more taken) before DPS One
      const firstNonChartPilot = pilotNodes.find(
        (n) => n.tagName.toLowerCase() === "span",
      );
      expect(firstNonChartPilot?.textContent).toBe("Logi One");
    });

    it("falls back to pilotName when fleetPilot is missing", () => {
      const entries: LogEntry[] = [
        {
          ...baseEntry,
          id: "neut-fallback",
          timestamp: new Date("2026-04-28T12:00:00.000Z"),
          eventType: "neut-received",
          capEventType: "neut-received",
          capAmount: 300,
          pilotName: "Logi One",
        },
      ];

      render(
        <FleetAnalysisTabs
          sessionData={fleetSession}
          analysisReady={true}
          entries={entries}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Cap" }));

      expect(screen.getByText("Logi One")).toBeInTheDocument();
      expect(
        screen.getAllByText((c) => c.replace(/\s+/g, " ").includes("300 GJ"))
          .length,
      ).toBeGreaterThan(0);
    });

    it("renders neut/nos/hits per-pilot breakdown", () => {
      const entries: LogEntry[] = [
        makeCapEntry(
          1,
          "2026-04-28T12:00:00.000Z",
          "neut-received",
          400,
          "Logi One",
        ),
        makeCapEntry(
          2,
          "2026-04-28T12:00:30.000Z",
          "nos-received",
          150,
          "Logi One",
        ),
      ];

      render(
        <FleetAnalysisTabs
          sessionData={fleetSession}
          analysisReady={true}
          entries={entries}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Cap" }));

      // breakdown line uses "neut <dealt> / <taken>" and "nos <dealt> / <taken>" and "hits <dealt> / <taken>"
      expect(
        screen.getByText((c) => c.replace(/\s+/g, " ").startsWith("neut 0 /")),
      ).toBeInTheDocument();
      expect(
        screen.getByText((c) => c.replace(/\s+/g, " ").startsWith("nos 0 /")),
      ).toBeInTheDocument();
      expect(
        screen.getByText((c) => c.replace(/\s+/g, " ").startsWith("hits 0 / 2")),
      ).toBeInTheDocument();
    });

    it("ignores non-cap event types (damage, reps, misses)", () => {
      const entries: LogEntry[] = [
        {
          ...baseEntry,
          id: "dmg",
          timestamp: new Date("2026-04-28T12:00:00.000Z"),
          eventType: "damage-dealt",
          amount: 1000,
          fleetPilot: "DPS One",
        },
        {
          ...baseEntry,
          id: "rep",
          timestamp: new Date("2026-04-28T12:00:01.000Z"),
          eventType: "rep-received",
          amount: 500,
          fleetPilot: "Logi One",
        },
      ];

      render(
        <FleetAnalysisTabs
          sessionData={fleetSession}
          analysisReady={true}
          entries={entries}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Cap" }));

      expect(
        screen.getByText(
          /No energy neutraliser or nosferatu events recorded/i,
        ),
      ).toBeInTheDocument();
    });
  });
});
