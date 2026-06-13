/**
 * Markdown list/quote continuation logic for the editor.
 *
 * Given the text from the start of the current line up to the cursor, decide
 * what pressing Enter should do:
 *   - `continue` with `insert` text (newline + the next marker), or
 *   - `exit` (the item is empty → remove the marker and leave the list), or
 *   - `null` (not a list/quote line → default newline).
 *
 * Pure and exhaustively unit-tested; the component just applies the result.
 */
export type ListAction = { type: 'continue'; insert: string } | { type: 'exit' } | null;

export function listItemAction(line: string): ListAction {
  // Task item: "- [ ] " / "- [x] " (checked state resets to unchecked).
  let m = line.match(/^(\s*)([-*+])\s+\[[ xX]\]\s+(.*)$/);
  if (m) return m[3].trim() ? { type: 'continue', insert: `\n${m[1]}${m[2]} [ ] ` } : { type: 'exit' };

  // Ordered item: "1. " → next number.
  m = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
  if (m) {
    return m[3].trim()
      ? { type: 'continue', insert: `\n${m[1]}${parseInt(m[2], 10) + 1}. ` }
      : { type: 'exit' };
  }

  // Unordered item: "- " / "* " / "+ ".
  m = line.match(/^(\s*)([-*+])\s+(.*)$/);
  if (m) return m[3].trim() ? { type: 'continue', insert: `\n${m[1]}${m[2]} ` } : { type: 'exit' };

  // Blockquote: "> ".
  m = line.match(/^(\s*)>\s+(.*)$/);
  if (m) return m[2].trim() ? { type: 'continue', insert: `\n${m[1]}> ` } : { type: 'exit' };

  return null;
}
