import { readFileSync, existsSync } from "fs";
import { join } from "path";

export default function ChangelogPage() {
  let md = "";
  try {
    const p = join(process.cwd(), "CHANGELOG.md");
    if (existsSync(p)) md = readFileSync(p, "utf8");
  } catch (e) {
    md = "CHANGELOG.md not found";
  }

  return (
    <div className="prose max-w-none p-6">
      <pre className="whitespace-pre-wrap">{md}</pre>
    </div>
  );
}
