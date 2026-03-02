import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import FleetIndexPage from "@/app/fleet/page";
import { LogsProvider } from "@/contexts/LogsContext";

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

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <LogsProvider>{children}</LogsProvider>;
}

describe("FleetIndexPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders fleet index page with actions", () => {
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

    expect(
      screen.getByText(
        "Fleet sessions are private. Only pilots with the session code can join.",
      ),
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

  it("displays the privacy notice", () => {
    render(
      <TestWrapper>
        <FleetIndexPage />
      </TestWrapper>,
    );

    expect(
      screen.getByText(
        "Fleet sessions are private. Only pilots with the session code can join.",
      ),
    ).toBeInTheDocument();
  });
});
