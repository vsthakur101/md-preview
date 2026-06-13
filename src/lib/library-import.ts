import { MAX_TITLE_LENGTH } from '@/lib/validation';

/**
 * Parse a library-backup JSON document (produced by buildLibraryExport) into
 * importable entries. Lenient: malformed individual files are skipped and
 * counted rather than failing the whole import; only a non-JSON or
 * wrong-shaped document is a hard error.
 */
export interface ImportEntry {
  title: string;
  content: string;
  tags: string[];
}

export type LibraryImportParse =
  | { ok: true; entries: ImportEntry[]; skipped: number }
  | { ok: false; error: string };

export function parseLibraryImport(json: string): LibraryImportParse {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: 'not valid JSON' };
  }

  if (!data || typeof data !== 'object' || !Array.isArray((data as { files?: unknown }).files)) {
    return { ok: false, error: 'not a library backup' };
  }

  const entries: ImportEntry[] = [];
  let skipped = 0;

  for (const raw of (data as { files: unknown[] }).files) {
    const f = raw as { title?: unknown; content?: unknown; tags?: unknown };
    if (
      f &&
      typeof f.title === 'string' &&
      f.title.trim() &&
      typeof f.content === 'string' &&
      f.content.trim()
    ) {
      entries.push({
        title: f.title.trim().slice(0, MAX_TITLE_LENGTH),
        content: f.content,
        tags: Array.isArray(f.tags) ? f.tags.filter((t): t is string => typeof t === 'string') : [],
      });
    } else {
      skipped++;
    }
  }

  return { ok: true, entries, skipped };
}
