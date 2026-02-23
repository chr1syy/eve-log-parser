import { NextRequest, NextResponse } from "next/server";

export interface CommitEntry {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  url?: string;
}

export interface ChangelogResponse {
  commits: CommitEntry[];
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ChangelogResponse>> {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  // Mock data for now
  const commits: CommitEntry[] = [
    {
      hash: "abc123def456",
      message: "Initial commit",
      author: "John Doe",
      timestamp: "2023-01-01T00:00:00Z",
    },
    {
      hash: "def456ghi789",
      message: "Add changelog API",
      author: "Jane Smith",
      timestamp: "2023-01-02T00:00:00Z",
    },
  ];

  // For mock, ignore from/to/limit and return all
  return NextResponse.json(
    { commits },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
