import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from './frontmatter';

describe('parseFrontmatter', () => {
  it('returns input untouched when there is no frontmatter', () => {
    const md = '# Hello\n\nBody text.';
    expect(parseFrontmatter(md)).toEqual({ tags: [], body: md });
  });

  it('parses title and inline-array tags, stripping the block', () => {
    const md = '---\ntitle: "My Post"\ntags: [Reading, deep-work]\n---\n\n# Hello\n';
    const out = parseFrontmatter(md);
    expect(out.title).toBe('My Post');
    expect(out.tags).toEqual(['Reading', 'deep-work']);
    expect(out.body).toBe('# Hello\n');
  });

  it('parses comma-list and block-list tags', () => {
    expect(parseFrontmatter('---\ntags: a, b\n---\nx').tags).toEqual(['a', 'b']);
    expect(parseFrontmatter('---\ntags:\n  - a\n  - b\n---\nx').tags).toEqual(['a', 'b']);
  });

  it('treats an unclosed block as plain content', () => {
    const md = '---\ntitle: nope\n\n# Hello';
    expect(parseFrontmatter(md)).toEqual({ tags: [], body: md });
  });

  it('ignores unknown keys', () => {
    const out = parseFrontmatter('---\ndate: 2026-01-01\ntitle: T\n---\nbody');
    expect(out.title).toBe('T');
    expect(out.body).toBe('body');
  });
});
