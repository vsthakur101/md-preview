/**
 * Text-offset anchoring for highlights.
 *
 * A highlight is stored as `[start, end)` character offsets into the article's
 * concatenated text content. Because the article HTML is static per file, these
 * offsets are stable across reloads — we re-walk the text nodes and wrap the
 * matching range(s) in `<mark>`. Wrapping never changes text content or order,
 * so applying several highlights in sequence keeps every offset valid.
 */

/** Character offset of a (container, offset) point within `root`. */
function pointOffset(root: Node, container: Node, offsetInContainer: number): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(container, offsetInContainer);
  return range.toString().length;
}

export function getRangeOffsets(
  root: HTMLElement,
  range: Range
): { start: number; end: number } | null {
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const start = pointOffset(root, range.startContainer, range.startOffset);
  const end = pointOffset(root, range.endContainer, range.endOffset);
  if (end <= start) return null;
  return { start, end };
}

/** Wrap the text in `[start, end)` with a `<mark>` carrying the highlight id. */
export function applyHighlight(
  root: HTMLElement,
  start: number,
  end: number,
  id: string,
  color: string
): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const ops: { node: Text; from: number; to: number }[] = [];
  let pos = 0;
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const text = node as Text;
    const len = text.length;
    const nodeStart = pos;
    const nodeEnd = pos + len;
    pos = nodeEnd;

    if (nodeEnd <= start || nodeStart >= end) continue;
    // Don't nest inside an existing highlight.
    if (text.parentElement?.closest('mark.reading-highlight')) continue;

    const from = Math.max(0, start - nodeStart);
    const to = Math.min(len, end - nodeStart);
    if (to > from) ops.push({ node: text, from, to });
  }

  for (const op of ops) {
    const range = document.createRange();
    range.setStart(op.node, op.from);
    range.setEnd(op.node, op.to);
    const mark = document.createElement('mark');
    mark.className = `reading-highlight reading-highlight-${color}`;
    mark.dataset.highlightId = id;
    try {
      range.surroundContents(mark);
    } catch {
      /* range not surroundable (crosses element boundary) — skip this fragment */
    }
  }
}

/** Unwrap a highlight's `<mark>`(s) and merge the text back together. */
export function removeHighlight(root: HTMLElement, id: string): void {
  root
    .querySelectorAll<HTMLElement>(`mark.reading-highlight[data-highlight-id="${id}"]`)
    .forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      (parent as Element).normalize?.();
    });
}
