import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FleetAnalysisTabs from "@/components/fleet/FleetAnalysisTabs";
import type { FleetSession } from "@/types/fleet";

describe("Fleet Component Integration Tests", () => {
  const user = userEvent.setup();

  const mockSessionData: FleetSession = {
    id: "test-session-id",
    code: "FLEET-ABC123",
    creator: "TestCreator",
    createdAt: new Date(),
    participants: [
      {
        pilotName: "PilotA",
        shipType: "Typhoon",
        damageDealt: 1500,
        damageTaken: 300,
        repsGiven: 200,
        repsTaken: 100,
        status: "ready",
        logId: "log1",
      },
      {
        pilotName: "PilotB",
        shipType: "Brutix",
        damageDealt: 1200,
        damageTaken: 400,
        repsGiven: 150,
        repsTaken: 50,
        status: "ready",
        logId: "log2",
      },
    ],
    logs: [
      {
        id: "log1",
        sessionId: "test-session-id",
        pilotName: "PilotA",
        shipType: "Typhoon",
        logData: "test log data",
        uploadedAt: new Date(),
        pilotId: "pilot1",
      },
      {
        id: "log2",
        sessionId: "test-session-id",
        pilotName: "PilotB",
        shipType: "Brutix",
        logData: "test log data 2",
        uploadedAt: new Date(),
        pilotId: "pilot2",
      },
    ],
    fightName: "Test Fight",
    tags: ["test"],
    status: "ACTIVE",
  };

  it("renders FleetAnalysisTabs with analysisReady=true", () => {
    render(
      <FleetAnalysisTabs sessionData={mockSessionData} analysisReady={true} />,
    );

    // Verify tab navigation is present
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Damage Dealt" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Damage Taken" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reps" })).toBeInTheDocument();
  });

  it("loads FleetOverviewTab and displays metrics", () => {
    render(
      <FleetAnalysisTabs sessionData={mockSessionData} analysisReady={true} />,
    );

    // Verify FleetOverviewTab content
    expect(screen.getByText("Fight Duration")).toBeInTheDocument();
    expect(screen.getByText("Total Damage Dealt")).toBeInTheDocument();
    expect(screen.getByText("Total Damage Received")).toBeInTheDocument();
    expect(screen.getByText("Total Reps Given")).toBeInTheDocument();

    // Verify aggregated metrics (1500 + 1200 = 2700 damage dealt)
    expect(screen.getByText("2.7K HP")).toBeInTheDocument(); // Total damage dealt
    expect(screen.getByText("700 HP")).toBeInTheDocument(); // Total damage taken (300 + 400)
    expect(screen.getByText("350 HP")).toBeInTheDocument(); // Total reps given (200 + 150)
  });

  it("renders FleetParticipantsTable in overview tab", () => {
    render(
      <FleetAnalysisTabs sessionData={mockSessionData} analysisReady={true} />,
    );

    // Verify participants table headers
    expect(screen.getByText("Pilot Name")).toBeInTheDocument();
    expect(screen.getByText("Ship Type")).toBeInTheDocument();
    expect(screen.getByText("DMG Dealt")).toBeInTheDocument();
    expect(screen.getByText("DMG Taken")).toBeInTheDocument();

    // Verify participant data
    expect(screen.getByText("PilotA")).toBeInTheDocument();
    expect(screen.getByText("PilotB")).toBeInTheDocument();
    expect(screen.getByText("Typhoon")).toBeInTheDocument();
    expect(screen.getByText("Brutix")).toBeInTheDocument();
  });

  it("renders FleetEnemiesTable in overview tab", () => {
    render(
      <FleetAnalysisTabs sessionData={mockSessionData} analysisReady={true} />,
    );

    // Verify enemies table is present (even if empty)
    expect(screen.getByText("Fleet Enemies")).toBeInTheDocument();
  });

  it("switches tabs without page reload", async () => {
    render(
      <FleetAnalysisTabs sessionData={mockSessionData} analysisReady={true} />,
    );

    // Start on Overview tab
    expect(screen.getByText("Fight Duration")).toBeInTheDocument();

    // Click on "Damage Dealt" tab
    const damageTab = screen.getByRole("button", { name: "Damage Dealt" });
    await user.click(damageTab);

    // Verify tab switched - no entries provided so shows empty state
    expect(screen.getByText("No outgoing damage in uploaded logs")).toBeInTheDocument();

    // Click back to Overview
    const overviewTab = screen.getByText("Overview");
    await user.click(overviewTab);

    // Verify back to overview
    expect(screen.getByText("Fight Duration")).toBeInTheDocument();
  });

  it("shows analysis notice when analysisReady=false", () => {
    render(
      <FleetAnalysisTabs sessionData={mockSessionData} analysisReady={false} />,
    );

    expect(
      screen.getByText("Upload logs to populate fleet analysis metrics"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Overview" }),
    ).toBeInTheDocument();
  });
});
