import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateFleetSessionPage from "@/app/fleet/create/page";
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

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LogsProvider>
      <FleetProvider>{children}</FleetProvider>
    </LogsProvider>
  );
}

describe("CreateFleetSessionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("renders create form with Fight Name and Tags fields", () => {
    render(
      <TestWrapper>
        <CreateFleetSessionPage />
      </TestWrapper>,
    );

    expect(screen.getByText("Create New Fleet Session")).toBeInTheDocument();

    expect(screen.getByLabelText("Fight Name (Optional)")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Tags (Optional, comma-separated)"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Session" }),
    ).toBeInTheDocument();
  });

  it("calls API on form submission", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <CreateFleetSessionPage />
      </TestWrapper>,
    );

    // Fill form
    await user.type(
      screen.getByLabelText("Fight Name (Optional)"),
      "Test Fight",
    );
    await user.type(
      screen.getByLabelText("Tags (Optional, comma-separated)"),
      "test, pvp",
    );

    // Submit
    await user.click(screen.getByRole("button", { name: "Create Session" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/fleet-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fightName: "Test Fight",
          tags: ["test", "pvp"],
        }),
      });
    });
  });

  it("shows success state with session code after creation", async () => {
    const user = userEvent.setup();

    // Mock successful creation response
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ id: "session-123", code: "FLEET-ABC123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            session: {
              id: "session-123",
              code: "FLEET-ABC123",
              creator: "test-user",
              createdAt: new Date(),
              participants: [],
              logs: [],
              tags: [],
              status: "ACTIVE",
            },
          }),
      });

    render(
      <TestWrapper>
        <CreateFleetSessionPage />
      </TestWrapper>,
    );

    // Fill and submit form
    await user.type(
      screen.getByLabelText("Fight Name (Optional)"),
      "Test Fight",
    );
    await user.click(screen.getByRole("button", { name: "Create Session" }));

    await waitFor(() => {
      expect(screen.getByText("Fleet Session Created")).toBeInTheDocument();
      expect(screen.getByText("FLEET-ABC123")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Copy Code" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Go to Session" }),
      ).toBeInTheDocument();
    });
  });

  it("displays error message on API failure", async () => {
    const user = userEvent.setup();

    // Mock API failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Session creation failed" }),
    });

    render(
      <TestWrapper>
        <CreateFleetSessionPage />
      </TestWrapper>,
    );

    // Submit form
    await user.click(screen.getByRole("button", { name: "Create Session" }));

    await waitFor(() => {
      expect(screen.getByText("Session creation failed")).toBeInTheDocument();
    });
  });

  it("handles network error gracefully", async () => {
    const user = userEvent.setup();

    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(
      <TestWrapper>
        <CreateFleetSessionPage />
      </TestWrapper>,
    );

    // Submit form
    await user.click(screen.getByRole("button", { name: "Create Session" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });
});
