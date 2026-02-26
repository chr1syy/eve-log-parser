// vi.hoisted runs before any imports — the vi.fn() instances it returns are
// stable across vi.resetModules() calls and can be used inside vi.mock factories.
const { mockReadFileSync, mockExecSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn(),
  mockExecSync: vi.fn(),
}));

// vi.mock calls are also hoisted by Vitest before imports.
// Use synchronous factories with an explicit `default` export so Vitest's CJS
// interop layer can resolve named imports like `import { readFileSync } from "fs"`.
vi.mock("fs", () => {
  const mod = { readFileSync: mockReadFileSync };
  return { ...mod, default: mod };
});
vi.mock("child_process", () => {
  const mod = { execSync: mockExecSync };
  return { ...mod, default: mod };
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const MOCK_PACKAGE_JSON = JSON.stringify({ version: "1.2.3" });

const MOCK_CHANGELOG = JSON.stringify({
  commits: [
    {
      hash: "abc123",
      message: "test commit",
      author: "Test User",
      timestamp: "2026-01-01T00:00:00Z",
    },
  ],
});

describe("Version Management", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.GIT_SHA;
    delete process.env.GIT_TAG;
    delete process.env.BUILD_TIME;
    vi.resetModules();
  });

  describe("getVersion", () => {
    it("should parse version from package.json", async () => {
      mockReadFileSync.mockReturnValue(MOCK_PACKAGE_JSON);
      const { getVersion } = await import("../lib/version");
      expect(getVersion()).toBe("1.2.3");
    });

    it("should handle missing version in package.json", async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({ name: "test" }));
      const { getVersion } = await import("../lib/version");
      // version field absent — module initialises with undefined
      expect(getVersion()).toBeUndefined();
    });

    it("should handle invalid JSON in package.json", async () => {
      mockReadFileSync.mockReturnValue("invalid json");
      // JSON.parse throws during module init, so the dynamic import rejects
      await expect(import("../lib/version")).rejects.toThrow();
    });
  });

  describe("getVersionInfo", () => {
    it("should return version info with git data", async () => {
      mockReadFileSync.mockReturnValue(MOCK_PACKAGE_JSON);
      process.env.GIT_SHA = "abc123def456";
      process.env.GIT_TAG = "v1.2.3";
      process.env.BUILD_TIME = "2026-01-01T00:00:00.000Z";

      const { getVersionInfo } = await import("../lib/version");
      const info = getVersionInfo();
      expect(info).toEqual({
        version: "1.2.3",
        buildTime: "2026-01-01T00:00:00.000Z",
        gitCommit: "abc123def456",
        gitTag: "v1.2.3",
      });
    });

    it("should handle missing git data", async () => {
      mockReadFileSync.mockReturnValue(MOCK_PACKAGE_JSON);
      mockExecSync.mockImplementation(() => {
        throw new Error("git not found");
      });

      const { getVersionInfo } = await import("../lib/version");
      const info = getVersionInfo();
      expect(info).toEqual({
        version: "1.2.3",
        buildTime: expect.any(String),
        gitCommit: undefined,
        gitTag: undefined,
      });
    });
  });

  describe("Version API Route", () => {
    it("should return version info JSON", async () => {
      mockReadFileSync.mockReturnValue(MOCK_PACKAGE_JSON);
      mockExecSync.mockImplementation(() => {
        throw new Error("git not found");
      });

      const { GET: getVersionRoute } = await import(
        "../app/api/version/route"
      );
      const response = await getVersionRoute();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        version: "1.2.3",
        buildTime: expect.any(String),
        gitCommit: undefined,
        gitTag: undefined,
      });
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    });
  });

  describe("Changelog API Route", () => {
    it("should return changelog JSON structure", async () => {
      mockReadFileSync.mockReturnValue(MOCK_CHANGELOG);
      const { GET: getChangelogRoute } = await import(
        "../app/api/changelog/route"
      );

      const request = new NextRequest("http://localhost/api/changelog");
      const response = await getChangelogRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("commits");
      expect(Array.isArray(data.commits)).toBe(true);
      expect(data.commits.length).toBeGreaterThan(0);
      expect(data.commits[0]).toHaveProperty("hash");
      expect(data.commits[0]).toHaveProperty("message");
      expect(data.commits[0]).toHaveProperty("author");
      expect(data.commits[0]).toHaveProperty("timestamp");
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    });

    it("should handle query parameters (mocked)", async () => {
      mockReadFileSync.mockReturnValue(MOCK_CHANGELOG);
      const { GET: getChangelogRoute } = await import(
        "../app/api/changelog/route"
      );

      const request = new NextRequest(
        "http://localhost/api/changelog?from=v1.0&to=v1.1&limit=10",
      );
      const response = await getChangelogRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("commits");
      // Since it's mock data, it ignores params for now
    });
  });
});
