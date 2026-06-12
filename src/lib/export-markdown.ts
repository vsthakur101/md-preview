/**
 * Client-side .md export: reassembles frontmatter (title + tags) over the
 * stored body — the inverse of the import flow's parseFrontmatter.
 */

export function buildMarkdownExport(title: string, tags: string[], content: string): string {
  const fm = [`---`, `title: "${title.replace(/"/g, '\\"')}"`];
  if (tags.length > 0) fm.push(`tags: [${tags.join(', ')}]`);
  fm.push('---', '', '');
  return fm.join('\n') + content;
}

const safeFileName = (title: string) =>
  (title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'untitled') + '.md';

export function downloadMarkdown(title: string, tags: string[], content: string): void {
  const blob = new Blob([buildMarkdownExport(title, tags, content)], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFileName(title);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
