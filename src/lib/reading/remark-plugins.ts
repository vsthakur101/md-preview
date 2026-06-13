/* eslint-disable @typescript-eslint/no-explicit-any */
import { visit } from 'unist-util-visit';
import { toString as mdToString } from 'mdast-util-to-string';

/**
 * Remark transforms shared by the server reader pipeline (markdown.ts) and the
 * client editor preview (MarkdownPreview) — kept dependency-light so importing
 * them client-side doesn't drag shiki/rehype-pretty-code into the bundle.
 */

export const PULLQUOTE_MAX_CHARS = 170;

/**
 * remark plugin: turn `:::key` and `:::aside` container directives into the
 * elements the reader styles. `:::aside` becomes a native, collapsed `<details>`
 * so it works with zero client JS.
 */
export function remarkReadingDirectives() {
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
export function remarkPullquotes() {
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
