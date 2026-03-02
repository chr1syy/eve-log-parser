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
  useParams: () => ({ sessionId: "session-1" }),
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
    // Allow localStorage access for "session-1" so the page doesn't deny access
    vi.mocked(window.localStorage.getItem).mockImplementation((key: string) =>
      key === "fleet:session-ids" ? '["session-1"]' : null,
    );
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
        <FleetSessionDetailPage />
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
        <FleetSessionDetailPage />
      </TestWrapper>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("Participants (2)")).toBeInTheDocument();
    });

    // Check pilot names are rendered
    expect(screen.getAllByText("Captain Alpha").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lieutenant Beta").length).toBeGreaterThan(0);

    // Check ship types
    expect(screen.getAllByText("Abaddon").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Raven").length).toBeGreaterThan(0);

    // Check statuses (mapped to display text)
    expect(screen.getAllByText("Analyzing").length).toBeGreaterThan(0);
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
        <FleetSessionDetailPage />
      </TestWrapper>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("Upload New Log")).toBeInTheDocument();
    });

    // Analysis upload form should be visible
    expect(screen.getByText("Log File (.txt)")).toBeInTheDocument();

    // Click upload button
    const uploadButton = screen.getByText("Upload New Log");
    fireEvent.click(uploadButton);

    // A second upload form should now be visible
    expect(screen.getAllByText("Log File (.txt)").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Ship Type (Optional)").length).toBeGreaterThan(
      1,
    );
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
        <FleetSessionDetailPage />
      </TestWrapper>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    // Check that analysis tabs are visible
    expect(
      screen.getByRole("button", { name: "Damage Dealt" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reps" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Damage Taken" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cap Pressure" }),
    ).toBeInTheDocument();
  });

  it("handles session not found error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    render(
      <TestWrapper>
        <FleetSessionDetailPage />
      </TestWrapper>,
    );

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText("Session Not Found")).toBeInTheDocument();
    });

    expect(screen.getByText("Session not found")).toBeInTheDocument();
  });
});
