import type { ZKillEntry, ESIKillmail, ResolvedKillmail } from "./types";

const ESI_BASE = "https://esi.evetech.net/latest";
const ZKILL_BASE = "https://zkillboard.com/api";
const USER_AGENT =
  "EVE-Log-Parser/1.0 (https://github.com/chr1syy/eve-log-parser)";

const MAX_NAMES_PER_REQUEST = 500;
const MAX_PAST_SECONDS = 604800;

// Module-level caches
const characterIdCache = new Map<string, number>();
const killmailCache = new Map<number, ESIKillmail>();

export async function resolveCharacterIds(
  names: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (names.length === 0) return result;

  const uncached: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    const cached = characterIdCache.get(key);
    if (cached !== undefined) {
      result.set(name, cached);
    } else {
      uncached.push(name);
    }
  }

  // Batch uncached names in groups of 500
  for (let i = 0; i < uncached.length; i += MAX_NAMES_PER_REQUEST) {
    const batch = uncached.slice(i, i + MAX_NAMES_PER_REQUEST);
    const res = await fetch(
      `${ESI_BASE}/universe/ids/?datasource=tranquility`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      }
    );
    if (!res.ok) {
      throw new Error(
        `ESI /universe/ids/ returned ${res.status}: ${await res.text()}`
      );
    }
    const data: { characters?: { id: number; name: string }[] } =
      await res.json();
    for (const char of data.characters ?? []) {
      characterIdCache.set(char.name.toLowerCase(), char.id);
      result.set(char.name, char.id);
    }
  }

  return result;
}

export async function fetchRecentKillmails(
  characterId: number,
  windowHours: number
): Promise<ZKillEntry[]> {
  const rawSeconds = windowHours * 3600;
  const pastSeconds = Math.min(
    Math.ceil(rawSeconds / 3600) * 3600,
    MAX_PAST_SECONDS
  );

  const url = `${ZKILL_BASE}/kills/characterID/${characterId}/pastSeconds/${pastSeconds}/`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Encoding": "gzip",
    },
  });
  if (!res.ok) {
    throw new Error(
      `zKillboard returned ${res.status}: ${await res.text()}`
    );
  }
  return res.json();
}

export async function fetchKillmailDetail(
  killmailId: number,
  hash: string
): Promise<ESIKillmail> {
  const cached = killmailCache.get(killmailId);
  if (cached) return cached;

  const url = `${ESI_BASE}/killmails/${killmailId}/${hash}/?datasource=tranquility`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `ESI /killmails/ returned ${res.status}: ${await res.text()}`
    );
  }
  const data: ESIKillmail = await res.json();
  killmailCache.set(killmailId, data);
  return data;
}

export async function resolveKillmails(
  zkillEntries: ZKillEntry[]
): Promise<ResolvedKillmail[]> {
  const results: ResolvedKillmail[] = [];
  for (const entry of zkillEntries) {
    const detail = await fetchKillmailDetail(
      entry.killmail_id,
      entry.killmail_hash
    );
    results.push({
      killmailId: entry.killmail_id,
      killmailHash: entry.killmail_hash,
      killmailTime: new Date(detail.killmail_time),
      victim: detail.victim,
      attackers: detail.attackers,
      zkbPoints: entry.zkb.points,
      zkbValue: entry.zkb.totalValue,
      zkillUrl: `https://zkillboard.com/kill/${entry.killmail_id}/`,
    });
  }
  return results;
}

// Exported for testing — allows clearing caches between tests
export function _clearCaches(): void {
  characterIdCache.clear();
  killmailCache.clear();
}
