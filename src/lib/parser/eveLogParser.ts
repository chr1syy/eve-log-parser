import { EventType, HitQuality, LogEntry, ParsedLog } from "@/lib/types";
import { computeStats } from "./computeStats";

/**
 * Generates a UUID v4, using crypto.randomUUID() if available,
 * otherwise falling back to a custom implementation.
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Produces a deterministic UUID v4-compatible string by SHA-256 hashing
 * the provided text. Same content always yields the same UUID, enabling
 * deduplication when the same file is uploaded more than once.
 * Falls back to generateUUID() if crypto.subtle is unavailable.
 */
async function hashContent(text: string): Promise<string> {
  try {
    const encoded = new TextEncoder().encode(text);
    const buffer = await crypto.subtle.digest("SHA-256", encoded);
    const bytes = new Uint8Array(buffer);
    const h = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""); // 64 hex chars
    // Format as UUID v4-like: 8-4-4-4-12
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
  } catch {
    return generateUUID();
  }
}

const DRONE_PATTERN =
  /\b(Wasp|Infiltrator|Hornet|Hammerhead|Ogre|Valkyrie|Warrior|Curator|Garde|Warden|Bouncer|Berserker|Acolyte|Praetor|Gecko)\b/i;

/**
 * Strips all EVE HTML markup tags from a line, collapsing extra whitespace.
 */
export function stripTags(raw: string): string {
  return raw
    .replace(/<color=[^>]*>/gi, "")
    .replace(/<\/color>/gi, "")
    .replace(/<b>/gi, "")
    .replace(/<\/b>/gi, "")
    .replace(/<font[^>]*>/gi, "")
    .replace(/<\/font>/gi, "")
    .replace(/<fontsize=[^>]*>/gi, "")
    .replace(/<\/fontsize>/gi, "")
    .replace(/<u>/gi, "")
    .replace(/<\/u>/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Extracts the first 0x... hex value from a <color=...> tag in the raw line.
 */
export function extractFirstColor(raw: string): string | null {
  const match = raw.match(/<color=(0x[0-9a-fA-F]+)>/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Returns the text between the first <u> and </u> tags, stripped of nested markup.
 */
export function extractUnderlinkText(raw: string): string | null {
  const match = raw.match(/<u>([\s\S]*?)<\/u>/i);
  if (!match) return null;
  return stripTags(match[1]).trim() || null;
}

function isDroneWeapon(weapon: string): boolean {
  return DRONE_PATTERN.test(weapon);
}

function normalizeHitQuality(raw: string): HitQuality {
  const known: HitQuality[] = [
    "Wrecks",
    "Smashes",
    "Penetrates",
    "Hits",
    "Glances Off",
    "Grazes",
    "misses",
  ];
  const trimmed = raw.trim();
  for (const q of known) {
    if (trimmed === q) return q;
  }
  return "unknown";
}

/**
 * Parses a single (combat) line (stripped of the timestamp prefix) into a LogEntry.
 */
export function parseCombatLine(
  raw: string,
  timestamp: Date,
  id: string,
): LogEntry {
  const base: LogEntry = {
    id,
    timestamp,
    rawLine: raw,
    eventType: "other",
  };

  try {
    const firstColor = extractFirstColor(raw);
    const clean = stripTags(raw);

    switch (firstColor) {
      case "0xff00ffff": {
        // Damage dealt
        base.eventType = "damage-dealt";

        // Player form: amount to PilotName[CORP](Ship) - weapon - hitQuality
        const playerMatch = clean.match(
          /^(\d+)\s+to\s+(.+?)\[(.+?)\]\((.+?)\)\s+-\s+(.+?)\s+-\s+(.+)$/,
        );
        if (playerMatch) {
          const [
            ,
            amount,
            pilotName,
            corpTicker,
            shipType,
            weapon,
            hitQualityRaw,
          ] = playerMatch;
          base.amount = parseInt(amount, 10);
          base.pilotName = pilotName.trim();
          base.corpTicker = corpTicker.trim();
          base.shipType = shipType.trim();
          base.weapon = weapon.trim();
          base.hitQuality = normalizeHitQuality(hitQualityRaw);
          base.isNpc = false;
          base.isDrone = isDroneWeapon(base.weapon);
          break;
        }

        // NPC/no-corp form: amount to EntityName - weapon - hitQuality
        const npcMatch = clean.match(
          /^(\d+)\s+to\s+(.+?)\s+-\s+(.+?)\s+-\s+(.+)$/,
        );
        if (npcMatch) {
          const [, amount, shipType, weapon, hitQualityRaw] = npcMatch;
          base.amount = parseInt(amount, 10);
          base.shipType = shipType.trim();
          base.weapon = weapon.trim();
          base.hitQuality = normalizeHitQuality(hitQualityRaw);
          base.isNpc = true;
          base.isDrone = isDroneWeapon(base.weapon);
        }
        break;
      }

      case "0xffcc0000": {
        // Damage received
        base.eventType = "damage-received";

        // Player form: amount from PilotName[CORP](Ship) - weapon - hitQuality
        const playerMatch = clean.match(
          /^(\d+)\s+from\s+(.+?)\[(.+?)\]\((.+?)\)\s+-\s+(.+?)\s+-\s+(.+)$/,
        );
        if (playerMatch) {
          const [
            ,
            amount,
            pilotName,
            corpTicker,
            shipType,
            weapon,
            hitQualityRaw,
          ] = playerMatch;
          base.amount = parseInt(amount, 10);
          base.pilotName = pilotName.trim();
          base.corpTicker = corpTicker.trim();
          base.shipType = shipType.trim();
          base.weapon = weapon.trim();
          base.hitQuality = normalizeHitQuality(hitQualityRaw);
          base.isNpc = false;
          base.isDrone = isDroneWeapon(base.weapon);
          break;
        }

        // NPC with weapon: amount from EntityName - weapon - hitQuality
        const npcWithWeapon = clean.match(
          /^(\d+)\s+from\s+(.+?)\s+-\s+(.+?)\s+-\s+(.+)$/,
        );
        if (npcWithWeapon) {
          const [, amount, shipType, weapon, hitQualityRaw] = npcWithWeapon;
          base.amount = parseInt(amount, 10);
          base.shipType = shipType.trim();
          base.weapon = weapon.trim();
          base.hitQuality = normalizeHitQuality(hitQualityRaw);
          base.isNpc = true;
          base.isDrone = isDroneWeapon(base.weapon);
          break;
        }

        // NPC no weapon: amount from EntityName - hitQuality
        const npcNoWeapon = clean.match(/^(\d+)\s+from\s+(.+?)\s+-\s+(.+)$/);
        if (npcNoWeapon) {
          const [, amount, shipType, hitQualityRaw] = npcNoWeapon;
          base.amount = parseInt(amount, 10);
          base.shipType = shipType.trim();
          base.hitQuality = normalizeHitQuality(hitQualityRaw);
          base.isNpc = true;
        }
        break;
      }

      case "0xffccff66": {
        // Rep event
        const repShipType = extractUnderlinkText(raw);
        base.repShipType = repShipType ?? undefined;
        base.isRepBot =
          repShipType?.toLowerCase().includes("maintenance bot") ||
          repShipType?.toLowerCase().includes("repair drone") ||
          false;

        if (clean.includes("repaired by") || clean.includes("boosted by")) {
          base.eventType = "rep-received";
          base.direction = "incoming";
          const m = clean.match(
            /^(\d+)\s+remote (?:armor repaired|shield boosted) by\s+.+\s+-\s+(.+)$/,
          );
          if (m) {
            base.amount = parseInt(m[1], 10);
            base.repModule = m[2].trim();
          }
        } else if (
          clean.includes("repaired to") ||
          clean.includes("boosted to")
        ) {
          base.eventType = "rep-outgoing";
          base.direction = "outgoing";
          const m = clean.match(
            /^(\d+)\s+remote (?:armor repaired|shield boosted) to\s+.+\s+-\s+(.+)$/,
          );
          if (m) {
            base.amount = parseInt(m[1], 10);
            base.repModule = m[2].trim();
          }
        }
        break;
      }

      case "0xffe57f7f": {
        // Neut received OR nos dealt (same color — distinguished by text)
        if (clean.includes("energy drained to")) {
          base.eventType = "nos-dealt";
          base.capEventType = "nos-dealt";
          base.direction = "outgoing";
          const m = clean.match(
            /^(-?[\d.]+)\s+GJ\s+energy drained to\s+.+\s+-\s+(.+)$/,
          );
          if (m) {
            base.capAmount = Math.abs(parseFloat(m[1]));
            base.capShipType = extractUnderlinkText(raw) ?? undefined;
            base.capModule = m[2].trim();
          }
        } else if (clean.includes("energy neutralized")) {
          base.eventType = "neut-received";
          base.capEventType = "neut-received";
          base.direction = "incoming";
          const m = clean.match(
            /^([\d.]+)\s+GJ\s+energy neutralized\s+.+\s+-\s+(.+)$/,
          );
          if (m) {
            base.capAmount = parseFloat(m[1]);
            base.capShipType = extractUnderlinkText(raw) ?? undefined;
            base.capModule = m[2].trim();
          }
        }
        break;
      }

      case "0xff7fffff": {
        // Neut dealt
        base.eventType = "neut-dealt";
        base.capEventType = "neut-dealt";
        base.direction = "outgoing";
        const m = clean.match(
          /^([\d.]+)\s+GJ\s+energy neutralized\s+.+\s+-\s+(.+)$/,
        );
        if (m) {
          base.capAmount = parseFloat(m[1]);
          base.capShipType = extractUnderlinkText(raw) ?? undefined;
          base.capModule = m[2].trim();
        }
        break;
      }

      case "0xffffffff": {
        const isScram =
          clean.includes("Warp scram") || clean.includes("Warp disrupt");
        if (!isScram) {
          base.eventType = "other";
          break;
        }
        base.eventType = "warp-scram";

        // Extract all <u>...</u> targets from the raw line
        const uMatches = [...raw.matchAll(/<u>([\s\S]*?)<\/u>/gi)].map((m) =>
          stripTags(m[1]).trim(),
        );

        // Detect direction by checking if "you" is the source
        const fromYou = /from\s+(?:<[^>]+>)*you(?:<[^>]+>)*\s+to/i.test(raw);
        const toYou =
          /to\s+(?:<[^>]+>)*you[!]?(?:<[^>]+>)*\s*$/i.test(raw) ||
          clean.toLowerCase().includes("to you");

        if (fromYou) {
          base.tackleDirection = "outgoing";
          base.tackleTarget = uMatches[0];
        } else if (toYou) {
          base.tackleDirection = "incoming";
          base.tackleSource = uMatches[0];
        } else {
          // Observed scram (neither side is the listener)
          base.tackleDirection = "incoming";
          base.tackleSource = uMatches[0];
          base.tackleTarget = uMatches[1];
        }
        break;
      }

      case null: {
        // Outgoing miss: "Your WeaponName misses TargetName completely - WeaponName"
        const outgoingMiss = clean.match(
          /^Your (.+?) misses (.+?) completely(?:\s+-\s+(.+))?$/,
        );
        if (outgoingMiss) {
          base.eventType = "miss-outgoing";
          base.weapon = outgoingMiss[1].trim();
          base.shipType = outgoingMiss[2].trim(); // target name/ship
          base.isDrone = isDroneWeapon(base.weapon);
          break;
        }

        // Incoming drone miss: "DroneName belonging to PilotName misses you completely - DroneName"
        const droneMiss = clean.match(
          /^(.+?) belonging to (.+?) misses you completely(?:\s+-\s+(.+))?$/,
        );
        if (droneMiss) {
          base.eventType = "miss-incoming";
          base.weapon = droneMiss[1].trim(); // drone type
          base.pilotName = droneMiss[2].trim(); // owner pilot
          base.isDrone = true;
          break;
        }

        // Incoming player/NPC miss: "PilotName misses you completely - WeaponName"
        const incomingMiss = clean.match(
          /^(.+?) misses you completely(?:\s+-\s+(.+))?$/,
        );
        if (incomingMiss) {
          base.eventType = "miss-incoming";
          base.pilotName = incomingMiss[1].trim();
          base.weapon = incomingMiss[2]?.trim();
          base.isDrone = base.weapon ? isDroneWeapon(base.weapon) : false;
          break;
        }

        base.eventType = "other";
        break;
      }

      default:
        base.eventType = "other";
    }
  } catch (err) {
    console.warn("[eveLogParser] Failed to parse line:", raw, err);
    base.eventType = "other";
  }

  return base;
}

/**
 * Parses an EVE combat log File into a structured ParsedLog.
 */
export async function parseLogFile(file: File): Promise<ParsedLog> {
  const text = await file.text();
  const lines = text.split(/\r?\n/);

  const sessionId = await hashContent(text);
  let characterName: string | undefined;
  let sessionStart: Date | undefined;
  const entries: LogEntry[] = [];

  const TIMESTAMP_RE = /\[ (\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}) \]/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Parse header fields
    const listenerMatch = trimmed.match(/^Listener:\s+(.+)$/);
    if (listenerMatch) {
      characterName = listenerMatch[1].trim();
      continue;
    }

    const sessionStartMatch = trimmed.match(/^Session Started:\s+(.+)$/);
    if (sessionStartMatch) {
      const raw = sessionStartMatch[1].trim();
      // EVE datetime: YYYY.MM.DD HH:MM:SS → replace dots in date part
      sessionStart = new Date(
        raw.replace(/^(\d{4})\.(\d{2})\.(\d{2})/, "$1-$2-$3"),
      );
      continue;
    }

    // Skip non-combat lines
    if (
      trimmed.includes("(hint)") ||
      trimmed.includes("(notify)") ||
      trimmed.includes("(question)") ||
      trimmed.includes("(None)")
    ) {
      continue;
    }

    // Only process combat lines
    if (!trimmed.includes("(combat)")) continue;

    const tsMatch = trimmed.match(TIMESTAMP_RE);
    if (!tsMatch) continue;

    const rawDateStr = tsMatch[1].replace(
      /^(\d{4})\.(\d{2})\.(\d{2})/,
      "$1-$2-$3",
    );
    const timestamp = new Date(rawDateStr);

    // Extract the content after "(combat) "
    const combatContentMatch = trimmed.match(/\(combat\)\s+(.+)$/);
    if (!combatContentMatch) continue;

    const combatContent = combatContentMatch[1];
    const id = `${sessionId}-${entries.length}`;

    try {
      const entry = parseCombatLine(combatContent, timestamp, id);
      entries.push(entry);
    } catch (err) {
      console.warn("[parseLogFile] Skipping malformed line:", trimmed, err);
      entries.push({
        id,
        timestamp,
        rawLine: combatContent,
        eventType: "other",
      });
    }
  }

  const sessionEnd =
    entries.length > 0 ? entries[entries.length - 1].timestamp : undefined;
  const stats = computeStats(entries);

  return {
    sessionId,
    fileName: file.name,
    parsedAt: new Date(),
    characterName,
    sessionStart,
    sessionEnd,
    entries,
    stats,
  };
}
