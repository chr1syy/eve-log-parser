import { HitQuality, LogEntry, ParsedLog, WeaponSystemType } from "@/lib/types";
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

import { isDroneWeapon as isDroneFromConfig } from "@/lib/config/drones";

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
    .replace(/<a[^>]*>/gi, "")
    .replace(/<\/a>/gi, "")
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

function isDroneWeapon(weapon?: string): boolean {
  return isDroneFromConfig(weapon);
}

/**
 * Classify a weapon/system name into a WeaponSystemType.
 * Uses simple case-insensitive substring matching against keyword lists.
 */
export function classifyWeaponSystem(name: string): WeaponSystemType {
  if (!name || typeof name !== "string") return WeaponSystemType.UNKNOWN;
  const s = name.toLowerCase();

  const turretKeywords = [
    "artillery",
    "autocannon",
    "gatling",
    "rotary",
    "laser",
    "beam",
    "pulse",
    "railgun",
    "blaster",
  ];

  const missileKeywords = [
    "missile",
    "rocket",
    "torpedo",
    "cruise",
    "javelin",
    "fury",
    "torrent",
    "nov(a)",
  ];

  const droneKeywords = [
    "drone",
    "infiltrator",
    "wasp",
    "hobgoblin",
    "hornet",
    "hobs",
    "praetor",
    "gecko",
  ];

  for (const k of turretKeywords)
    if (s.includes(k)) return WeaponSystemType.TURRET;
  for (const k of missileKeywords)
    if (s.includes(k)) return WeaponSystemType.MISSILE;
  for (const k of droneKeywords)
    if (s.includes(k)) return WeaponSystemType.DRONE;

  // Fallback: if config thinks it's a drone, classify as DRONE
  if (isDroneWeapon(name)) return WeaponSystemType.DRONE;

  return WeaponSystemType.UNKNOWN;
}

// Attach weapon system classification when a weapon string is present in parsed entries.
// Note: exported above already via function declaration; classifyWeaponSystem is exported by module index.

function normalizeHitQuality(raw: string): HitQuality {
  const normalized = raw.trim().toLowerCase();
  const mapping: Record<string, HitQuality> = {
    wrecks: "Wrecks",
    smashes: "Smashes",
    penetrates: "Penetrates",
    hits: "Hits",
    "glances off": "Glances Off",
    grazes: "Grazes",
    misses: "misses",
  };
  return mapping[normalized] ?? "unknown";
}

/**
 * Returns a numeric damage multiplier for a given hit quality/outcome.
 * Unknown or unrecognized outcomes return 0.0.
 */
export function multiplierForOutcome(outcome: string): number {
  if (!outcome) return 0.0;
  const key = outcome.trim().toLowerCase();
  switch (key) {
    case "wreck":
    case "wrecks":
      return 3.0;
    case "smash":
    case "smashes":
      return 1.37;
    case "penetrate":
    case "penetrates":
      return 1.125;
    case "hit":
    case "hits":
      return 0.875;
    case "glances off":
      return 0.625;
    case "graze":
    case "grazes":
      return 0.5625;
    case "miss":
    case "misses":
      return 0.0;
    default:
      return 0.0;
  }
}

function parseRepLine(clean: string, raw: string): Partial<LogEntry> | null {
  if (!/armor repaired/i.test(clean)) return null;

  const repShipTypeFromU = extractUnderlinkText(raw);
  const repShipTypeFromText = clean
    .match(/\sfrom\s+([^\-]+?)(?:\s+-|$)/i)?.[1]
    ?.trim();
  const repShipType = repShipTypeFromU ?? repShipTypeFromText;

  const isRepBot =
    repShipType?.toLowerCase().includes("maintenance bot") ||
    repShipType?.toLowerCase().includes("repair drone") ||
    false;

  const amountMatch = clean.match(/^(\d+)\s+/);
  const amount = amountMatch ? parseInt(amountMatch[1], 10) : undefined;

  const moduleFromTail = clean.match(/\s+-\s+(.+?)\s+-\s+repaired by$/i)?.[1];
  const moduleFromRemoteBy = clean.match(
    /^\d+\s+remote armor repaired by\s+.+\s+-\s+(.+)$/i,
  )?.[1];
  const moduleFromRemoteTo = clean.match(
    /^\d+\s+remote armor repaired to\s+.+\s+-\s+(.+)$/i,
  )?.[1];

  const repModule =
    moduleFromTail?.trim() ||
    moduleFromRemoteBy?.trim() ||
    moduleFromRemoteTo?.trim();

  if (clean.includes("repaired by")) {
    return {
      eventType: "rep-received",
      direction: "incoming",
      amount,
      repShipType: repShipType ?? undefined,
      repModule,
      isRepBot,
    };
  }

  if (clean.includes("repaired to")) {
    return {
      eventType: "rep-outgoing",
      direction: "outgoing",
      amount,
      repShipType: repShipType ?? undefined,
      repModule,
      isRepBot,
    };
  }

  return null;
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

    const repParsed = parseRepLine(clean, raw);
    if (repParsed) {
      Object.assign(base, repParsed);
      return base;
    }

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
          base.damageMultiplier = multiplierForOutcome(base.hitQuality ?? "");
          const ws = classifyWeaponSystem(base.weapon);
          if (ws !== WeaponSystemType.UNKNOWN) base.weaponSystemType = ws;
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
          base.damageMultiplier = multiplierForOutcome(base.hitQuality ?? "");
          const ws = classifyWeaponSystem(base.weapon);
          if (ws !== WeaponSystemType.UNKNOWN) base.weaponSystemType = ws;
          break;
        }

        // Alternate form: amount from PilotName - weapon - hitQuality
        const fromMatch = clean.match(
          /^(\d+)\s+from\s+(.+?)\s+-\s+(.+?)\s+-\s+(.+)$/,
        );
        if (fromMatch) {
          const [, amount, pilotName, weapon, hitQualityRaw] = fromMatch;
          base.amount = parseInt(amount, 10);
          base.pilotName = pilotName.trim();
          base.weapon = weapon.trim();
          base.hitQuality = normalizeHitQuality(hitQualityRaw);
          base.isNpc = false;
          base.isDrone = isDroneWeapon(base.weapon);
          base.damageMultiplier = multiplierForOutcome(base.hitQuality ?? "");
          const ws = classifyWeaponSystem(base.weapon);
          if (ws !== WeaponSystemType.UNKNOWN) base.weaponSystemType = ws;
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
          base.damageMultiplier = multiplierForOutcome(base.hitQuality ?? "");
          const ws = classifyWeaponSystem(base.weapon);
          if (ws !== WeaponSystemType.UNKNOWN) base.weaponSystemType = ws;
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
          base.damageMultiplier = multiplierForOutcome(base.hitQuality ?? "");
          const ws = classifyWeaponSystem(base.weapon);
          if (ws !== WeaponSystemType.UNKNOWN) base.weaponSystemType = ws;
          break;
        }

        // NPC no weapon: amount from EntityName - hitQuality
        // EntityName may itself be a drone (e.g. "Hobgoblin II")
        const npcNoWeapon = clean.match(/^(\d+)\s+from\s+(.+?)\s+-\s+(.+)$/);
        if (npcNoWeapon) {
          const [, amount, shipType, hitQualityRaw] = npcNoWeapon;
          base.amount = parseInt(amount, 10);
          base.shipType = shipType.trim();
          base.hitQuality = normalizeHitQuality(hitQualityRaw);
          base.isNpc = true;
          base.isDrone = isDroneWeapon(base.shipType);
          base.damageMultiplier = multiplierForOutcome(base.hitQuality ?? "");
          // No weapon string to classify here; weaponSystemType stays unset
          break;
        }

        // Alternate form: amount to Target - from Attacker - weapon - hitQuality
        const toFromMatch = clean.match(
          /^(\d+)\s+to\s+(.+?)\s+-\s+from\s+(.+?)\s+-\s+(.+?)\s+-\s+(.+)$/,
        );
        if (toFromMatch) {
          const [, amount, , attacker, weapon, hitQualityRaw] = toFromMatch;
          base.amount = parseInt(amount, 10);
          base.pilotName = attacker.trim();
          base.weapon = weapon.trim();
          base.hitQuality = normalizeHitQuality(hitQualityRaw);
          base.isNpc = false;
          base.isDrone = base.weapon ? isDroneWeapon(base.weapon) : false;
          base.damageMultiplier = multiplierForOutcome(base.hitQuality ?? "");
          const ws = classifyWeaponSystem(base.weapon);
          if (ws !== WeaponSystemType.UNKNOWN) base.weaponSystemType = ws;
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
            /^(-?[\d.]+)\s+GJ\s+energy drained to\s+(.+?)(?:\s+-\s+from\s+(.+?))?\s+-\s+(.+?)(?:\s+-\s+energy drained)?$/,
          );
          if (m) {
            base.capAmount = Math.abs(parseFloat(m[1]));
            base.capShipType =
              extractUnderlinkText(raw) ?? (m[3] ?? m[2]).trim();
            base.capModule = m[4].trim();
            base.pilotName = m[3]?.trim();
          }
        } else if (clean.includes("energy neutralized")) {
          base.eventType = "neut-received";
          base.capEventType = "neut-received";
          base.direction = "incoming";
          const detailed = clean.match(
            /^([\d.]+)\s+GJ\s+energy neutralized to\s+.+?\s+-\s+from\s+(.+?)\s+-\s+(.+?)\s+-\s+energy drained$/,
          );
          if (detailed) {
            base.capAmount = parseFloat(detailed[1]);
            base.capShipType = detailed[2].trim();
            base.capModule = detailed[3].trim();
            base.pilotName = detailed[2].trim();
            break;
          }
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
        const drainedMatch = clean.match(
          /^([\d.]+)\s+GJ\s+energy drained from\s+(.+?)\s+-\s+(.+?)\s+-\s+energy drained$/,
        );
        if (drainedMatch) {
          base.capAmount = parseFloat(drainedMatch[1]);
          base.capShipType = drainedMatch[2].trim();
          base.capModule = drainedMatch[3].trim();
          base.pilotName = drainedMatch[2].trim();
          break;
        }
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
          /^Your (?:group of )?(.+?) misses (.+?) completely(?:\s+-\s+(.+))?$/,
        );
        if (outgoingMiss) {
          base.eventType = "miss-outgoing";
          base.weapon = outgoingMiss[1].trim();
          base.shipType = outgoingMiss[2].trim(); // target name/ship
          base.isDrone = isDroneWeapon(base.weapon);
          const ws = classifyWeaponSystem(base.weapon);
          if (ws !== WeaponSystemType.UNKNOWN) base.weaponSystemType = ws;
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
          const ws = classifyWeaponSystem(base.weapon);
          if (ws !== WeaponSystemType.UNKNOWN) base.weaponSystemType = ws;
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
          if (base.weapon) {
            const ws = classifyWeaponSystem(base.weapon);
            if (ws !== WeaponSystemType.UNKNOWN) base.weaponSystemType = ws;
          }
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
type LogFileInput =
  | File
  | Blob
  | {
      text?: () => Promise<string>;
      arrayBuffer?: () => Promise<ArrayBuffer>;
      stream?: () => unknown;
      name?: string;
    }
  | ArrayBuffer
  | Uint8Array
  | string;

function decodeBytes(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

async function readStreamToBytes(stream: unknown): Promise<Uint8Array | null> {
  if (!stream) return null;

  if (typeof (stream as ReadableStream).getReader === "function") {
    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.length;
      }
    }
    const combined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return combined;
  }

  if (typeof (stream as NodeJS.ReadableStream).on === "function") {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return chunks.length > 0 ? new Uint8Array(Buffer.concat(chunks)) : null;
  }

  return null;
}

async function readLogText(file: LogFileInput): Promise<string> {
  if (typeof file === "string") return file;
  if (file instanceof ArrayBuffer) return decodeBytes(new Uint8Array(file));
  if (file instanceof Uint8Array) return decodeBytes(file);
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(file)) {
    return decodeBytes(new Uint8Array(file));
  }
  if (typeof file.text === "function") return file.text();
  if (typeof file.arrayBuffer === "function") {
    const buffer = await file.arrayBuffer();
    return decodeBytes(new Uint8Array(buffer));
  }
  if (typeof file.stream === "function") {
    const bytes = await readStreamToBytes(file.stream());
    if (bytes) return decodeBytes(bytes);
  }
  if (typeof process !== "undefined" && process.versions?.node) {
    const maybePath =
      typeof (file as { path?: string }).path === "string"
        ? (file as { path: string }).path
        : typeof (file as { name?: string }).name === "string"
          ? (file as { name: string }).name
          : undefined;
    if (maybePath) {
      try {
        const [{ readFile }, { isAbsolute, resolve }] = await Promise.all([
          import("node:fs/promises"),
          import("node:path"),
        ]);
        const resolved = isAbsolute(maybePath)
          ? maybePath
          : resolve(process.cwd(), maybePath);
        const buffer = await readFile(resolved);
        return decodeBytes(new Uint8Array(buffer));
      } catch {
        // fall through
      }
    }
  }
  if (typeof (file as { slice?: () => unknown }).slice === "function") {
    const sliced = (
      file as { slice: (start?: number, end?: number) => unknown }
    ).slice(
      0,
      typeof (file as { size?: number }).size === "number"
        ? (file as { size: number }).size
        : undefined,
    );
    if (
      sliced &&
      typeof (sliced as { text?: () => Promise<string> }).text === "function"
    ) {
      return (sliced as { text: () => Promise<string> }).text();
    }
    if (
      sliced &&
      typeof (sliced as { arrayBuffer?: () => Promise<ArrayBuffer> })
        .arrayBuffer === "function"
    ) {
      const buffer = await (
        sliced as {
          arrayBuffer: () => Promise<ArrayBuffer>;
        }
      ).arrayBuffer();
      return decodeBytes(new Uint8Array(buffer));
    }
    if (typeof Response !== "undefined") {
      try {
        const response = new Response(sliced as BodyInit);
        return await response.text();
      } catch {
        // fall through
      }
    }
  }
  if (typeof Response !== "undefined") {
    try {
      const response = new Response(file as BodyInit);
      return await response.text();
    } catch {
      // fall through
    }
  }
  throw new TypeError(
    "Unsupported log input: missing text() or arrayBuffer().",
  );
}

function getLogFileName(file: LogFileInput): string {
  if (typeof file === "string") return "inline-log";
  if (typeof file === "object" && file && "name" in file) {
    const name = file.name;
    if (typeof name === "string" && name.trim()) return name;
  }
  return "unknown-log";
}

export async function parseLogFile(file: LogFileInput): Promise<ParsedLog> {
  const text = await readLogText(file);
  const lines = text.split(/\r\n|\n|\r/);

  const sessionId = await hashContent(text);
  let characterName: string | undefined;
  let sessionStart: Date | undefined;
  const entries: LogEntry[] = [];

  const TIMESTAMP_LINE_RE =
    /^\[\s*(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})\s*\]\s+\(([^)]+)\)\s*(.*)$/;

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
      const raw = sessionStartMatch[1]
        .trim()
        .replace(/^\[/, "")
        .replace(/\]$/, "");
      // EVE datetime: YYYY.MM.DD HH:MM:SS → replace dots in date part
      sessionStart = new Date(
        raw.replace(/^(\d{4})\.(\d{2})\.(\d{2})/, "$1-$2-$3"),
      );
      continue;
    }

    const tsLineMatch = trimmed.match(TIMESTAMP_LINE_RE);
    if (!tsLineMatch) continue;

    const rawDateStr = tsLineMatch[1].replace(
      /^(\d{4})\.(\d{2})\.(\d{2})/,
      "$1-$2-$3",
    );
    const timestamp = new Date(rawDateStr);
    const channelRaw = tsLineMatch[2]?.trim() ?? "";
    const channel = channelRaw.toLowerCase();
    const content = tsLineMatch[3] ?? "";
    const id = `${sessionId}-${entries.length}`;

    // Keep noisy interaction prompts out of parsed timelines.
    if (channel === "hint" || channel === "question") continue;

    if (channel !== "combat") {
      entries.push({
        id,
        timestamp,
        rawLine: `(${channelRaw}) ${content}`.trim(),
        eventType: "other",
      });
      continue;
    }

    try {
      const entry = parseCombatLine(content, timestamp, id);
      entries.push(entry);
    } catch (err) {
      console.warn("[parseLogFile] Skipping malformed line:", trimmed, err);
      entries.push({
        id,
        timestamp,
        rawLine: content,
        eventType: "other",
      });
    }
  }

  const sessionEnd =
    entries.length > 0 ? entries[entries.length - 1].timestamp : undefined;
  const stats = computeStats(entries);

  return {
    sessionId,
    fileName: getLogFileName(file),
    parsedAt: new Date(),
    characterName,
    sessionStart,
    sessionEnd,
    entries,
    stats,
  };
}
