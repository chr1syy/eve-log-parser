import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JoinFleetSessionPage from "@/app/fleet/join/page";
import { FleetProvider } from "@/contexts/FleetContext";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Next.js router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <FleetProvider>{children}</FleetProvider>;
}

describe("JoinFleetSessionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
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
    await user.click(screen.getByRole("button", { name: "Join Session" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/fleet-sessions/ABC123/join",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: "FLEET-ABC123" }),
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
      json: () => Promise.resolve({}),
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
    await user.click(screen.getByRole("button", { name: "Join Session" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/fleet/ABC123");
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
    await user.click(screen.getByRole("button", { name: "Join Session" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });
});
