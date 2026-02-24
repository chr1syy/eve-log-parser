import { render, screen, fireEvent } from "@testing-library/react";
import FleetAnalysisTabs from "@/components/fleet/FleetAnalysisTabs";
import type { FleetSession } from "@/types/fleet";

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
        repsGiven: 500,
        repsTaken: 300,
        status: "active",
        logId: "log-1",
      },
    ],
    logs: [],
    tags: [],
    status: "ACTIVE",
  };

  it("renders disabled tabs when analysisReady is false", () => {
    render(
      <FleetAnalysisTabs sessionData={mockSession} analysisReady={false} />,
    );

    expect(
      screen.getByText("Upload at least one log to see fleet analysis"),
    ).toBeInTheDocument();

    // Check that tabs are disabled
    const overviewTab = screen.getByText("Overview");
    expect(overviewTab).toBeDisabled();
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

    // Should show placeholder
    expect(screen.getByText("Coming in Phase 2")).toBeInTheDocument();
  });

  it("does not render FleetOverviewTab for non-overview tabs", () => {
    render(
      <FleetAnalysisTabs sessionData={mockSession} analysisReady={true} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Damage Dealt" }));

    expect(screen.queryByText("Fleet Participants")).not.toBeInTheDocument();
  });
});
