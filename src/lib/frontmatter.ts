/**
 * Minimal YAML-frontmatter subset parser — just `title` and `tags`, the two
 * keys the import flow uses. Deliberately not a YAML library: anything else in
 * the block is ignored, and a malformed block is treated as plain content.
 *
 * Supported tag shapes:
 *   tags: [a, b]          inline array
 *   tags: a, b            comma list
 *   tags:                 block list
 *     - a
 *     - b
 */

export interface ParsedFrontmatter {
  title?: string;
  tags: string[];
  /** Markdown with the frontmatter block removed (or the input untouched). */
  body: string;
}

const unquote = (s: string) => s.trim().replace(/^["']|["']$/g, '').trim();

export function parseFrontmatter(markdown: string): ParsedFrontmatter {
  const none: ParsedFrontmatter = { tags: [], body: markdown };
  if (!markdown.startsWith('---\n') && !markdown.startsWith('---\r\n')) return none;

  const close = markdown.indexOf('\n---', 3);
  if (close === -1) return none;
  const endOfClose = markdown.indexOf('\n', close + 1);
  const block = markdown.slice(markdown.indexOf('\n') + 1, close);
  const body = endOfClose === -1 ? '' : markdown.slice(endOfClose + 1).replace(/^\s*\n/, '');

  let title: string | undefined;
  const tags: string[] = [];
  const lines = block.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const titleMatch = line.match(/^title:\s*(.+)$/i);
    if (titleMatch) {
      title = unquote(titleMatch[1]) || undefined;
      continue;
    }
    const tagsMatch = line.match(/^tags:\s*(.*)$/i);
    if (!tagsMatch) continue;

    const inline = tagsMatch[1].trim();
    if (inline.startsWith('[') && inline.endsWith(']')) {
      tags.push(...inline.slice(1, -1).split(',').map(unquote));
    } else if (inline) {
      tags.push(...inline.split(',').map(unquote));
    } else {
      // Block list: consume subsequent "- item" lines.
      while (i + 1 < lines.length) {
        const item = lines[i + 1].match(/^\s*-\s+(.+)$/);
        if (!item) break;
        tags.push(unquote(item[1]));
        i++;
      }
    }
  }

  return { title, tags: tags.filter(Boolean), body };
}
