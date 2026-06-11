'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';

interface MarkdownPreviewProps {
  content: string;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center px-3 sm:px-4 py-2 border-b bg-muted/40">
        <span className="text-sm font-medium text-muted-foreground">
          Preview
        </span>
      </div>
      <div id="md-preview-scroll" className="flex-1 overflow-auto p-4 sm:p-6 scrollbar-thin">
        {/* Same voice as the reading view: serif body, measure capped at ~42rem. */}
        <article
          id="markdown-preview-content"
          className="prose prose-sm sm:prose-base dark:prose-invert mx-auto max-w-2xl prose-headings:font-semibold prose-h1:text-2xl sm:prose-h1:text-3xl prose-h2:text-xl sm:prose-h2:text-2xl prose-h3:text-lg sm:prose-h3:text-xl prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-code:before:content-none prose-code:after:content-none"
          style={{ fontFamily: 'var(--font-serif), Georgia, serif' }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;

                if (isInline) {
                  return (
                    <code
                      className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono text-foreground"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }

                return (
                  <SyntaxHighlighter
                    style={isDark ? oneDark : oneLight}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-lg my-4! text-sm"
                    customStyle={{
                      margin: 0,
                      borderRadius: '0.5rem',
                    }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                );
              },
              table({ children }) {
                return (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border-collapse border border-border">
                      {children}
                    </table>
                  </div>
                );
              },
              th({ children }) {
                return (
                  <th className="border border-border px-4 py-2 bg-muted text-left font-semibold">
                    {children}
                  </th>
                );
              },
              td({ children }) {
                return (
                  <td className="border border-border px-4 py-2">{children}</td>
                );
              },
              blockquote({ children }) {
                return (
                  <blockquote className="border-l-4 border-primary/60 pl-4 my-4 italic text-muted-foreground">
                    {children}
                  </blockquote>
                );
              },
              a({ href, children }) {
                return (
                  <a
                    href={href}
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                );
              },
              input({ checked, ...props }) {
                return (
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="mr-2 accent-brand"
                    {...props}
                  />
                );
              },
            }}
          >
            {content || '# Preview\n\nStart typing markdown to see the preview here...'}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
