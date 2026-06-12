/* eslint-disable @typescript-eslint/no-explicit-any */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypePrettyCode, { type Options as PrettyCodeOptions } from 'rehype-pretty-code';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { toString as mdToString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';

const WORDS_PER_MINUTE = 230;
const PULLQUOTE_MAX_CHARS = 170;

export interface ArticleHeading {
  id: string;
  text: string;
  depth: number;
  /** Estimated minutes to read this section. */
  minutes: number;
}

export interface RenderedArticle {
  html: string;
  headings: ArticleHeading[];
  words: number;
  minutes: number;
}

const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);
const toMinutes = (words: number) => Math.max(1, Math.round(words / WORDS_PER_MINUTE));

/**
 * remark plugin: turn `:::key` and `:::aside` container directives into the
 * elements the reader styles. `:::aside` becomes a native, collapsed `<details>`
 * so it works with zero client JS.
 */
function remarkReadingDirectives() {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (node.type !== 'containerDirective') return;
      const data = node.data || (node.data = {});

      if (node.name === 'key') {
        data.hName = 'div';
        data.hProperties = { className: ['key-callout'] };
        node.children.unshift({
          type: 'paragraph',
          data: { hName: 'div', hProperties: { className: ['key-callout-label'] } },
          children: [{ type: 'text', value: node.attributes?.label || 'Key takeaway' }],
        });
      } else if (node.name === 'aside') {
        data.hName = 'details';
        data.hProperties = { className: ['aside-block'] };
        node.children.unshift({
          type: 'paragraph',
          data: { hName: 'summary', hProperties: { className: ['aside-summary'] } },
          children: [{ type: 'text', value: node.attributes?.label || 'Deep dive' }],
        });
      }
    });
  };
}

/** remark plugin: flag short, standalone blockquotes as pull-quotes. */
function remarkPullquotes() {
  return (tree: any) => {
    visit(tree, 'blockquote', (node: any) => {
      const text = mdToString(node);
      if (text.length > 0 && text.length <= PULLQUOTE_MAX_CHARS && node.children.length === 1) {
        const data = node.data || (node.data = {});
        data.hProperties = { ...(data.hProperties || {}), className: ['pullquote'] };
      }
    });
  };
}

/**
 * remark plugin: assign slug ids to h2/h3 (matching the rendered DOM), and
 * collect headings with per-section word counts for the TOC. Mutates the passed
 * `collector` so the caller gets a single source of truth for ids + reading time.
 */
function remarkCollectHeadings(collector: { headings: any[]; words: number }) {
  return (tree: any) => {
    const slugger = new GithubSlugger();
    let current: any = null;
    for (const node of tree.children as any[]) {
      const text = mdToString(node);
      collector.words += countWords(text);

      if (node.type === 'heading' && (node.depth === 2 || node.depth === 3)) {
        const id = slugger.slug(text) || `section-${collector.headings.length + 1}`;
        node.data = node.data || {};
        node.data.hProperties = { ...(node.data.hProperties || {}), id };
        // Hover-revealed anchor; the reader intercepts clicks to copy the deep
        // link. The "#" glyph is CSS-drawn so it stays out of textContent (TTS).
        node.children.push({
          type: 'link',
          url: `#${id}`,
          data: {
            hProperties: { className: ['heading-anchor'], ariaLabel: 'Copy link to section' },
          },
          children: [],
        });
        current = { id, text, depth: node.depth, words: 0 };
        collector.headings.push(current);
      } else if (current) {
        current.words += countWords(text);
      }
    }
  };
}

const prettyCodeOptions: PrettyCodeOptions = {
  theme: { light: 'github-light', dark: 'github-dark' },
  keepBackground: false,
};

/** Render user markdown to server-side HTML plus TOC + reading stats. */
export async function renderArticle(markdown: string): Promise<RenderedArticle> {
  const collector: { headings: any[]; words: number } = { headings: [], words: 0 };

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkReadingDirectives)
    .use(remarkPullquotes)
    .use(remarkCollectHeadings, collector)
    .use(remarkRehype)
    .use(rehypePrettyCode, prettyCodeOptions)
    .use(rehypeStringify)
    .process(markdown);

  return {
    html: String(file),
    headings: collector.headings.map((h) => ({
      id: h.id,
      text: h.text,
      depth: h.depth,
      minutes: toMinutes(h.words),
    })),
    words: collector.words,
    minutes: toMinutes(collector.words),
  };
}
