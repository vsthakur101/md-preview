import { z } from 'zod';

/**
 * Upper bound on stored markdown. `MarkdownFile.content` is an unbounded
 * Postgres `TEXT` column, so without this a single request could persist an
 * arbitrarily large blob. 256 KB is comfortably larger than any hand-written
 * document while capping abuse / storage blow-up.
 */
export const MAX_CONTENT_BYTES = 256_000;
export const MAX_TITLE_LENGTH = 200;
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;

/** Lowercase, trim, drop empties, dedupe, cap count + length. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
    if (tag) seen.add(tag);
    if (seen.size >= MAX_TAGS) break;
  }
  return [...seen];
}

export const tagsSchema = z.array(z.string()).max(50).transform(normalizeTags);

export const fileInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(MAX_TITLE_LENGTH),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(MAX_CONTENT_BYTES, 'Content is too large'),
  tags: tagsSchema.optional(),
});

export type FileInput = z.infer<typeof fileInputSchema>;

/**
 * Build the denormalized list preview from markdown content: strip the most
 * common markdown punctuation, collapse whitespace, and truncate.
 *
 * Shared by the create and update routes so a file's preview stays consistent
 * with its content after every write.
 */
export function buildPreview(content: string): string {
  const stripped = content
    .replace(/[#*`\[\]()>-]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .substring(0, 150);

  return stripped + (content.length > 150 ? '...' : '');
}

/**
 * Word-count read-time estimate at 230 wpm — the same rate the reader's
 * "time left" countdown uses, so the library card and the reader agree.
 */
export function estimateReadMinutes(content: string): number {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 230));
}
