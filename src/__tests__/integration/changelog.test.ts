import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ChangelogPage from "../../app/changelog/page";
import { VersionResponse, ChangelogResponse } from "../../lib/types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Changelog Page Integration", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("renders changelog page with version and commits", async () => {
    const mockVersion: VersionResponse = {
      version: "1.0.0",
      buildTime: "2023-01-01T00:00:00Z",
      gitCommit: "abc123",
    };

    const mockChangelog: ChangelogResponse = {
      commits: [
        {
          hash: "abc123def456",
          message: "Initial commit",
          author: "John Doe",
          timestamp: "2023-01-01T00:00:00Z",
          url: "https://github.com/repo/commit/abc123def456",
        },
        {
          hash: "def456ghi789",
          message: "Add changelog API",
          author: "Jane Smith",
          timestamp: "2023-01-02T00:00:00Z",
        },
      ],
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersion),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockChangelog),
      });

    render(<ChangelogPage />);

    // Check title
    expect(screen.getByText("CHANGELOG")).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("v1.0.0")).toBeInTheDocument();
    });

    // Check commits
    expect(screen.getByText("Initial commit")).toBeInTheDocument();
    expect(screen.getByText("Add changelog API")).toBeInTheDocument();

    // Check responsive layout classes (basic check)
    const container = screen.getByText("COMMIT HISTORY").closest("div");
    expect(container).toHaveClass("bg-space");
  });

  it("handles version API fetch error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<ChangelogPage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("renders empty state when no commits", async () => {
    const mockVersion: VersionResponse = {
      version: "1.0.0",
      buildTime: "2023-01-01T00:00:00Z",
    };

    const mockChangelog: ChangelogResponse = {
      commits: [],
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersion),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockChangelog),
      });

    render(<ChangelogPage />);

    await waitFor(() => {
      expect(screen.getByText("No commits found")).toBeInTheDocument();
    });
  });

  it("displays responsive layout on different screen sizes", async () => {
    const mockVersion: VersionResponse = {
      version: "1.0.0",
      buildTime: "2023-01-01T00:00:00Z",
    };

    const mockChangelog: ChangelogResponse = {
      commits: [
        {
          hash: "abc123",
          message: "Test commit",
          author: "Test Author",
          timestamp: "2023-01-01T00:00:00Z",
        },
      ],
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersion),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockChangelog),
      });

    render(<ChangelogPage />);

    await waitFor(() => {
      const mainContainer = screen.getByText("COMMIT HISTORY").closest("div");
      expect(mainContainer).toHaveClass("p-4", "md:p-6");
    });
  });
});