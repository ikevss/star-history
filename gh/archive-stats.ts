import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";
import type { RepoStats } from "./types.js";

const ARCHIVE_BASE = "https://data.gharchive.org";
const CONCURRENCY = 6;

interface Counters {
  new_stars: number;
  new_forks: number;
  issues_opened: number;
  issues_closed: number;
  prs_opened: number;
  prs_merged: number;
  pushes: number;
  commits: number;
  releases: number;
  review_comments: number;
  actors: Set<string>;
}

function newCounters(): Counters {
  return {
    new_stars: 0,
    new_forks: 0,
    issues_opened: 0,
    issues_closed: 0,
    prs_opened: 0,
    prs_merged: 0,
    pushes: 0,
    commits: 0,
    releases: 0,
    review_comments: 0,
    actors: new Set(),
  };
}

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

function hourSlots(week: string): { date: string; hour: number }[] {
  const { start } = weekBounds(week);
  const slots: { date: string; hour: number }[] = [];
  for (let i = 0; i < 7 * 24; i++) {
    const t = new Date(start.getTime() + i * 3600 * 1000);
    const yyyy = t.getUTCFullYear();
    const mm = String(t.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(t.getUTCDate()).padStart(2, "0");
    slots.push({ date: `${yyyy}-${mm}-${dd}`, hour: t.getUTCHours() });
  }
  return slots;
}

async function processHour(
  slot: { date: string; hour: number },
  targets: Set<string>,
  counters: Map<string, Counters>,
): Promise<number> {
  const url = `${ARCHIVE_BASE}/${slot.date}-${slot.hour}.json.gz`;
  const res = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!res.ok || !res.body) {
    console.warn(`[Archive] skip ${slot.date}-${slot.hour}: ${res.status}`);
    return 0;
  }

  let matched = 0;
  const gunzip = createGunzip();
  const stream = Readable.fromWeb(res.body as any).pipe(gunzip);
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line) continue;
    let ev: any;
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    const repoName = ev?.repo?.name;
    if (!repoName || !targets.has(repoName)) continue;

    const c = counters.get(repoName);
    if (!c) continue;
    matched++;

    switch (ev.type) {
      case "WatchEvent":
        c.new_stars++;
        break;
      case "ForkEvent":
        c.new_forks++;
        break;
      case "IssuesEvent":
        if (ev.payload?.action === "opened") c.issues_opened++;
        else if (ev.payload?.action === "closed") c.issues_closed++;
        break;
      case "PullRequestEvent":
        if (ev.payload?.action === "opened") c.prs_opened++;
        else if (ev.payload?.action === "closed" && ev.payload?.pull_request?.merged) c.prs_merged++;
        break;
      case "PushEvent":
        c.pushes++;
        c.commits += Number(ev.payload?.size ?? 0);
        break;
      case "ReleaseEvent":
        c.releases++;
        break;
      case "PullRequestReviewCommentEvent":
        c.review_comments++;
        break;
    }

    const login = ev?.actor?.login;
    if (login) c.actors.add(login);
  }

  return matched;
}

export async function fetchRepoStatsFromArchive(
  week: string,
  repoNames: string[],
): Promise<RepoStats[]> {
  const targets = new Set(repoNames);
  const counters = new Map<string, Counters>();
  for (const name of repoNames) counters.set(name, newCounters());

  const slots = hourSlots(week);
  console.log(`[Archive] ${week}: ${slots.length} hourly files, ${repoNames.length} target repos`);

  let done = 0;
  let matchedTotal = 0;
  let index = 0;

  async function worker() {
    while (index < slots.length) {
      const slot = slots[index++];
      try {
        const matched = await processHour(slot, targets, counters);
        matchedTotal += matched;
      } catch (err) {
        console.warn(`[Archive] ${slot.date}-${slot.hour} failed: ${(err as Error).message}`);
      }
      done++;
      if (done % 12 === 0 || done === slots.length) {
        console.log(`[Archive] progress ${done}/${slots.length} (matched events: ${matchedTotal})`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const results: RepoStats[] = [];
  for (const [repo_name, c] of counters) {
    results.push({
      repo_name,
      week,
      new_stars: c.new_stars,
      new_forks: c.new_forks,
      issues_opened: c.issues_opened,
      issues_closed: c.issues_closed,
      prs_opened: c.prs_opened,
      prs_merged: c.prs_merged,
      pushes: c.pushes,
      commits: c.commits,
      releases: c.releases,
      review_comments: c.review_comments,
      unique_contributors: c.actors.size,
    });
  }

  return results;
}
