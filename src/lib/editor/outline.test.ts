import { describe, it, expect } from 'vitest';
import { parseOutline } from './outline';

describe('parseOutline', () => {
  it('returns nothing for heading-free content', () => {
    expect(parseOutline('just a paragraph\n\nand another')).toEqual([]);
  });

  it('captures level, text, and line-start offset', () => {
    const md = '# Title\n\nintro\n\n## Section';
    expect(parseOutline(md)).toEqual([
      { level: 1, text: 'Title', offset: 0 },
      { level: 2, text: 'Section', offset: md.indexOf('## Section') },
    ]);
  });

  it('ignores headings inside fenced code blocks', () => {
    const md = '# Real\n\n```\n# fake heading in code\n```\n\n## Also real';
    const out = parseOutline(md);
    expect(out.map((o) => o.text)).toEqual(['Real', 'Also real']);
  });

  it('handles tilde fences too', () => {
    const md = '~~~\n### not a heading\n~~~\n# yes';
    expect(parseOutline(md).map((o) => o.text)).toEqual(['yes']);
  });

  it('requires a space after the hashes', () => {
    expect(parseOutline('#nospace')).toEqual([]);
    expect(parseOutline('# spaced')).toHaveLength(1);
  });

  it('strips an optional closing hash sequence', () => {
    expect(parseOutline('## Heading ##')[0].text).toBe('Heading');
  });

  it('allows up to three leading spaces', () => {
    expect(parseOutline('   ## indented')[0]).toMatchObject({ level: 2, text: 'indented' });
  });
});
