"use client";

import fs from "fs";
import { join } from "path";

export default function ChangelogPage() {
  let md = "";
  try {
    const root = process.cwd();
    const p = join(root, "CHANGELOG.md");
    if (fs.existsSync(p)) md = fs.readFileSync(p, "utf8");
  } catch (e) {
    md = "CHANGELOG.md not found";
  }

  return (
    <div className="prose max-w-none p-6">
      <pre className="whitespace-pre-wrap">{md}</pre>
    </div>
  );
}
