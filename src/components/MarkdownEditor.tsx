'use client';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const PLACEHOLDER = `# Welcome to Markdown Preview

Start typing your markdown here or upload a .md file above.

## Features

- **Bold** and *italic* text
- Lists and checkboxes
- Code blocks with syntax highlighting
- Tables and more!

### Code Example

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

### Table Example

| Name | Age | City |
|------|-----|------|
| John | 30  | NYC  |
| Jane | 25  | LA   |

### Checkbox Example

- [x] Upload markdown file
- [x] Live preview
- [ ] Export to PDF

> This is a blockquote. It can span multiple lines.

---

Happy writing!
`;

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Markdown
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-500">
          {value.length} chars
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={PLACEHOLDER}
        className="
          flex-1 w-full p-4 resize-none
          bg-white dark:bg-gray-950
          text-gray-900 dark:text-gray-100
          font-mono text-sm leading-relaxed
          placeholder:text-gray-400 dark:placeholder:text-gray-600
          focus:outline-none
          scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700
        "
        spellCheck={false}
      />
    </div>
  );
}
