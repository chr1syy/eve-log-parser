import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveCharacterIds,
  fetchRecentKillmails,
  fetchKillmailDetail,
  resolveKillmails,
  _clearCaches,
} from "@/lib/esi/esiClient";
import type { ZKillEntry, ESIKillmail } from "@/lib/esi/types";

function mockFetchResponse(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe("esiClient", () => {
  beforeEach(() => {
    _clearCaches();
    vi.restoreAllMocks();
  });

  describe("resolveCharacterIds", () => {
    it("sends correct POST body and extracts character IDs", async () => {
      const fetchMock = mockFetchResponse({
        characters: [
          { id: 123, name: "Pilot One" },
          { id: 456, name: "Pilot Two" },
        ],
      });
      global.fetch = fetchMock;

      const result = await resolveCharacterIds(["Pilot One", "Pilot Two"]);

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain("/universe/ids/");
      expect(opts.method).toBe("POST");
      expect(JSON.parse(opts.body)).toEqual(["Pilot One", "Pilot Two"]);
      expect(result.get("Pilot One")).toBe(123);
      expect(result.get("Pilot Two")).toBe(456);
    });

    it("caches results and does not re-fetch", async () => {
      const fetchMock = mockFetchResponse({
        characters: [{ id: 123, name: "Cached Pilot" }],
      });
      global.fetch = fetchMock;

      await resolveCharacterIds(["Cached Pilot"]);
      const result = await resolveCharacterIds(["Cached Pilot"]);

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(result.get("Cached Pilot")).toBe(123);
    });

    it("returns empty map on empty input without fetching", async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      const result = await resolveCharacterIds([]);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.size).toBe(0);
    });

    it("throws on non-200 response", async () => {
      global.fetch = mockFetchResponse("Bad Request", 400);

      await expect(resolveCharacterIds(["Test"])).rejects.toThrow(
        /returned 400/
      );
    });
  });

  describe("fetchRecentKillmails", () => {
    it("constructs correct URL with rounded pastSeconds", async () => {
      const entries: ZKillEntry[] = [
        {
          killmail_id: 1,
          killmail_hash: "abc",
          zkb: { points: 10, totalValue: 1000 },
        },
      ];
      const fetchMock = mockFetchResponse(entries);
      global.fetch = fetchMock;

      const result = await fetchRecentKillmails(12345, 1.5);

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, opts] = fetchMock.mock.calls[0];
      // 1.5 hours = 5400 seconds, rounded up to 7200
      expect(url).toContain("/characterID/12345/pastSeconds/7200/");
      expect(opts.headers["User-Agent"]).toContain("EVE-Log-Parser");
      expect(result).toEqual(entries);
    });

    it("caps pastSeconds at 604800", async () => {
      global.fetch = mockFetchResponse([]);

      await fetchRecentKillmails(1, 200); // 200 hours = 720000s > 604800

      const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain("/pastSeconds/604800/");
    });

    it("throws on non-200 response", async () => {
      global.fetch = mockFetchResponse("Service Unavailable", 503);

      await expect(fetchRecentKillmails(1, 1)).rejects.toThrow(
        /returned 503/
      );
    });
  });

  describe("fetchKillmailDetail", () => {
    const sampleKillmail: ESIKillmail = {
      killmail_id: 99,
      killmail_time: "2026-03-12T10:00:00Z",
      solar_system_id: 30000142,
      victim: {
        character_id: 100,
        ship_type_id: 587,
        damage_taken: 5000,
      },
      attackers: [
        {
          character_id: 200,
          ship_type_id: 24690,
          weapon_type_id: 3170,
          damage_done: 5000,
          final_blow: true,
        },
      ],
    };

    it("constructs correct URL and returns killmail", async () => {
      const fetchMock = mockFetchResponse(sampleKillmail);
      global.fetch = fetchMock;

      const result = await fetchKillmailDetail(99, "hash123");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("/killmails/99/hash123/");
      expect(result.killmail_id).toBe(99);
    });

    it("caches and does not re-fetch", async () => {
      const fetchMock = mockFetchResponse(sampleKillmail);
      global.fetch = fetchMock;

      await fetchKillmailDetail(99, "hash123");
      const result = await fetchKillmailDetail(99, "hash123");

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(result.killmail_id).toBe(99);
    });

    it("throws on non-200 response", async () => {
      global.fetch = mockFetchResponse("Not Found", 404);

      await expect(fetchKillmailDetail(1, "bad")).rejects.toThrow(
        /returned 404/
      );
    });
  });

  describe("resolveKillmails", () => {
    it("fetches details and constructs ResolvedKillmail with zkillUrl", async () => {
      const entries: ZKillEntry[] = [
        {
          killmail_id: 42,
          killmail_hash: "abc123",
          zkb: { points: 15, totalValue: 50000 },
        },
      ];
      const esiDetail: ESIKillmail = {
        killmail_id: 42,
        killmail_time: "2026-03-12T12:00:00Z",
        solar_system_id: 30000142,
        victim: { ship_type_id: 587, damage_taken: 3000 },
        attackers: [
          {
            ship_type_id: 24690,
            weapon_type_id: 3170,
            damage_done: 3000,
            final_blow: true,
          },
        ],
      };
      global.fetch = mockFetchResponse(esiDetail);

      const result = await resolveKillmails(entries);

      expect(result).toHaveLength(1);
      expect(result[0].killmailId).toBe(42);
      expect(result[0].zkbPoints).toBe(15);
      expect(result[0].zkbValue).toBe(50000);
      expect(result[0].zkillUrl).toBe("https://zkillboard.com/kill/42/");
      expect(result[0].killmailTime).toBeInstanceOf(Date);
    });
  });
});
