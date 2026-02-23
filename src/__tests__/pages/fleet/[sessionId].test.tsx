import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FleetSessionDetailPage from "@/app/fleet/[sessionId]/page";
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

// Mock clipboard API
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: vi.fn(),
  },
  writable: true,
});

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LogsProvider>
      <FleetProvider>{children}</FleetProvider>
    </LogsProvider>
  );
}

describe("FleetSessionDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("loads session data", async () => {
    const session = EXAMPLE_FLEET_SESSIONS[0];
    const mockData = {
      session,
      participants: session.participants,
      logs: session.logs,
      analysisReady: false,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <TestWrapper>
        <FleetSessionDetailPage params={{ sessionId: "session-1" }} />
      </TestWrapper>,
    );

    // Wait for session data to load
    await waitFor(() => {
      expect(
        screen.getByText("Blood Raider Outpost Assault"),
      ).toBeInTheDocument();
    });

    // Check session code is displayed
    expect(screen.getByText("FLEET-ABC123")).toBeInTheDocument();

    // Check copy button exists
    expect(screen.getByText("Copy Code")).toBeInTheDocument();
  });

  it("renders participants table", async () => {
    const session = EXAMPLE_FLEET_SESSIONS[0];
    const mockData = {
      session,
      participants: session.participants,
      logs: session.logs,
      analysisReady: false,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <TestWrapper>
        <FleetSessionDetailPage params={{ sessionId: "session-1" }} />
      </TestWrapper>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("Participants (2)")).toBeInTheDocument();
    });

    // Check pilot names are rendered
    expect(screen.getByText("Captain Alpha")).toBeInTheDocument();
    expect(screen.getByText("Lieutenant Beta")).toBeInTheDocument();

    // Check ship types
    expect(screen.getByText("Abaddon")).toBeInTheDocument();
    expect(screen.getByText("Raven")).toBeInTheDocument();

    // Check statuses (mapped to display text)
    expect(screen.getByText("ANALYZING")).toBeInTheDocument();
  });

  it("opens LogUploadForm when upload button is clicked", async () => {
    const session = EXAMPLE_FLEET_SESSIONS[0];
    const mockData = {
      session,
      participants: session.participants,
      logs: session.logs,
      analysisReady: false,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <TestWrapper>
        <FleetSessionDetailPage params={{ sessionId: "session-1" }} />
      </TestWrapper>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("Upload New Log")).toBeInTheDocument();
    });

    // Initially form should not be visible
    expect(screen.queryByText("Log File (.txt)")).not.toBeInTheDocument();

    // Click upload button
    const uploadButton = screen.getByText("Upload New Log");
    fireEvent.click(uploadButton);

    // Form should now be visible
    expect(screen.getByText("Log File (.txt)")).toBeInTheDocument();
    expect(screen.getByText("Pilot Name")).toBeInTheDocument();
    expect(screen.getByText("Ship Type (Optional)")).toBeInTheDocument();
  });

  it("displays analysis tabs when analysis is ready", async () => {
    const session = EXAMPLE_FLEET_SESSIONS[0];
    const mockData = {
      session,
      participants: session.participants,
      logs: session.logs,
      analysisReady: true,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <TestWrapper>
        <FleetSessionDetailPage params={{ sessionId: "session-1" }} />
      </TestWrapper>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    // Check that analysis tabs are visible
    expect(screen.getByText("Damage Dealt")).toBeInTheDocument();
    expect(screen.getByText("Kills")).toBeInTheDocument();
    expect(screen.getByText("Damage Taken")).toBeInTheDocument();
    expect(screen.getByText("Cap Pressure")).toBeInTheDocument();
  });

  it("handles session not found error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    render(
      <TestWrapper>
        <FleetSessionDetailPage params={{ sessionId: "invalid-id" }} />
      </TestWrapper>,
    );

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText("Session Not Found")).toBeInTheDocument();
    });

    expect(screen.getByText("Session not found")).toBeInTheDocument();
  });
});
