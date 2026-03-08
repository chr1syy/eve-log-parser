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
      screen.getByRole("button", { name: "Cap Pressure" }),
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
});
