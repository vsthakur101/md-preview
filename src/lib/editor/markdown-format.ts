/**
 * Pure text transforms for the editor toolbar. Each returns the new full text
 * plus the selection range to restore, so the component stays a thin shell and
 * the tricky cases (toggling off, heading replacement) are unit-tested here.
 */

export interface EditResult {
  text: string;
  selStart: number;
  selEnd: number;
}

/**
 * Toggle an inline wrap marker (`**`, `*`, `` ` ``) around the selection:
 *   - already wrapped (markers inside or immediately outside the selection)
 *     → unwrap;
 *   - otherwise → wrap.
 * With an empty selection, inserts the marker pair and parks the cursor inside.
 */
export function toggleWrap(value: string, start: number, end: number, marker: string): EditResult {
  const selected = value.slice(start, end);
  const mLen = marker.length;

  if (start === end) {
    const text = value.slice(0, start) + marker + marker + value.slice(end);
    return { text, selStart: start + mLen, selEnd: start + mLen };
  }

  // Markers inside the selection.
  if (selected.length >= 2 * mLen && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(mLen, selected.length - mLen);
    const text = value.slice(0, start) + inner + value.slice(end);
    return { text, selStart: start, selEnd: start + inner.length };
  }

  // Markers immediately surrounding the selection.
  if (value.slice(start - mLen, start) === marker && value.slice(end, end + mLen) === marker) {
    const text = value.slice(0, start - mLen) + selected + value.slice(end + mLen);
    return { text, selStart: start - mLen, selEnd: end - mLen };
  }

  const text = value.slice(0, start) + marker + selected + marker + value.slice(end);
  return { text, selStart: start + mLen, selEnd: start + mLen + selected.length };
}

/**
 * Set (or toggle off) the heading level of a single line. Replaces any existing
 * `#`-prefix rather than stacking it; re-applying the same level removes it.
 */
export function setHeadingLevel(line: string, level: number): string {
  const existing = line.match(/^(#{1,6})\s+/);
  const body = existing ? line.slice(existing[0].length) : line;
  if (existing && existing[1].length === level) return body; // toggle off
  return `${'#'.repeat(level)} ${body}`;
}

/**
 * Apply setHeadingLevel to the line containing `cursor`, returning the new full
 * text and a collapsed selection at the end of that line.
 */
export function applyHeadingAtCursor(value: string, cursor: number, level: number): EditResult {
  const lineStart = value.lastIndexOf('\n', cursor - 1) + 1;
  const lineEndRaw = value.indexOf('\n', cursor);
  const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
  const newLine = setHeadingLevel(value.slice(lineStart, lineEnd), level);
  const text = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
  const caret = lineStart + newLine.length;
  return { text, selStart: caret, selEnd: caret };
}
