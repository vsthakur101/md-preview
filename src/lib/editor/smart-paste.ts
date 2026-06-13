/**
 * Smart paste: when a single URL is pasted over a non-empty text selection,
 * wrap it as a markdown link `[selection](url)` instead of replacing the text.
 *
 * Returns the replacement string, or null to fall back to the browser's
 * default paste (no selection, or the clipboard isn't a bare URL).
 */
export function linkifyPastedUrl(pasted: string, selected: string): string | null {
  if (!selected) return null;
  const url = pasted.trim();
  // A single http(s) token with no internal whitespace.
  if (/\s/.test(url)) return null;
  if (!/^https?:\/\/\S+$/i.test(url)) return null;
  return `[${selected}](${url})`;
}
