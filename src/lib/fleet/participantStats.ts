import { LogEntry } from "@/lib/types";
import { FleetParticipant } from "@/types/fleet";

export function calculateParticipantStats(
  mergedEntries: LogEntry[],
  participants: FleetParticipant[],
): FleetParticipant[] {
  const result: FleetParticipant[] = [];

  for (const participant of participants) {
    const pilotEntries = mergedEntries.filter(
      (entry) => entry.fleetPilot === participant.pilotName,
    );

    // Calculate damageDealt: sum damage-dealt amounts
    const damageDealt = pilotEntries
      .filter((entry) => entry.eventType === "damage-dealt")
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // Calculate damageTaken: sum damage-received amounts
    const damageTaken = pilotEntries
      .filter((entry) => entry.eventType === "damage-received")
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // Calculate repsGiven: sum rep-outgoing amounts
    const repsGiven = pilotEntries
      .filter((entry) => entry.eventType === "rep-outgoing")
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // Calculate repsTaken: sum rep-received amounts
    const repsTaken = pilotEntries
      .filter((entry) => entry.eventType === "rep-received")
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // Determine status: "active" for survived, "inactive" for killed
    // Pod destruction detection not implemented yet, so assume survived
    const status = "active";

    result.push({
      ...participant,
      damageDealt,
      damageTaken,
      repsGiven,
      repsTaken,
      status,
    });
  }

  return result;
}
