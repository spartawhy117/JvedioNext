import { readFileSync, writeFileSync } from "node:fs";

const startMarker = "<!-- repo-report:start -->";
const endMarker = "<!-- repo-report:end -->";
const readmePath = process.env.README_PATH || "README.md";
const defaultRepository = process.env.GITHUB_REPOSITORY;
const reportTimeZone = process.env.REPORT_TIME_ZONE || "Asia/Shanghai";
const reportDays = Number(process.env.REPORT_DAYS || 7);
const apiBaseUrl = process.env.GITHUB_API_URL || "https://api.github.com";

const releasesRepository = process.env.REPORT_RELEASES_REPOSITORY || defaultRepository;
const issuesRepository = process.env.REPORT_ISSUES_REPOSITORY || defaultRepository;
const releasesToken = process.env.REPORT_RELEASES_TOKEN || process.env.GITHUB_TOKEN;
const issuesToken = process.env.REPORT_ISSUES_TOKEN || process.env.GITHUB_TOKEN;

if (!defaultRepository) {
  throw new Error("Missing GITHUB_REPOSITORY.");
}

if (!releasesRepository) {
  throw new Error("Missing REPORT_RELEASES_REPOSITORY.");
}

if (!issuesRepository) {
  throw new Error("Missing REPORT_ISSUES_REPOSITORY.");
}

if (!releasesToken) {
  throw new Error("Missing REPORT_RELEASES_TOKEN or GITHUB_TOKEN.");
}

if (!issuesToken) {
  throw new Error("Missing REPORT_ISSUES_TOKEN or GITHUB_TOKEN.");
}

function splitRepository(repository) {
  const [owner, repo] = String(repository || "").split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid repository value: ${repository}`);
  }

  return { owner, repo };
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: reportTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function subtractDays(days) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

async function requestJson({ token, path, searchParams = {} }) {
  const url = new URL(path, `${apiBaseUrl}/`);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "jvedionext-readme-report",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}\n${body}`);
  }

  return response.json();
}

async function paginate({ token, path, baseSearchParams = {} }) {
  const results = [];

  for (let page = 1; page <= 100; page += 1) {
    const pageItems = await requestJson({
      token,
      path,
      searchParams: {
        ...baseSearchParams,
        per_page: 100,
        page,
      },
    });

    if (!Array.isArray(pageItems) || pageItems.length === 0) {
      break;
    }

    results.push(...pageItems);

    if (pageItems.length < 100) {
      break;
    }
  }

  return results;
}

async function getClosedIssueCount(repository, token, days) {
  const { owner, repo } = splitRepository(repository);
  const conditions = [
    `repo:${owner}/${repo}`,
    "is:issue",
    "is:closed",
  ];

  if (days > 0) {
    const closedAfter = new Date(subtractDays(days)).toISOString();
    conditions.push(`closed:>=${closedAfter}`);
  }

  const result = await requestJson({
    token,
    path: "search/issues",
    searchParams: {
      q: conditions.join(" "),
      per_page: 1,
    },
  });

  return result.total_count || 0;
}

async function getReleaseCounts(repository, token, days) {
  const { owner, repo } = splitRepository(repository);
  const releases = await paginate({
    token,
    path: `repos/${owner}/${repo}/releases`,
  });

  const publishedReleases = releases.filter(release => !release.draft);
  const weeklyThreshold = subtractDays(days);
  const weeklyReleases = publishedReleases.filter(release => {
    const publishedAt = release.published_at || release.created_at;
    return publishedAt && new Date(publishedAt).getTime() >= weeklyThreshold;
  });

  return {
    total: publishedReleases.length,
    weekly: weeklyReleases.length,
  };
}

function buildReport({ releaseCounts, issueCounts }) {
  const generatedAt = formatDateTime(Date.now());
  const lines = [
    "## 开发简报",
    "",
    `> 自动更新：${generatedAt}（${reportTimeZone}）`,
    "> 统计口径：版本发布数读取私有发布数据的非 Draft release；Issue 处理数读取公开仓库的已关闭 issue。",
    "",
    "### 累计",
    "",
    "| 指标 | 数值 |",
    "| --- | ---: |",
    `| 版本发布数 | ${releaseCounts.total} |`,
    `| Issue 处理数 | ${issueCounts.total} |`,
    "",
    `### 当周（最近 ${reportDays} 天）`,
    "",
    "| 指标 | 数值 |",
    "| --- | ---: |",
    `| 版本发布数 | ${releaseCounts.weekly} |`,
    `| Issue 处理数 | ${issueCounts.weekly} |`,
  ];

  return [startMarker, ...lines, endMarker].join("\n");
}

async function main() {
  const [releaseCounts, totalIssueCount, weeklyIssueCount] = await Promise.all([
    getReleaseCounts(releasesRepository, releasesToken, reportDays),
    getClosedIssueCount(issuesRepository, issuesToken, 0),
    getClosedIssueCount(issuesRepository, issuesToken, reportDays),
  ]);

  const reportBlock = buildReport({
    releaseCounts,
    issueCounts: {
      total: totalIssueCount,
      weekly: weeklyIssueCount,
    },
  });

  const readme = readFileSync(readmePath, "utf8");
  const blockPattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  const nextReadme = blockPattern.test(readme)
    ? readme.replace(blockPattern, reportBlock)
    : `${readme.trimEnd()}\n\n---\n\n${reportBlock}\n`;

  writeFileSync(readmePath, nextReadme);
  console.log(`Updated ${readmePath}`);
}

await main();
