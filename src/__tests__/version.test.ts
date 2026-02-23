import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { getVersion, getVersionInfo } from "../lib/version";
import { GET as getVersionRoute } from "../app/api/version/route";
import { GET as getChangelogRoute } from "../app/api/changelog/route";

// Mock fs and child_process
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

describe("Version Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getVersion", () => {
    it("should parse version from package.json", () => {
      const mockPackageJson = JSON.stringify({ version: "1.2.3" });
      (readFileSync as any).mockReturnValue(mockPackageJson);

      const version = getVersion();
      expect(version).toBe("1.2.3");
    });

    it("should handle missing version in package.json", () => {
      const mockPackageJson = JSON.stringify({ name: "test" });
      (readFileSync as any).mockReturnValue(mockPackageJson);

      expect(() => getVersion()).toThrow();
    });

    it("should handle invalid JSON in package.json", () => {
      (readFileSync as any).mockReturnValue("invalid json");

      expect(() => getVersion()).toThrow();
    });
  });

  describe("getVersionInfo", () => {
    it("should return version info with git data", () => {
      const mockPackageJson = JSON.stringify({ version: "1.2.3" });
      (readFileSync as any).mockReturnValue(mockPackageJson);
      (execSync as any)
        .mockReturnValueOnce("abc123def456\n")
        .mockReturnValueOnce("v1.2.3\n");

      const info = getVersionInfo();
      expect(info).toEqual({
        version: "1.2.3",
        buildTime: expect.any(String),
        gitCommit: "abc123def456",
        gitTag: "v1.2.3",
      });
      expect(info.buildTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should handle missing git data", () => {
      const mockPackageJson = JSON.stringify({ version: "1.2.3" });
      (readFileSync as any).mockReturnValue(mockPackageJson);
      (execSync as any).mockImplementation(() => {
        throw new Error("git not found");
      });

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
      const mockPackageJson = JSON.stringify({ version: "1.2.3" });
      (readFileSync as any).mockReturnValue(mockPackageJson);
      (execSync as any).mockImplementation(() => {
        throw new Error("git not found");
      });

      const request = new Request("http://localhost/api/version");
      const response = await getVersionRoute(request);
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
      const request = new Request("http://localhost/api/changelog");
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
      const request = new Request(
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
