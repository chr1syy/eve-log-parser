import { appendFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export function appendAuditEntry(entry: Record<string, unknown>): void {
  try {
    const dataDir = join(process.cwd(), "data");
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    const file = join(dataDir, "edits.log");
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
    appendFileSync(file, line + "\n", "utf-8");
  } catch {
    // Non-fatal: audit best-effort — intentionally swallow errors
  }
}
