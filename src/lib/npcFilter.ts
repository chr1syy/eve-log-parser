import type { LogEntry } from "./types";

/**
 * Known NPC faction/type prefixes that identify hostile NPCs
 * Format: "Faction Name + NPC Type" (e.g., "Centatis Daemon", "Arch Gistii Rogue")
 * These are considered hostile because they are pirate factions or rogue entities that attack players on sight.
 */
const NPC_FACTION_TYPES = [
  // Sansha's Nation - A pirate faction known for abductions and cybernetic implants, hostile to all capsuleers
  "Centatis",
  "Centus",
  "Sanshas",
  "Sansha",
  "Sansha's",

  // Serpentis Corporation - A drug cartel turned pirate corporation, aggressive towards capsuleers
  "Arch Gistii",
  "Gist",

  // Mordu's Legion - A Caldari loyalist faction that attacks without provocation
  "Mordu",

  // Guristas - A Minmatar pirate faction infamous for smuggling and raiding
  "Gurista",

  // Blood Raider Covenant - A cult-like faction that sacrifices victims in horrific rituals, extremely hostile
  "Blood",

  // Rogue Drones - Malfunctioning or wild drone swarms that attack any non-drone entity
  "Rogue",

  // Other Known NPC Types - Various hostile or neutral entities that can be aggressive
  "Talos",
  "Vigilant",
  "Sentinel",
  "Enyo",
  "Harpy",
  "Jaguar",
];

/**
 * Known individual NPC names (single-name entities)
 */
const INDIVIDUAL_NPC_NAMES = [
  "Erolissi Merr",
  "Kuikkatoh Kun Saisima",
  "QRNDU",
  "Aria L",
  "Macgunner Tivianne",
];

/**
 * Identifies if a shipType string matches known NPC patterns
 * Returns true for "Faction + Type" NPCs (e.g., "Centatis Daemon", "Arch Gistii Rogue")
 */
function isFactionTypeNpc(shipType: string): boolean {
  if (!shipType) return false;

  return NPC_FACTION_TYPES.some((faction) =>
    shipType.toLowerCase().startsWith(faction.toLowerCase()),
  );
}

/**
 * Identifies if a shipType string is an individual NPC name
 */
function isIndividualNpc(shipType: string): boolean {
  if (!shipType) return false;

  return INDIVIDUAL_NPC_NAMES.some(
    (name) => shipType.toLowerCase() === name.toLowerCase(),
  );
}

/**
 * Identifies if a shipType represents a hostile NPC (not player-controlled)
 * This includes both "Faction + Type" NPCs and individual NPC entities
 */
export function isHostileNpc(shipType?: string): boolean {
  if (!shipType) return false;
  return isFactionTypeNpc(shipType) || isIndividualNpc(shipType);
}

/**
 * Filters log entries to exclude hostile NPCs
 * Useful for focusing on player-to-player combat
 */
export function filterOutHostileNpcs(entries: LogEntry[]): LogEntry[] {
  return entries.filter((entry) => {
    // Keep player sources (has pilotName)
    if (entry.pilotName) return true;

    // Filter out hostile NPCs by shipType
    if (entry.shipType && isHostileNpc(entry.shipType)) return false;

    // Keep everything else (neutral entities, structures, etc.)
    return true;
  });
}

/**
 * Alternative: Filter to ONLY show hostile NPCs
 */
export function filterOnlyHostileNpcs(entries: LogEntry[]): LogEntry[] {
  return entries.filter((entry) => {
    if (!entry.shipType) return false;
    return isHostileNpc(entry.shipType);
  });
}
