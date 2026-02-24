const fs = require("fs");
const path = require("path");

const REPO =
  process.env.CHANGELOG_REPO ||
  process.env.GITHUB_REPOSITORY ||
  "chr1syy/eve-log-parser";

const COMMITS_URL = `https://api.github.com/repos/${REPO}/commits?per_page=100`;

async function generateChangelog() {
  try {
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "EVE-Log-Parser/1.0",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(COMMITS_URL, { headers });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const githubCommits = await response.json();

    const commits = githubCommits.map((commit) => ({
      hash: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      timestamp: commit.commit.author.date,
      url: commit.html_url,
    }));

    const changelogData = { commits };

    // Ensure public directory exists
    const publicDir = path.join(__dirname, "..", "public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(publicDir, "changelog.json"),
      JSON.stringify(changelogData, null, 2),
    );

    console.log("Changelog generated successfully");
  } catch (error) {
    console.error("Error generating changelog:", error);
    process.exit(1);
  }
}

generateChangelog();
