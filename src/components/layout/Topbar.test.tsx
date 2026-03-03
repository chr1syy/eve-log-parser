/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Topbar from "./Topbar";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock hooks
vi.mock("@/hooks/useParsedLogs", () => ({
  useParsedLogs: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";
import { useParsedLogs } from "@/hooks/useParsedLogs";

describe("Topbar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login button when not authenticated", () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: false,
      character: null,
      isLoading: false,
    });

    (useParsedLogs as any).mockReturnValue({
      logs: [],
      activeLog: null,
      setActiveLog: vi.fn(),
      removeLog: vi.fn(),
      needsRecovery: false,
      restoreFromUserId: vi.fn(),
    });

    render(<Topbar title="Test Page" />);

    const loginButton = screen.getByRole("button", {
      name: /log in with eve online/i,
    });
    expect(loginButton).toBeInTheDocument();
  });

  it("renders character info and logout button when authenticated", () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      character: {
        id: "123456",
        name: "TestCharacter",
        corporationId: "987654",
      },
      isLoading: false,
    });

    (useParsedLogs as any).mockReturnValue({
      logs: [],
      activeLog: null,
      setActiveLog: vi.fn(),
      removeLog: vi.fn(),
      needsRecovery: false,
      restoreFromUserId: vi.fn(),
    });

    render(<Topbar title="Test Page" />);

    const characterButton = screen.getByRole("button", {
      name: /character menu/i,
    });
    expect(characterButton).toBeInTheDocument();
    expect(screen.getByText("TestCharacter")).toBeInTheDocument();
  });

  it("renders page title", () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: false,
      character: null,
      isLoading: false,
    });

    (useParsedLogs as any).mockReturnValue({
      logs: [],
      activeLog: null,
      setActiveLog: vi.fn(),
      removeLog: vi.fn(),
      needsRecovery: false,
      restoreFromUserId: vi.fn(),
    });

    render(<Topbar title="Dashboard" />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("hides auth buttons while loading", () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: false,
      character: null,
      isLoading: true,
    });

    (useParsedLogs as any).mockReturnValue({
      logs: [],
      activeLog: null,
      setActiveLog: vi.fn(),
      removeLog: vi.fn(),
      needsRecovery: false,
      restoreFromUserId: vi.fn(),
    });

    render(<Topbar title="Test Page" />);

    // When loading, neither login button nor auth menu should be visible
    const loginButton = screen.queryByRole("button", {
      name: /log in with eve online/i,
    });
    expect(loginButton).not.toBeInTheDocument();
  });

  it("shows Upload Logs button when logs exist", () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: false,
      character: null,
      isLoading: false,
    });

    (useParsedLogs as any).mockReturnValue({
      logs: [],
      activeLog: null,
      setActiveLog: vi.fn(),
      removeLog: vi.fn(),
      needsRecovery: false,
      restoreFromUserId: vi.fn(),
    });

    render(<Topbar title="Test Page" />);

    const uploadButton = screen.getByRole("button", { name: /upload logs/i });
    expect(uploadButton).toBeInTheDocument();
  });
});
