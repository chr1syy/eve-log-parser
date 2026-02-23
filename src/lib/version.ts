import { readFileSync } from "fs";
import { execSync } from "child_process";

export interface VersionInfo {
  version: string;
  buildTime: string;
  gitCommit?: string;
  gitTag?: string;
}

function getVersion(): string {
  const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
  return packageJson.version;
}

function getGitCommit(): string | undefined {
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return undefined;
  }
}

function getGitTag(): string | undefined {
  try {
    return execSync("git describe --tags --abbrev=0").toString().trim();
  } catch {
    return undefined;
  }
}

function getBuildTime(): string {
  return new Date().toISOString();
}

export function getVersionInfo(): VersionInfo {
  return {
    version: getVersion(),
    buildTime: getBuildTime(),
    gitCommit: getGitCommit(),
    gitTag: getGitTag(),
  };
}
