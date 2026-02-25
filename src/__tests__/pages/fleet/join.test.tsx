import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JoinFleetSessionPage from "@/app/fleet/join/page";
import { FleetProvider } from "@/contexts/FleetContext";
import { LogsProvider } from "@/contexts/LogsContext";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Next.js router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LogsProvider>
      <FleetProvider>{children}</FleetProvider>
    </LogsProvider>
  );
}

describe("JoinFleetSessionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, session: { id: "session-1" } }),
    });
  });

  it("renders join form with code input", () => {
    render(
      <TestWrapper>
        <JoinFleetSessionPage />
      </TestWrapper>,
    );

    expect(screen.getByText("Join Fleet Session")).toBeInTheDocument();
    expect(screen.getByLabelText("Fleet Session Code")).toBeInTheDocument();
    expect(screen.getByLabelText("Pilot Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Ship Type (Optional)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("FLEET-XXXXXX")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Join Session" }),
    ).toBeInTheDocument();
  });

  it("auto-uppercases input as user types", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <JoinFleetSessionPage />
      </TestWrapper>,
    );

    const input = screen.getByLabelText("Fleet Session Code");
    await user.type(input, "fleet-abc123");

    expect(input).toHaveValue("FLEET-ABC123");
  });

  it("calls API on form submission with valid code", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <JoinFleetSessionPage />
      </TestWrapper>,
    );

    await user.type(
      screen.getByLabelText("Fleet Session Code"),
      "FLEET-ABC123",
    );
    await user.type(screen.getByLabelText("Pilot Name"), "Pilot One");
    await user.type(screen.getByLabelText("Ship Type (Optional)"), "Drake");
    await user.click(screen.getByRole("button", { name: "Join Session" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/fleet-sessions/FLEET-ABC123/join",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: "FLEET-ABC123",
            pilotName: "Pilot One",
            shipType: "Drake",
          }),
        },
      );
    });
  });

  it("shows error for invalid code format", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <JoinFleetSessionPage />
      </TestWrapper>,
    );

    await user.type(screen.getByLabelText("Fleet Session Code"), "INVALID");
    await user.type(screen.getByLabelText("Pilot Name"), "Pilot One");
    await user.click(screen.getByRole("button", { name: "Join Session" }));

    expect(
      screen.getByText(
        "Invalid session code format. Code should start with FLEET-",
      ),
    ).toBeInTheDocument();
  });

  it("redirects on successful join", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, session: { id: "session-1" } }),
    });

    render(
      <TestWrapper>
        <JoinFleetSessionPage />
      </TestWrapper>,
    );

    await user.type(
      screen.getByLabelText("Fleet Session Code"),
      "FLEET-ABC123",
    );
    await user.type(screen.getByLabelText("Pilot Name"), "Pilot One");
    await user.click(screen.getByRole("button", { name: "Join Session" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/fleet/session-1");
    });
  });

  it("displays error message on API failure", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Session not found" }),
    });

    render(
      <TestWrapper>
        <JoinFleetSessionPage />
      </TestWrapper>,
    );

    await user.type(
      screen.getByLabelText("Fleet Session Code"),
      "FLEET-ABC123",
    );
    await user.type(screen.getByLabelText("Pilot Name"), "Pilot One");
    await user.click(screen.getByRole("button", { name: "Join Session" }));

    await waitFor(() => {
      expect(screen.getByText("Session not found")).toBeInTheDocument();
    });
  });

  it("handles network error gracefully", async () => {
    const user = userEvent.setup();

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(
      <TestWrapper>
        <JoinFleetSessionPage />
      </TestWrapper>,
    );

    await user.type(
      screen.getByLabelText("Fleet Session Code"),
      "FLEET-ABC123",
    );
    await user.type(screen.getByLabelText("Pilot Name"), "Pilot One");
    await user.click(screen.getByRole("button", { name: "Join Session" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });
});
