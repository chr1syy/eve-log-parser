#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

function usage() {
  console.log(
    "Usage: node scripts/apply-changelog.mjs --version vX.Y.Z --summary-file path/to/summary.txt",
  );
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--version") {
      out.version = args[++i];
    } else if (a === "--summary-file") {
      out.summaryFile = args[++i];
    } else if (a === "--summary") {
      out.summary = args[++i];
    } else if (a === "--changelog-json") {
      out.changelogJson = args[++i];
    } else {
      console.error("Unknown arg", a);
      usage();
    }
  }
  return out;
}

async function main() {
  const args = parseArgs();
  if (!args.version) usage();

  const changelogPath =
    args.changelogJson || join(__dirname, "..", "public", "changelog.json");
  if (!existsSync(changelogPath)) {
    console.error(
      `Changelog JSON not found at ${changelogPath}. Run scripts/generate-changelog.mjs first or provide --changelog-json.`,
    );
    process.exit(1);
  }

  const changelog = JSON.parse(readFileSync(changelogPath, "utf8"));

  let summaryText = args.summary ?? "";
  if (args.summaryFile) {
    if (!existsSync(args.summaryFile)) {
      console.error(`Summary file not found: ${args.summaryFile}`);
      process.exit(1);
    }
    summaryText = readFileSync(args.summaryFile, "utf8");
  }

  if (!summaryText) {
    console.error(
      "No summary provided. Use --summary or --summary-file to provide release notes summary.",
    );
    process.exit(1);
  }

  const changelogMdPath = join(__dirname, "..", "CHANGELOG.md");
  const date = new Date().toISOString().slice(0, 10);
  const header = `## ${args.version} - ${date}\n\n`;

  const commits = changelog.commitsSinceLast ?? [];
  const commitLines = commits
    .map((c) => `- ${c.message} (${c.hash.slice(0, 7)}) by ${c.author}`)
    .join("\n");

  const entry = `${header}${summaryText.trim()}\n\n### Commits\n${commitLines}\n\n`;

  // Prepend to CHANGELOG.md (create if missing)
  let existing = "";
  if (existsSync(changelogMdPath))
    existing = readFileSync(changelogMdPath, "utf8");
  const newContent = `${entry}${existing}`;
  writeFileSync(changelogMdPath, newContent, "utf8");

  try {
    execSync(`git add ${changelogMdPath}`, { stdio: "inherit" });
    execSync(`git commit -m "chore(release): ${args.version}"`, {
      stdio: "inherit",
    });
    execSync(`git tag -a ${args.version} -m "Release ${args.version}"`, {
      stdio: "inherit",
    });
    execSync(`git push origin HEAD`, { stdio: "inherit" });
    execSync(`git push origin ${args.version}`, { stdio: "inherit" });
    console.log("Release applied and pushed.");
  } catch (e) {
    console.error("Git operations failed:", e);
    process.exit(1);
  }
}

main();
