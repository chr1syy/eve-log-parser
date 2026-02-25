export const DRONE_NAMES = [
  "Wasp",
  "Infiltrator",
  "Hornet",
  "Hammerhead",
  "Hobgoblin",
  "Ogre",
  "Valkyrie",
  "Warrior",
  "Curator",
  "Garde",
  "Warden",
  "Bouncer",
  "Berserker",
  "Acolyte",
  "Praetor",
  "Gecko",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Determine whether a weapon name corresponds to a drone.
 * Normalizes common suffixes and roman numerals (eg. "Hobgoblin II").
 */
export function isDroneWeapon(weapon?: string): boolean {
  if (!weapon) return false;
  let w = weapon.toLowerCase();
  // Remove common suffixes like "Mk II", standalone roman numerals and simple digits
  w = w
    .replace(/mk\s*\d+|mk\s*[ivx]+/gi, "")
    .replace(/\b(?:i|ii|iii|iv|v|vi|vii|viii|ix|x|\d+)\b/gi, "")
    .replace(/[()]/g, "")
    .trim();

  for (const name of DRONE_NAMES) {
    const re = new RegExp(
      "\\b" + escapeRegExp(name.toLowerCase()) + "\\b",
      "i",
    );
    if (re.test(w)) return true;
  }
  return false;
}
