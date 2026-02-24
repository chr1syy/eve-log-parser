import type { LogEntry } from "./types";

/**
 * Known NPC faction/type prefixes that identify hostile NPCs
 * Format: "Faction Name + NPC Type" (e.g., "Centatis Daemon", "Arch Gistii Rogue")
 */
const NPC_FACTION_TYPES = [
  // Sansha's Nation
  "Centatis",
  "Centus",
  "Sanshas",
  "Sansha",

  // Serpentis Corporation
  "Arch Gistii",
  "Gist",

  // Mordu's Legion
  "Mordu",

  // Guristas
  "Gurista",

  // Blood Raider Covenant
  "Blood",

  // Rogue Drones
  "Rogue",

  // Other Known NPC Types
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
