import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import DashboardPage from "@/app/page";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  useSession: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock next/link
vi.mock("next/link", () => {
  return {
    default: ({
      children,
      href,
    }: {
      children: React.ReactNode;
      href: string;
    }) => <a href={href}>{children}</a>,
  };
});

// Mock hooks
vi.mock("@/hooks/useParsedLogs", () => ({
  useParsedLogs: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock components
vi.mock("@/components/layout/AppLayout", () => ({
  default: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => (
    <div data-testid="app-layout" data-title={title}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/Panel", () => ({
  default: ({ children, title, variant, className }: any) => (
    <div
      data-testid="panel"
      data-title={title}
      data-variant={variant}
      className={className}
    >
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/Button", () => ({
  default: ({ children, onClick, disabled, icon, variant, size }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      data-testid={`button-${children?.toString().toLowerCase()}`}
    >
      {icon}
      {children}
    </button>
  ),
}));

vi.mock("@/components/dashboard/StatCard", () => ({
  default: () => <div data-testid="stat-card">Stat Card</div>,
}));

vi.mock("@/components/dashboard/DamageOverTimeChart", () => ({
  default: () => <div data-testid="damage-chart">Damage Chart</div>,
}));

vi.mock("@/components/dashboard/DamageBreakdownChart", () => ({
  default: () => <div data-testid="breakdown-chart">Breakdown Chart</div>,
}));

import { useAuth } from "@/contexts/AuthContext";
import { useParsedLogs } from "@/hooks/useParsedLogs";
import { signIn } from "next-auth/react";

describe("Dashboard Page - Login Prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty State - Unauthenticated", () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        isAuthenticated: false,
        character: null,
        isLoading: false,
      });

      (useParsedLogs as any).mockReturnValue({
        activeLog: null,
      });
    });

    it("displays empty state with login prompt", () => {
      render(<DashboardPage />);

      expect(screen.getByText("NO LOGS PARSED")).toBeInTheDocument();
      expect(screen.getByText(/Upload EVE combat logs/)).toBeInTheDocument();
    });

    it("shows upload button in empty state", () => {
      render(<DashboardPage />);

      const uploadButton = screen.getByTestId("button-upload logs");
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toHaveAttribute("href", "/upload");
    });

    it("shows sign-in button in empty state", () => {
      render(<DashboardPage />);

      const signInButton = screen.getByTestId("button-sign in with eve online");
      expect(signInButton).toBeInTheDocument();
    });

    it("triggers signIn with eve-sso on sign-in button click", () => {
      render(<DashboardPage />);

      const signInButton = screen.getByTestId("button-sign in with eve online");
      fireEvent.click(signInButton);

      expect(signIn).toHaveBeenCalledWith("eve-sso");
    });

    it("displays helpful text about persistent storage", () => {
      render(<DashboardPage />);

      expect(
        screen.getByText(/Or save logs persistently/i),
      ).toBeInTheDocument();
    });
  });

  describe("Empty State - Authenticated", () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        isAuthenticated: true,
        character: {
          id: "123456",
          name: "TestCharacter",
          corporationId: "789",
        },
        isLoading: false,
      });

      (useParsedLogs as any).mockReturnValue({
        activeLog: null,
      });
    });

    it("does not show sign-in button when authenticated", () => {
      render(<DashboardPage />);

      const signInButton = screen.queryByTestId(
        "button-sign in with eve online",
      );
      expect(signInButton).not.toBeInTheDocument();
    });

    it("still shows upload button", () => {
      render(<DashboardPage />);

      const uploadButton = screen.getByTestId("button-upload logs");
      expect(uploadButton).toBeInTheDocument();
    });

    it("does not show persistent storage message", () => {
      render(<DashboardPage />);

      const persistentMsg = screen.queryByText(/Or save logs persistently/i);
      expect(persistentMsg).not.toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("does not show sign-in button while auth is loading", () => {
      (useAuth as any).mockReturnValue({
        isAuthenticated: false,
        character: null,
        isLoading: true,
      });

      (useParsedLogs as any).mockReturnValue({
        activeLog: null,
      });

      render(<DashboardPage />);

      const signInButton = screen.queryByTestId(
        "button-sign in with eve online",
      );
      expect(signInButton).not.toBeInTheDocument();
    });
  });

  describe("With Active Log", () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        isAuthenticated: false,
        character: null,
        isLoading: false,
      });

      const mockLog = {
        sessionId: "test-session",
        fileName: "test.log",
        entries: [
          {
            timestamp: new Date(),
            type: "combat",
            actor: "Test",
            target: "Target",
            weapon: "Weapon",
            damage: 100,
            outcome: "Hits" as const,
          },
        ],
        stats: {
          totalEvents: 100,
          damageDealt: 1000,
          damageReceived: 500,
          activeTimeMinutes: 30,
          topWeapons: [],
          topTargets: [],
          hitQualityDealt: {},
          hitQualityReceived: {},
          totalRepReceived: 0,
          totalRepOutgoing: 0,
          capNeutReceived: 0,
          capNeutDealt: 0,
          capNosDrained: 0,
          damageDealtByTarget: [],
          repReceivedBySource: [],
          capReceivedByShipType: [],
          capDealtByModule: [],
        },
        parsedAt: new Date(),
      };

      (useParsedLogs as any).mockReturnValue({
        activeLog: mockLog,
      });
    });

    it("does not show empty state with active log", () => {
      render(<DashboardPage />);

      expect(screen.queryByText("NO LOGS PARSED")).not.toBeInTheDocument();
    });

    it("does not show sign-in button with active log", () => {
      render(<DashboardPage />);

      const signInButton = screen.queryByTestId(
        "button-sign in with eve online",
      );
      expect(signInButton).not.toBeInTheDocument();
    });

    it("displays dashboard content", () => {
      render(<DashboardPage />);

      // Should display stat cards and charts
      const statCards = screen.getAllByTestId("stat-card");
      expect(statCards.length).toBeGreaterThan(0);
    });
  });
});
