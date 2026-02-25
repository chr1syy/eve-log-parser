import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FleetProvider } from "@/contexts/FleetContext";

// Mock Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: mockReplace,
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "/";
  },
  useParams() {
    return { sessionId: "test-session-id" };
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock File and FormData for upload tests
global.File = class MockFile {
  name: string;
  size: number;
  type: string;
  constructor(
    parts: BlobPart[],
    filename: string,
    options?: { type?: string; size?: number },
  ) {
    this.name = filename;
    this.size = options?.size || 1024;
    this.type = options?.type || "text/plain";
  }
} as unknown as typeof File;

global.FormData = class MockFormData {
  private data: Map<string, unknown> = new Map();

  append(key: string, value: unknown) {
    this.data.set(key, value);
  }

  get(key: string) {
    return this.data.get(key);
  }

  getAll(key: string) {
    return [this.data.get(key)].filter(Boolean);
  }

  has(key: string) {
    return this.data.has(key);
  }

  delete(key: string) {
    this.data.delete(key);
  }

  *entries() {
    for (const [key, value] of this.data) {
      yield [key, value];
    }
  }

  [Symbol.iterator]() {
    return this.entries();
  }
} as unknown as typeof FormData;

describe("Fleet Navigation & Integration Tests", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Page Navigation Tests", () => {
    it("renders /fleet page with Create and Join buttons", async () => {
      const { default: FleetIndexPage } = await import("@/app/fleet/page");

      render(
        <FleetProvider>
          <FleetIndexPage />
        </FleetProvider>,
      );

      expect(screen.getByText("Create New Fleet Session")).toBeInTheDocument();
      expect(screen.getByText("Join Existing Session")).toBeInTheDocument();
    });

    it("clicking Create button navigates to /fleet/create", async () => {
      const { default: FleetIndexPage } = await import("@/app/fleet/page");

      render(
        <FleetProvider>
          <FleetIndexPage />
        </FleetProvider>,
      );

      const createButton = screen.getByText("Create New Fleet Session");
      await user.click(createButton);

      // Since it's a Link component, we can't directly test navigation
      // but we can verify the link exists with correct href
      const createLink = createButton.closest("a");
      expect(createLink).toHaveAttribute("href", "/fleet/create");
    });

    it("clicking Join button navigates to /fleet/join", async () => {
      const { default: FleetIndexPage } = await import("@/app/fleet/page");

      render(
        <FleetProvider>
          <FleetIndexPage />
        </FleetProvider>,
      );

      const joinButton = screen.getByText("Join Existing Session");
      await user.click(joinButton);

      const joinLink = joinButton.closest("a");
      expect(joinLink).toHaveAttribute("href", "/fleet/join");
    });
  });

  describe("Create Flow Tests", () => {
    it("fills form and submits successfully, then redirects", async () => {
      const { default: CreateFleetSessionPage } =
        await import("@/app/fleet/create/page");

      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "test-session-id", code: "FLEET-ABC123" }),
      });

      // Mock session fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session: {
            id: "test-session-id",
            code: "FLEET-ABC123",
            fightName: "Test Fight",
            createdAt: new Date().toISOString(),
          },
        }),
      });

      render(
        <FleetProvider>
          <CreateFleetSessionPage />
        </FleetProvider>,
      );

      // Fill form
      const fightNameInput = screen.getByLabelText("Fight Name (Optional)");
      const tagsInput = screen.getByLabelText(
        "Tags (Optional, comma-separated)",
      );
      const submitButton = screen.getByRole("button", {
        name: "Create Session",
      });

      await user.type(fightNameInput, "Test Fight");
      await user.type(tagsInput, "test, pvp");

      // Submit form
      await user.click(submitButton);

      // Verify API was called
      expect(mockFetch).toHaveBeenCalledWith("/api/fleet-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fightName: "Test Fight",
          tags: ["test", "pvp"],
        }),
      });

      // Wait for success state
      await waitFor(() => {
        expect(
          screen.getByText(
            "Session created successfully! Share the code with your fleet.",
          ),
        ).toBeInTheDocument();
      });

      expect(screen.getByText("FLEET-ABC123")).toBeInTheDocument();
    });

    it("shows error on API failure", async () => {
      const { default: CreateFleetSessionPage } =
        await import("@/app/fleet/create/page");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed to create session" }),
      });

      render(
        <FleetProvider>
          <CreateFleetSessionPage />
        </FleetProvider>,
      );

      const submitButton = screen.getByRole("button", {
        name: "Create Session",
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to create session"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Join Flow Tests", () => {
    it("enters valid code and joins successfully, then redirects", async () => {
      const { default: JoinFleetSessionPage } =
        await import("@/app/fleet/join/page");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "Joined session successfully",
          session: { id: "session-1" },
        }),
      });

      render(
        <FleetProvider>
          <JoinFleetSessionPage />
        </FleetProvider>,
      );

      const codeInput = screen.getByLabelText("Fleet Session Code");
      const pilotInput = screen.getByLabelText("Pilot Name");
      const shipInput = screen.getByLabelText("Ship Type (Optional)");
      const submitButton = screen.getByRole("button", { name: "Join Session" });

      await user.type(codeInput, "FLEET-ABC123");
      await user.type(pilotInput, "Pilot One");
      await user.type(shipInput, "Drake");
      await user.click(submitButton);

      // Verify API call
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

      // Verify redirect
      expect(mockPush).toHaveBeenCalledWith("/fleet/session-1");
    });

    it("shows error for invalid code", async () => {
      const { default: JoinFleetSessionPage } =
        await import("@/app/fleet/join/page");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid code or session not found" }),
      });

      render(
        <FleetProvider>
          <JoinFleetSessionPage />
        </FleetProvider>,
      );

      const codeInput = screen.getByLabelText("Fleet Session Code");
      const pilotInput = screen.getByLabelText("Pilot Name");
      const submitButton = screen.getByRole("button", { name: "Join Session" });

      await user.type(codeInput, "INVALID");
      await user.type(pilotInput, "Pilot One");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Invalid session code format. Code should start with FLEET-",
          ),
        ).toBeInTheDocument();
      });
    });

    it("shows API error for wrong code", async () => {
      const { default: JoinFleetSessionPage } =
        await import("@/app/fleet/join/page");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid code or session not found" }),
      });

      render(
        <FleetProvider>
          <JoinFleetSessionPage />
        </FleetProvider>,
      );

      const codeInput = screen.getByLabelText("Fleet Session Code");
      const pilotInput = screen.getByLabelText("Pilot Name");
      const submitButton = screen.getByRole("button", { name: "Join Session" });

      await user.type(codeInput, "FLEET-WRONG0");
      await user.type(pilotInput, "Pilot One");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Invalid code or session not found"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Session Detail Page Tests", () => {
    it("loads session data and displays correctly", async () => {
      const { default: FleetSessionDetailPage } =
        await import("@/app/fleet/[sessionId]/page");

      const mockSessionData = {
        session: {
          id: "test-session-id",
          code: "FLEET-ABC123",
          fightName: "Test Fight",
          createdAt: new Date().toISOString(),
          creator: "TestCreator",
          participants: [
            {
              pilotName: "PilotA",
              shipType: "Typhoon",
              status: "ready",
              damageDealt: 1000,
              damageTaken: 500,
              repsGiven: 200,
              repsTaken: 100,
              logId: "log1",
            },
          ],
          logs: [
            {
              id: "log1",
              sessionId: "test-session-id",
              pilotName: "PilotA",
              shipType: "Typhoon",
              logData: "test",
              uploadedAt: new Date().toISOString(),
              pilotId: "pilot1",
            },
          ],
          tags: [],
          status: "ACTIVE",
        },
        participants: [
          {
            pilotName: "PilotA",
            shipType: "Typhoon",
            status: "ready",
            damageDealt: 1000,
            damageTaken: 500,
            repsGiven: 200,
            repsTaken: 100,
            logId: "log1",
          },
        ],
        logs: [
          {
            id: "log1",
            sessionId: "test-session-id",
            pilotName: "PilotA",
            shipType: "Typhoon",
            logData: "test",
            uploadedAt: new Date().toISOString(),
            pilotId: "pilot1",
          },
        ],
        analysisReady: true,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSessionData,
      });

      render(
        <FleetProvider>
          <FleetSessionDetailPage />
        </FleetProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Fight")).toBeInTheDocument();
      });

      expect(screen.getByText("FLEET-ABC123")).toBeInTheDocument();
      expect(screen.getAllByText("PilotA").length).toBeGreaterThan(0);
      expect(screen.getByText("Combat Logs (1)")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Overview" }),
      ).toBeInTheDocument();
    });

    it("shows upload form when button clicked", async () => {
      const { default: FleetSessionDetailPage } =
        await import("@/app/fleet/[sessionId]/page");

      const mockSessionData = {
        session: {
          id: "test-session-id",
          code: "FLEET-ABC123",
          fightName: "Test Fight",
          createdAt: new Date().toISOString(),
        },
        participants: [
          {
            pilotName: "PilotA",
            shipType: "Typhoon",
            status: "ready",
            damageDealt: 1000,
            damageTaken: 500,
            repsGiven: 200,
            repsTaken: 100,
          },
        ],
        logs: [
          {
            pilotName: "PilotA",
            uploadedAt: new Date().toISOString(),
            logData: "test",
          },
        ],
        analysisReady: false,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSessionData,
      });

      render(
        <FleetProvider>
          <FleetSessionDetailPage />
        </FleetProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Fight")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getAllByText("Log File (.txt)")).toHaveLength(1);
      });

      const uploadButton = screen.getByRole("button", {
        name: "Upload New Log",
      });
      await user.click(uploadButton);

      // Verify upload form appears (should now have two forms)
      await waitFor(() => {
        expect(screen.getAllByText("Log File (.txt)")).toHaveLength(2);
      });
    });

    it("shows Fleet Overview tab after first upload when analysisReady=true", async () => {
      const { default: FleetSessionDetailPage } =
        await import("@/app/fleet/[sessionId]/page");

      const mockSessionData = {
        session: {
          id: "test-session-id",
          code: "FLEET-ABC123",
          fightName: "Test Fight",
          createdAt: new Date().toISOString(),
          creator: "TestCreator",
          participants: [
            {
              pilotName: "PilotA",
              shipType: "Typhoon",
              status: "ready",
              damageDealt: 1000,
              damageTaken: 500,
              repsGiven: 200,
              repsTaken: 100,
              logId: "log1",
            },
          ],
          logs: [
            {
              id: "log1",
              sessionId: "test-session-id",
              pilotName: "PilotA",
              shipType: "Typhoon",
              logData: "test log data",
              uploadedAt: new Date().toISOString(),
              pilotId: "pilot1",
            },
          ],
          tags: [],
          status: "ACTIVE",
        },
        participants: [
          {
            pilotName: "PilotA",
            shipType: "Typhoon",
            status: "ready",
            damageDealt: 1000,
            damageTaken: 500,
            repsGiven: 200,
            repsTaken: 100,
            logId: "log1",
          },
        ],
        logs: [
          {
            id: "log1",
            sessionId: "test-session-id",
            pilotName: "PilotA",
            shipType: "Typhoon",
            logData: "test log data",
            uploadedAt: new Date().toISOString(),
            pilotId: "pilot1",
          },
        ],
        analysisReady: true,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSessionData,
      });

      render(
        <FleetProvider>
          <FleetSessionDetailPage />
        </FleetProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Fight")).toBeInTheDocument();
      });

      // When analysisReady=true, FleetAnalysisTabs should be rendered
      expect(
        screen.getByRole("button", { name: "Overview" }),
      ).toBeInTheDocument();
    });
  });
});
