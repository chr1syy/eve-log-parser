import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/killmails/route";

const BASE_TIME = "2026-03-12T18:00:00Z";
const CHARACTER_ID = 12345;
const CHARACTER_NAME = "Test Pilot";
const KILLMAIL_ID = 1001;
const KILLMAIL_HASH = "abc123def456";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/killmails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockFetchResponses() {
  const fetchMock = vi.fn();

  // ESI /universe/ids/ response
  const universeIdsResponse = {
    characters: [{ id: CHARACTER_ID, name: CHARACTER_NAME }],
  };

  // zKillboard response
  const zkillResponse = [
    {
      killmail_id: KILLMAIL_ID,
      killmail_hash: KILLMAIL_HASH,
      zkb: { points: 10, totalValue: 200000000 },
    },
  ];

  // ESI killmail detail response
  const esiKillmailResponse = {
    killmail_id: KILLMAIL_ID,
    killmail_time: BASE_TIME,
    solar_system_id: 30000142,
    victim: {
      character_id: 99999,
      corporation_id: 88888,
      ship_type_id: 645,
      damage_taken: 50000,
    },
    attackers: [
      {
        character_id: CHARACTER_ID,
        corporation_id: 77777,
        ship_type_id: 17726,
        weapon_type_id: 3170,
        damage_done: 25000,
        final_blow: true,
      },
    ],
  };

  fetchMock.mockImplementation((url: string) => {
    const urlStr = typeof url === "string" ? url : String(url);

    if (urlStr.includes("/universe/ids/")) {
      return Promise.resolve(
        new Response(JSON.stringify(universeIdsResponse), { status: 200 }),
      );
    }

    if (urlStr.includes("zkillboard.com")) {
      return Promise.resolve(
        new Response(JSON.stringify(zkillResponse), { status: 200 }),
      );
    }

    if (urlStr.includes("esi.evetech.net") && urlStr.includes("/killmails/")) {
      return Promise.resolve(
        new Response(JSON.stringify(esiKillmailResponse), { status: 200 }),
      );
    }

    return Promise.resolve(new Response("Not Found", { status: 404 }));
  });

  return fetchMock;
}

describe("POST /api/killmails", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Clear ESI client caches between tests
    vi.resetModules();
  });

  it("returns matched killmails with confidence scores for valid request", async () => {
    const fetchMock = mockFetchResponses();
    vi.stubGlobal("fetch", fetchMock);

    const req = makeRequest({
      characterName: CHARACTER_NAME,
      candidates: [
        {
          timestamp: BASE_TIME,
          target: "Typhoon",
        },
      ],
      sessionStart: BASE_TIME,
      sessionEnd: BASE_TIME,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.matches).toBeDefined();
    expect(data.matches.length).toBeGreaterThan(0);

    const match = data.matches[0];
    expect(match.candidateIndex).toBe(0);
    expect(match.killmail.killmailId).toBe(KILLMAIL_ID);
    expect(new Date(match.killmail.killmailTime).toISOString()).toBe(new Date(BASE_TIME).toISOString());
    expect(match.confidence).toBe("high");
    expect(match.score).toBeGreaterThan(0);
    expect(match.matchReasons).toBeInstanceOf(Array);
  });

  it("returns 400 when candidates array is empty", async () => {
    const req = makeRequest({
      characterName: CHARACTER_NAME,
      candidates: [],
      sessionStart: BASE_TIME,
      sessionEnd: BASE_TIME,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("candidates");
  });

  it("returns 400 when candidates is missing", async () => {
    const req = makeRequest({
      characterName: CHARACTER_NAME,
      sessionStart: BASE_TIME,
      sessionEnd: BASE_TIME,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when character name cannot be resolved", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const urlStr = typeof url === "string" ? url : String(url);
      if (urlStr.includes("/universe/ids/")) {
        // ESI returns empty when no characters found
        return Promise.resolve(
          new Response(JSON.stringify({}), { status: 200 }),
        );
      }
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const req = makeRequest({
      characterName: "Nonexistent Character",
      candidates: [{ timestamp: BASE_TIME }],
      sessionStart: BASE_TIME,
      sessionEnd: BASE_TIME,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain("Could not resolve character");
  });

  it("returns 400 when characterName is missing", async () => {
    const req = makeRequest({
      candidates: [{ timestamp: BASE_TIME }],
      sessionStart: BASE_TIME,
      sessionEnd: BASE_TIME,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("characterName");
  });

  it("skips character resolution when characterId is provided", async () => {
    const fetchMock = mockFetchResponses();
    vi.stubGlobal("fetch", fetchMock);

    const req = makeRequest({
      characterName: CHARACTER_NAME,
      characterId: CHARACTER_ID,
      candidates: [{ timestamp: BASE_TIME, target: "Typhoon" }],
      sessionStart: BASE_TIME,
      sessionEnd: BASE_TIME,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.matches).toBeDefined();

    // Should not have called universe/ids since characterId was provided
    const universeIdsCalls = fetchMock.mock.calls.filter(
      (call: [string]) => typeof call[0] === "string" && call[0].includes("/universe/ids/"),
    );
    expect(universeIdsCalls).toHaveLength(0);
  });
});
