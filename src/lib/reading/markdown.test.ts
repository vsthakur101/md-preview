import { describe, it, expect } from 'vitest';
import { renderArticle } from './markdown';

describe('renderArticle', () => {
  it('collects h2/h3 headings with slug ids and per-section reading time', async () => {
    const md = [
      '# Title',
      '',
      'Intro paragraph with several words to count here.',
      '',
      '## First Section',
      '',
      'Some body content for the first section.',
      '',
      '### A Subsection',
      '',
      'More content nested under the section.',
    ].join('\n');

    const r = await renderArticle(md);

    expect(r.headings.map((h) => h.id)).toEqual(['first-section', 'a-subsection']);
    expect(r.headings[0].depth).toBe(2);
    expect(r.headings[1].depth).toBe(3);
    expect(r.html).toContain('id="first-section"');
    expect(r.headings[0].minutes).toBeGreaterThanOrEqual(1);
    expect(r.minutes).toBeGreaterThanOrEqual(1);
    expect(r.words).toBeGreaterThan(10);
  });

  it('renders :::key as a callout card and :::aside as a collapsed <details>', async () => {
    const md = [':::key', 'An important takeaway.', ':::', '', ':::aside', 'A deep dive detail.', ':::'].join('\n');
    const r = await renderArticle(md);

    expect(r.html).toContain('key-callout');
    expect(r.html).toContain('Key takeaway');
    expect(r.html).toContain('<details');
    expect(r.html).toContain('aside-block');
    expect(r.html).toContain('<summary');
  });

  it('promotes a short standalone blockquote to a pull-quote', async () => {
    const r = await renderArticle('> A short, punchy standalone line.');
    expect(r.html).toContain('pullquote');
  });

  it('highlights fenced code via Shiki (rehype-pretty-code)', async () => {
    const md = '```js\nconst x = 1;\n```';
    const r = await renderArticle(md);
    // rehype-pretty-code emits data-theme + tokenized spans with inline color vars.
    expect(r.html).toContain('data-rehype-pretty-code-figure');
    expect(r.html).toContain('--shiki-light');
  });
});
