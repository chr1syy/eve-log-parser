/**
 * Unit Tests for Authentication Utilities
 * Tests JWT token generation, character info extraction, and session management
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getServerSession,
  getCurrentUser,
  extractCharacterInfo,
  isUserAuthenticated,
  getCurrentCharacterId,
  getCurrentCharacterName,
} from "@/lib/auth-utils";
import * as authModule from "@/lib/auth";

// Mock the auth module
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Helper to create mock session
function createMockSession(overrides?: any) {
  return {
    user: {
      id: "user-id-123",
      email: "character@eveonline.com",
      character_id: 12345,
      character_name: "Test Character",
      corporation_id: 67890,
      ...overrides?.user,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

// Helper to create mock OAuth profile
function createMockProfile(overrides?: any) {
  return {
    character_id: 12345,
    character_name: "Test Character",
    corporation_id: 67890,
    corporation_name: "Test Corp",
    ...overrides,
  };
}

describe("Authentication Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────
  // getServerSession
  // ────────────────────────────────────────────────────────────
  describe("getServerSession", () => {
    it("returns the current session when user is authenticated", async () => {
      const mockSession = createMockSession();
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(mockSession);

      const result = await getServerSession();

      expect(result).toEqual(mockSession);
      expect(result?.user).toBeDefined();
      expect(result?.user.id).toBe("user-id-123");
    });

    it("returns null when user is not authenticated", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(null);

      const result = await getServerSession();

      expect(result).toBeNull();
    });

    it("includes session expiration time", async () => {
      const mockSession = createMockSession();
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(mockSession);

      const result = await getServerSession();

      expect(result?.expires).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────
  // getCurrentUser
  // ────────────────────────────────────────────────────────────
  describe("getCurrentUser", () => {
    it("returns user info when authenticated", async () => {
      const mockSession = createMockSession();
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(mockSession);

      const result = await getCurrentUser();

      expect(result).not.toBeNull();
      expect(result?.id).toBe("user-id-123");
      expect(result?.characterId).toBe(12345);
      expect(result?.characterName).toBe("Test Character");
      expect(result?.corporationId).toBe(67890);
    });

    it("returns null when not authenticated", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(null);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("returns null when session exists but has no user", async () => {
      const mockSession = { expires: new Date().toISOString() };
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(mockSession);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("maps all character fields correctly", async () => {
      const mockSession = createMockSession({
        user: {
          id: "custom-id",
          character_id: 99999,
          character_name: "Custom Character",
          corporation_id: 88888,
          email: "custom@eveonline.com",
        },
      });
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(mockSession);

      const result = await getCurrentUser();

      expect(result?.id).toBe("custom-id");
      expect(result?.characterId).toBe(99999);
      expect(result?.characterName).toBe("Custom Character");
      expect(result?.corporationId).toBe(88888);
    });
  });

  // ────────────────────────────────────────────────────────────
  // extractCharacterInfo
  // ────────────────────────────────────────────────────────────
  describe("extractCharacterInfo", () => {
    it("extracts character info from OAuth profile", () => {
      const profile = createMockProfile();

      const result = extractCharacterInfo(profile);

      expect(result.characterId).toBe(12345);
      expect(result.characterName).toBe("Test Character");
      expect(result.corporationId).toBe(67890);
    });

    it("handles profiles with additional fields", () => {
      const profile = createMockProfile({
        alliance_id: 11111,
        alliance_name: "Test Alliance",
        security_status: 5.0,
      });

      const result = extractCharacterInfo(profile);

      expect(result.characterId).toBe(12345);
      expect(result.characterName).toBe("Test Character");
      expect(result.corporationId).toBe(67890);
    });

    it("preserves character ID types", () => {
      const profile = createMockProfile({
        character_id: 987654321,
      });

      const result = extractCharacterInfo(profile);

      expect(result.characterId).toBe(987654321);
      expect(typeof result.characterId).toBe("number");
    });

    it("handles minimal profile data", () => {
      const profile = {
        character_id: 12345,
        character_name: "Character",
        corporation_id: 67890,
      };

      const result = extractCharacterInfo(profile);

      expect(result.characterId).toBe(12345);
      expect(result.characterName).toBe("Character");
      expect(result.corporationId).toBe(67890);
    });
  });

  // ────────────────────────────────────────────────────────────
  // isUserAuthenticated
  // ────────────────────────────────────────────────────────────
  describe("isUserAuthenticated", () => {
    it("returns true when user is authenticated", async () => {
      const mockSession = createMockSession();
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(mockSession);

      const result = await isUserAuthenticated();

      expect(result).toBe(true);
    });

    it("returns false when user is not authenticated", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(null);

      const result = await isUserAuthenticated();

      expect(result).toBe(false);
    });

    it("returns false when session has no user", async () => {
      const mockSession = { expires: new Date().toISOString() };
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(mockSession);

      const result = await isUserAuthenticated();

      expect(result).toBe(false);
    });

    it("returns false when session user is empty", async () => {
      const mockSession = { user: null, expires: new Date().toISOString() };
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(mockSession);

      const result = await isUserAuthenticated();

      expect(result).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────
  // getCurrentCharacterId
  // ────────────────────────────────────────────────────────────
  describe("getCurrentCharacterId", () => {
    it("returns character ID when authenticated", async () => {
      const mockSession = createMockSession();
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(mockSession);

      const result = await getCurrentCharacterId();

      expect(result).toBe(12345);
    });

    it("returns null when not authenticated", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(null);

      const result = await getCurrentCharacterId();

      expect(result).toBeNull();
    });

    it("returns the correct character ID for multiple calls", async () => {
      const mockSession1 = createMockSession({ user: { character_id: 111 } });
      const mockSession2 = createMockSession({ user: { character_id: 222 } });

      vi.spyOn(authModule, "auth").mockResolvedValueOnce(mockSession1);
      const result1 = await getCurrentCharacterId();

      vi.clearAllMocks();
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(mockSession2);
      const result2 = await getCurrentCharacterId();

      expect(result1).toBe(111);
      expect(result2).toBe(222);
    });
  });

  // ────────────────────────────────────────────────────────────
  // getCurrentCharacterName
  // ────────────────────────────────────────────────────────────
  describe("getCurrentCharacterName", () => {
    it("returns character name when authenticated", async () => {
      const mockSession = createMockSession();
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(mockSession);

      const result = await getCurrentCharacterName();

      expect(result).toBe("Test Character");
    });

    it("returns null when not authenticated", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(null);

      const result = await getCurrentCharacterName();

      expect(result).toBeNull();
    });

    it("handles special characters in character names", async () => {
      const mockSession = createMockSession({
        user: { character_name: "Test-Character's Name" },
      });
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(mockSession);

      const result = await getCurrentCharacterName();

      expect(result).toBe("Test-Character's Name");
    });

    it("handles multi-word character names", async () => {
      const mockSession = createMockSession({
        user: { character_name: "Long Character Name Here" },
      });
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(mockSession);

      const result = await getCurrentCharacterName();

      expect(result).toBe("Long Character Name Here");
    });
  });

  // ────────────────────────────────────────────────────────────
  // Session Management Integration
  // ────────────────────────────────────────────────────────────
  describe("Session management integration", () => {
    it("maintains character info across multiple calls", async () => {
      const mockSession = createMockSession();
      vi.spyOn(authModule, "auth").mockResolvedValue(mockSession);

      const user = await getCurrentUser();
      const charId = await getCurrentCharacterId();
      const charName = await getCurrentCharacterName();

      expect(user?.characterId).toBe(charId);
      expect(user?.characterName).toBe(charName);
    });

    it("returns consistent null when not authenticated across all functions", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValue(null);

      const user = await getCurrentUser();
      const isAuth = await isUserAuthenticated();
      const charId = await getCurrentCharacterId();
      const charName = await getCurrentCharacterName();

      expect(user).toBeNull();
      expect(isAuth).toBe(false);
      expect(charId).toBeNull();
      expect(charName).toBeNull();
    });

    it("handles session with missing optional fields gracefully", async () => {
      const mockSession = {
        user: {
          id: "user-id-123",
          character_id: 12345,
          character_name: "Test Character",
          // corporation_id omitted
        },
        expires: new Date().toISOString(),
      };
      vi.spyOn(authModule, "auth").mockResolvedValue(mockSession);

      const user = await getCurrentUser();
      const isAuth = await isUserAuthenticated();

      expect(user).not.toBeNull();
      expect(isAuth).toBe(true);
      expect(user?.corporationId).toBeUndefined();
    });
  });

  // ────────────────────────────────────────────────────────────
  // OAuth Profile Handling
  // ────────────────────────────────────────────────────────────
  describe("OAuth profile handling", () => {
    it("extracts character info from EVE SSO standard profile", () => {
      const profile = {
        character_id: 123456789,
        character_name: "Actual Capsuleer",
        corporation_id: 987654321,
        corporation_name: "Some Corp",
        alliance_id: 111111111,
        alliance_name: "Some Alliance",
        faction_id: null,
        security_status: 2.5,
      };

      const result = extractCharacterInfo(profile);

      expect(result.characterId).toBe(123456789);
      expect(result.characterName).toBe("Actual Capsuleer");
      expect(result.corporationId).toBe(987654321);
    });

    it("handles large character IDs correctly", () => {
      const profile = createMockProfile({
        character_id: 2147483647, // Max 32-bit int
      });

      const result = extractCharacterInfo(profile);

      expect(result.characterId).toBe(2147483647);
    });
  });
});
