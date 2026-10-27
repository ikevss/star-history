import { githubFetchRaw, lastPageFromLink } from "./github.js";
import type { RepoStats } from "./types.js";

const PER_PAGE = 100;
const SEARCH_INTERVAL_MS = 2100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function weekBounds(week: string): { start: Date; end: Date } {
  const match = week.match(/^(\d{4})-W(\d{2})$/);
  if (!match) throw new Error(`Invalid week format: ${week}. Expected YYYY-Wnn`);
  const year = parseInt(match[1]);
  const weekNum = parseInt(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (weekNum - 1) * 7);
  const end = new Date(monday);
  end.setUTCDate(monday.getUTCDate() + 7);
  return { start: monday, end };
}

function stargazerPage(repo: string, page: number) {
  return githubFetchRaw(
    `https://api.github.com/repos/${repo}/stargazers?per_page=${PER_PAGE}&page=${page}`,
    0,
    "application/vnd.github.star+json",
  );
}

async function countStargazersBefore(repo: string, target: Date, totalPages: number): Promise<number> {
  const locate = (rows: { starred_at: string }[]) => {
    const idx = rows.findIndex((row) => new Date(row.starred_at) >= target);
    return idx === -1 ? rows.length : idx;
  };

  if (totalPages <= 1) {
    const res = await stargazerPage(repo, 1);
    return locate(res.data as { starred_at: string }[]);
  }

  let lo = 1;
  let hi = totalPages;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const res = await stargazerPage(repo, mid);
    const rows = res.data as { starred_at: string }[];
    const first = rows[0];
    if (!first || new Date(first.starred_at) < target) lo = mid + 1;
    else hi = mid;
  }

  const res = await stargazerPage(repo, lo);
  return (lo - 1) * PER_PAGE + locate(res.data as { starred_at: string }[]);
}

async function countCommitsInRange(repo: string, sinceIso: string, untilIso: string): Promise<number> {
  const res = await githubFetchRaw(
    `https://api.github.com/repos/${repo}/commits?since=${sinceIso}&until=${untilIso}&per_page=1`,
  );
  const last = lastPageFromLink(res.headers.get("link"));
  if (last !== null) return last;
  return Array.isArray(res.data) ? res.data.length : 0;
}

async function totalContributors(repo: string): Promise<number> {
  const res = await githubFetchRaw(
    `https://api.github.com/repos/${repo}/contributors?per_page=1&anon=false`,
  );
  const last = lastPageFromLink(res.headers.get("link"));
  if (last !== null) return last;
  return Array.isArray(res.data) ? res.data.length : 0;
}

async function countForksInRange(repo: string, start: Date): Promise<number> {
  const res = await githubFetchRaw(
    `https://api.github.com/repos/${repo}/forks?sort=newest&per_page=${PER_PAGE}`,
  );
  if (!Array.isArray(res.data)) return 0;
  let count = 0;
  for (const fork of res.data as { created_at: string }[]) {
    if (new Date(fork.created_at) >= start) count++;
    else break;
  }
  return count;
}

async function countIssuesClosed(repo: string, start: Date, end: Date): Promise<number> {
  const range = `${start.toISOString().slice(0, 10)}..${end.toISOString().slice(0, 10)}`;
  const q = encodeURIComponent(`repo:${repo} is:issue is:closed closed:${range}`);
  const res = await githubFetchRaw(
    `https://api.github.com/search/issues?q=${q}&per_page=1`,
  );
  return typeof res.data?.total_count === "number" ? res.data.total_count : 0;
}

export interface StatsInputRepo {
  name: string;
  star_count: number;
}

export async function fetchRepoStatsFromGitHub(
  week: string,
  repos: StatsInputRepo[],
): Promise<RepoStats[]> {
  const { start, end } = weekBounds(week);
  const sinceIso = start.toISOString();
  const untilIso = end.toISOString();
  const results: RepoStats[] = [];

  for (let i = 0; i < repos.length; i++) {
    const { name, star_count } = repos[i];
    const tag = `[GitHubStats] ${i + 1}/${repos.length} ${name}`;

    try {
      const firstPage = await stargazerPage(name, 1);
      const totalPages = lastPageFromLink(firstPage.headers.get("link")) ?? 1;
      const starsBefore = await countStargazersBefore(name, start, totalPages);
      const newStars = Math.max(0, star_count - starsBefore);

      const commits = await countCommitsInRange(name, sinceIso, untilIso);
      const contributors = await totalContributors(name);
      const newForks = await countForksInRange(name, start);

      let issuesClosed = 0;
      try {
        issuesClosed = await countIssuesClosed(name, start, end);
      } catch (err) {
        console.warn(`${tag} issues lookup failed: ${(err as Error).message}`);
      }
      await sleep(SEARCH_INTERVAL_MS);

      results.push({
        repo_name: name,
        week,
        new_stars: newStars,
        new_forks: newForks,
        issues_opened: 0,
        issues_closed: issuesClosed,
        prs_opened: 0,
        prs_merged: 0,
        pushes: commits,
        commits,
        releases: 0,
        review_comments: 0,
        unique_contributors: contributors,
      });

      console.log(`${tag} stars+${newStars} commits=${commits} contributors=${contributors} forks+${newForks} closed=${issuesClosed}`);
    } catch (err) {
      console.warn(`${tag} skipped: ${(err as Error).message}`);
      await sleep(SEARCH_INTERVAL_MS);
    }
  }

  return results;
}
