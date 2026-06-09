import { describe, it, expect } from 'vitest';
import {
  fileInputSchema,
  buildPreview,
  MAX_CONTENT_BYTES,
  MAX_TITLE_LENGTH,
} from './validation';

describe('fileInputSchema', () => {
  it('accepts valid input and trims the title', () => {
    const result = fileInputSchema.safeParse({ title: '  Hello  ', content: 'body' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Hello');
    }
  });

  it('rejects an empty title', () => {
    expect(fileInputSchema.safeParse({ title: '   ', content: 'body' }).success).toBe(false);
  });

  it('rejects empty content', () => {
    expect(fileInputSchema.safeParse({ title: 'ok', content: '' }).success).toBe(false);
  });

  it('rejects a title over the length cap', () => {
    const title = 'a'.repeat(MAX_TITLE_LENGTH + 1);
    expect(fileInputSchema.safeParse({ title, content: 'body' }).success).toBe(false);
  });

  it('rejects content over the size cap', () => {
    const content = 'a'.repeat(MAX_CONTENT_BYTES + 1);
    expect(fileInputSchema.safeParse({ title: 'ok', content }).success).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(fileInputSchema.safeParse({}).success).toBe(false);
  });
});

describe('buildPreview', () => {
  it('strips markdown punctuation and collapses whitespace', () => {
    expect(buildPreview('# Title\n\n**bold** text')).toBe('Title bold text');
  });

  it('truncates long content and appends an ellipsis', () => {
    const preview = buildPreview('x'.repeat(300));
    expect(preview.endsWith('...')).toBe(true);
    expect(preview.length).toBe(153); // 150 chars + '...'
  });

  it('does not append an ellipsis for short content', () => {
    expect(buildPreview('short')).toBe('short');
  });
});
