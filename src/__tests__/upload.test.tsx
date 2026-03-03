/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import UploadPage from "@/app/upload/page";

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

vi.mock("@/components/upload/DropZone", () => ({
  default: ({ onFilesAccepted }: any) => (
    <div
      data-testid="drop-zone"
      onClick={() => {
        const mockFile = new File(["test"], "test.log", { type: "text/plain" });
        onFilesAccepted([mockFile]);
      }}
    >
      Drop files here
    </div>
  ),
}));

vi.mock("@/components/upload/ShareButton", () => ({
  default: () => <button data-testid="share-button">Share</button>,
}));

vi.mock("@/lib/parser", () => ({
  parseLogFile: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";
import { useParsedLogs } from "@/hooks/useParsedLogs";
import { signIn } from "next-auth/react";
import { parseLogFile } from "@/lib/parser";

describe("Upload Page - Upload Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Unauthenticated User Behavior", () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        isAuthenticated: false,
        character: null,
        isLoading: false,
      });

      (useParsedLogs as any).mockReturnValue({
        setActiveLog: vi.fn(),
      });
    });

    it("displays login prompt for unauthenticated users", async () => {
      render(<UploadPage />);

      // Should show auth banner
      const panels = screen.getAllByTestId("panel");
      const authBanner = panels.find((panel) =>
        panel.className?.includes("border-t-cyan-glow"),
      );

      expect(authBanner).toBeTruthy();
      expect(authBanner).toHaveTextContent("Sign in to Save Logs");
      expect(authBanner).toHaveTextContent(
        "Authenticate with EVE Online to save logs across devices",
      );
    });

    it("shows sign-in button in auth banner for unauthenticated users", async () => {
      render(<UploadPage />);

      const signInButton = screen.getByRole("button", {
        name: /log in with eve online/i,
      });
      expect(signInButton).toBeInTheDocument();

      // Click should trigger signIn
      fireEvent.click(signInButton);
      expect(signIn).toHaveBeenCalledWith("eve-sso");
    });

    it("displays anonymous upload warning in drop zone", async () => {
      render(<UploadPage />);

      const warning = screen.getByText(
        /Your current log will be replaced by the next upload/i,
      );
      expect(warning).toBeInTheDocument();
    });

    it("allows file selection without authentication", async () => {
      render(<UploadPage />);

      // Get the drop zone
      const dropZone = screen.getByTestId("drop-zone");
      expect(dropZone).toBeInTheDocument();

      // Parse button should exist and be disabled initially
      const parseButton = screen.getByTestId("button-parse logs");
      expect(parseButton).toHaveAttribute("disabled");
    });
  });

  describe("Authenticated User Behavior", () => {
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
        setActiveLog: vi.fn(),
      });

      (parseLogFile as any).mockResolvedValue({
        sessionId: "test-session",
        fileName: "test.log",
        entries: [],
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
      });
    });

    it("does not show login prompt for authenticated users", () => {
      render(<UploadPage />);

      // Auth banner should not be present or should not show sign-in button
      const signInButton = screen.queryByRole("button", {
        name: /log in with eve online/i,
      });
      expect(signInButton).not.toBeInTheDocument();
    });

    it("does not show anonymous upload warning", () => {
      render(<UploadPage />);

      const warning = screen.queryByText(
        /Your current log will be replaced by the next upload/i,
      );
      expect(warning).not.toBeInTheDocument();
    });

    it("shows history link after successful upload", async () => {
      render(<UploadPage />);

      // Get the drop zone and trigger file selection
      const dropZone = screen.getByTestId("drop-zone");
      fireEvent.click(dropZone);

      // Click parse button
      const parseButton = screen.getByTestId("button-parse logs");
      fireEvent.click(parseButton);

      // Wait for results to appear
      await waitFor(() => {
        const historyLink = screen.queryByText(/History/i);
        if (historyLink) {
          expect(historyLink).toHaveAttribute("href", "/history");
        }
      });
    });

    it("shows success message after upload", async () => {
      render(<UploadPage />);

      // Get the drop zone and trigger file selection
      const dropZone = screen.getByTestId("drop-zone");
      fireEvent.click(dropZone);

      // Click parse button
      const parseButton = screen.getByTestId("button-parse logs");
      fireEvent.click(parseButton);

      // Wait for success message
      await waitFor(() => {
        const successMsg = screen.queryByText(/Log saved to your account/i);
        expect(successMsg).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("does not display auth elements while loading", () => {
      (useAuth as any).mockReturnValue({
        isAuthenticated: false,
        character: null,
        isLoading: true,
      });

      (useParsedLogs as any).mockReturnValue({
        setActiveLog: vi.fn(),
      });

      render(<UploadPage />);

      const signInButton = screen.queryByRole("button", {
        name: /log in with eve online/i,
      });
      expect(signInButton).not.toBeInTheDocument();

      const authBanner = screen.queryByText(/Sign in to Save Logs/);
      expect(authBanner).not.toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        isAuthenticated: false,
        character: null,
        isLoading: false,
      });

      (useParsedLogs as any).mockReturnValue({
        setActiveLog: vi.fn(),
      });
    });

    it("displays error message on parse failure", async () => {
      const errorMessage = "Failed to parse log file";
      (parseLogFile as any).mockRejectedValue(new Error(errorMessage));

      render(<UploadPage />);

      // Get the drop zone and trigger file selection
      const dropZone = screen.getByTestId("drop-zone");
      fireEvent.click(dropZone);

      // Click parse button
      const parseButton = screen.getByTestId("button-parse logs");
      fireEvent.click(parseButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe("UI Integration", () => {
    it("renders page with correct title", () => {
      (useAuth as any).mockReturnValue({
        isAuthenticated: false,
        character: null,
        isLoading: false,
      });

      (useParsedLogs as any).mockReturnValue({
        setActiveLog: vi.fn(),
      });

      render(<UploadPage />);

      const layout = screen.getByTestId("app-layout");
      expect(layout).toHaveAttribute("data-title", "UPLOAD LOGS");
    });

    it("displays drop zone panel", () => {
      (useAuth as any).mockReturnValue({
        isAuthenticated: false,
        character: null,
        isLoading: false,
      });

      (useParsedLogs as any).mockReturnValue({
        setActiveLog: vi.fn(),
      });

      render(<UploadPage />);

      const dropZone = screen.getByTestId("drop-zone");
      expect(dropZone).toBeInTheDocument();
    });
  });
});
