import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import type { ChangelogResponse } from "../../../lib/types";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ChangelogResponse>> {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  let limit = 50;
  if (limitParam !== null) {
    const parsed = parseInt(limitParam, 10);
    if (!Number.isNaN(parsed)) {
      limit = parsed;
    }
  }

  try {
    // Read baked changelog data from build time
    const changelogPath = join(process.cwd(), "public", "changelog.json");
    const changelogData = JSON.parse(readFileSync(changelogPath, "utf-8"));

    let commits = changelogData.commits || [];

    // Apply limit
    if (limit > 0) {
      commits = commits.slice(0, limit);
    }

    // For now, ignore from/to filtering - can be added later if needed

    return NextResponse.json(
      { commits },
      {
        headers: {
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  } catch (error) {
    console.error("Error reading changelog:", error);
    // Fallback to empty if file not found
    return NextResponse.json(
      { commits: [] },
      {
        headers: {
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  }
}
