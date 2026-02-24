import { readFileSync } from "fs";
import path from "path";
import { test, expect } from "vitest";
import { parseLogFile } from "../lib/parser";

const FIXTURE_PATH = path.resolve(
  __dirname,
  "fixtures/test_shield_reps.txt",
);

function fileFromDisk(filePath: string): File {
  const buffer = readFileSync(filePath);
  const blob = new Blob([buffer], { type: "text/plain" });
  // Use the full absolute path as the file name so that readLogText's
  // Node.js fallback can locate the file when jsdom's Blob lacks text().
  return new File([blob], filePath, { type: "text/plain" });
}

test("parse shield reps log", async () => {
  const parsed = await parseLogFile(fileFromDisk(FIXTURE_PATH));
  const repEntries = parsed.entries.filter(
    (e) => e.eventType === "rep-received",
  );
  expect(repEntries.length).toBe(4);

  // Incoming armor repair from player
  expect(repEntries[0].amount).toBe(256);
  expect(repEntries[0].repShipType).toBe("Vedmak");
  expect(repEntries[0].repModule).toBe("Medium Remote Armor Repairer II");
  expect(repEntries[0].isRepBot).toBe(false);

  // Incoming shield repair from player
  expect(repEntries[1].amount).toBe(300);
  expect(repEntries[1].repShipType).toBe("Vedmak");
  expect(repEntries[1].repModule).toBe("Medium Remote Shield Booster II");
  expect(repEntries[1].isRepBot).toBe(false);

  // Incoming armor maintenance bot repair
  expect(repEntries[2].amount).toBe(120);
  expect(repEntries[2].repShipType).toBe("Medium Armor Maintenance Bot I");
  expect(repEntries[2].repModule).toBe("Medium Armor Maintenance Bot I");
  expect(repEntries[2].isRepBot).toBe(true);

  // Incoming shield maintenance bot repair
  expect(repEntries[3].amount).toBe(150);
  expect(repEntries[3].repShipType).toBe("Medium Shield Maintenance Bot I");
  expect(repEntries[3].repModule).toBe("Medium Shield Maintenance Bot I");
  expect(repEntries[3].isRepBot).toBe(true);
});
