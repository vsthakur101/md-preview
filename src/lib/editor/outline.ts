/**
 * Parse an ATX-heading outline from markdown source for the editor's jump
 * panel. Fenced code blocks are skipped so a `# comment` line inside ``` isn't
 * mistaken for a heading. Offsets are character indices of each heading's line
 * start, so the editor can place the caret there.
 */
export interface OutlineItem {
  level: number; // 1..6
  text: string;
  offset: number; // char offset of the line start in the source
}

export function parseOutline(content: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  const lines = content.split('\n');
  let inFence = false;
  let offset = 0;

  for (const line of lines) {
    const fence = /^\s{0,3}(```|~~~)/.test(line);
    if (fence) {
      inFence = !inFence;
    } else if (!inFence) {
      // Up to 3 leading spaces, 1–6 hashes, a space, text, optional closing #s.
      const m = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (m) items.push({ level: m[1].length, text: m[2].trim(), offset });
    }
    offset += line.length + 1; // +1 for the consumed '\n'
  }

  return items;
}
