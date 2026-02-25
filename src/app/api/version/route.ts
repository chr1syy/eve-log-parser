import { NextResponse } from "next/server";
import { getVersionInfo, type VersionInfo } from "../../../lib/version";

export async function GET(): Promise<NextResponse<VersionInfo>> {
  const versionInfo = getVersionInfo();
  return NextResponse.json(versionInfo, {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
