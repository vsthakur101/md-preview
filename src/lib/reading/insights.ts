/**
 * Aggregate per-tag reading insights for the stats page: how many articles
 * carry each tag, how many you've finished, and minutes actually read
 * (estimated minutes weighted by synced progress fraction).
 *
 * Pure and unit-tested; the stats page just maps its data into this shape.
 */
export interface TagInsightInput {
  tags: string[];
  minutes: number; // full read-time estimate for the article
  fraction: number; // 0..1 synced reading progress
}

export interface TagInsight {
  tag: string;
  total: number;
  finished: number;
  minutesRead: number;
}

const FINISHED_AT = 0.97;

export function aggregateTagInsights(files: TagInsightInput[]): TagInsight[] {
  const map = new Map<string, TagInsight>();

  for (const f of files) {
    for (const tag of f.tags) {
      const cur = map.get(tag) ?? { tag, total: 0, finished: 0, minutesRead: 0 };
      cur.total += 1;
      if (f.fraction >= FINISHED_AT) cur.finished += 1;
      cur.minutesRead += Math.round(f.minutes * Math.min(1, Math.max(0, f.fraction)));
      map.set(tag, cur);
    }
  }

  // Most-read topics first; ties broken alphabetically for stable output.
  return [...map.values()].sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag));
}
