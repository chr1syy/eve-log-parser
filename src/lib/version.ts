import { readFileSync } from "fs";
import { execSync } from "child_process";

export interface VersionInfo {
  version: string;
  buildTime: string;
  gitCommit?: string;
  gitTag?: string;
}

function _readVersion(): string {
  if (process.env.VERSION) return process.env.VERSION;
  if (process.env.GIT_TAG) return process.env.GIT_TAG;
  const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
  return pkg.version;
}

function _readGitCommit(): string | undefined {
  if (process.env.GIT_SHA) return process.env.GIT_SHA;
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return undefined;
  }
}

function _readGitTag(): string | undefined {
  if (process.env.GIT_TAG) return process.env.GIT_TAG;
  try {
    return execSync("git describe --tags --abbrev=0").toString().trim();
  } catch {
    return undefined;
  }
}

// Computed once at module init
const _version = _readVersion();
const _gitCommit = _readGitCommit();
const _gitTag = _readGitTag();
const _buildTime = process.env.BUILD_TIME ?? new Date().toISOString();

export function getVersion(): string {
  return _version;
}

export function getVersionInfo(): VersionInfo {
  return {
    version: _version,
    buildTime: _buildTime,
    gitCommit: _gitCommit,
    gitTag: _gitTag,
  };
}
