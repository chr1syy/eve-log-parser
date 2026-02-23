import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FleetIndexPage from "@/app/fleet/page";
import { FleetProvider } from "@/contexts/FleetContext";
import { LogsProvider } from "@/contexts/LogsContext";
import { EXAMPLE_FLEET_SESSIONS } from "@/lib/fleet/constants";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LogsProvider>
      <FleetProvider>{children}</FleetProvider>
    </LogsProvider>
  );
}

describe("FleetIndexPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("renders fleet index page with session list", () => {
    render(
      <TestWrapper>
        <FleetIndexPage />
      </TestWrapper>,
    );

    // Check heading
    expect(screen.getByText("Fleet Session Management")).toBeInTheDocument();

    // Check action buttons
    expect(screen.getByText("Create New Fleet Session")).toBeInTheDocument();
    expect(screen.getByText("Join Existing Session")).toBeInTheDocument();

    // Check active sessions section
    expect(screen.getByText("Active Sessions")).toBeInTheDocument();

    // Check that session codes are displayed
    expect(screen.getByText("FLEET-ABC123")).toBeInTheDocument();
    expect(
      screen.getByText("Blood Raider Outpost Assault"),
    ).toBeInTheDocument();
  });

  it("displays Create and Join buttons as clickable links", () => {
    render(
      <TestWrapper>
        <FleetIndexPage />
      </TestWrapper>,
    );

    const createButton = screen.getByText("Create New Fleet Session");
    const joinButton = screen.getByText("Join Existing Session");

    // Buttons should be links (rendered as anchor tags by Next.js Link)
    expect(createButton.closest("a")).toHaveAttribute("href", "/fleet/create");
    expect(joinButton.closest("a")).toHaveAttribute("href", "/fleet/join");

    // Should be clickable
    expect(createButton).toBeEnabled();
    expect(joinButton).toBeEnabled();
  });

  it("displays session table with correct data", () => {
    render(
      <TestWrapper>
        <FleetIndexPage />
      </TestWrapper>,
    );

    // Check session code rendering (should be monospace)
    const sessionCode = screen.getByText("FLEET-ABC123");
    expect(sessionCode).toHaveClass("font-mono");

    // Check fight name
    expect(
      screen.getByText("Blood Raider Outpost Assault"),
    ).toBeInTheDocument();

    // Check participant count (2 participants in session-1)
    expect(screen.getByText("2")).toBeInTheDocument();

    // Check status (ACTIVE)
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();

    // Check action buttons
    expect(screen.getByText("View")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("shows archived sessions when collapsed button is clicked", () => {
    render(
      <TestWrapper>
        <FleetIndexPage />
      </TestWrapper>,
    );

    // Initially collapsed
    expect(
      screen.queryByText("Angel Cartel Mining Op Disruption"),
    ).not.toBeInTheDocument();

    // Click to expand
    const expandButton = screen.getByText("Completed/Archived Sessions (1)");
    fireEvent.click(expandButton);

    // Should now show archived session
    expect(
      screen.getByText("Angel Cartel Mining Op Disruption"),
    ).toBeInTheDocument();
    expect(screen.getByText("FLEET-XYZ789")).toBeInTheDocument();
  });

  it("handles delete session action", async () => {
    render(
      <TestWrapper>
        <FleetIndexPage />
      </TestWrapper>,
    );

    const deleteButton = screen.getAllByText("Delete")[0];
    fireEvent.click(deleteButton);

    // Should call fetch with DELETE method
    expect(mockFetch).toHaveBeenCalledWith("/api/fleet-sessions/session-1", {
      method: "DELETE",
    });
  });

  it("displays empty state when no active sessions", () => {
    // Mock empty sessions by overriding the hook
    vi.doMock("@/contexts/FleetContext", () => ({
      FleetProvider: ({ children }: { children: React.ReactNode }) => children,
      useFleetSessions: () => [],
      useFleetSessionDispatch: () => vi.fn(),
    }));

    render(
      <TestWrapper>
        <FleetIndexPage />
      </TestWrapper>,
    );

    expect(screen.getByText("No active sessions")).toBeInTheDocument();
  });
});
