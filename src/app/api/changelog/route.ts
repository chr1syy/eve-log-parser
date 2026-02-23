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

  try {
    // Fetch commits from GitHub API
    const response = await fetch(
      `https://api.github.com/repos/chr1syy/eve-log-parser/commits?per_page=${limit}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "EVE-Log-Parser/1.0",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const githubCommits = await response.json();

    const commits: CommitEntry[] = githubCommits.map((commit: any) => ({
      hash: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      timestamp: commit.commit.author.date,
      url: commit.html_url,
    }));

    return NextResponse.json(
      { commits },
      {
        headers: {
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching changelog:", error);
    // Fallback to mock data if GitHub API fails
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

    return NextResponse.json(
      { commits },
      {
        headers: {
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  }
}
