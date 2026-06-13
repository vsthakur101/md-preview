import { describe, it, expect } from 'vitest';
import { linkifyPastedUrl } from './smart-paste';

describe('linkifyPastedUrl', () => {
  it('wraps a selection when a bare URL is pasted', () => {
    expect(linkifyPastedUrl('https://example.com', 'docs')).toBe('[docs](https://example.com)');
    expect(linkifyPastedUrl('http://a.io/x?y=1', 'link')).toBe('[link](http://a.io/x?y=1)');
  });

  it('trims surrounding whitespace on the pasted URL', () => {
    expect(linkifyPastedUrl('  https://example.com\n', 'text')).toBe('[text](https://example.com)');
  });

  it('returns null without a selection', () => {
    expect(linkifyPastedUrl('https://example.com', '')).toBeNull();
  });

  it('returns null when the clipboard is not a bare URL', () => {
    expect(linkifyPastedUrl('not a url', 'sel')).toBeNull();
    expect(linkifyPastedUrl('see https://example.com', 'sel')).toBeNull(); // multi-token
    expect(linkifyPastedUrl('ftp://example.com', 'sel')).toBeNull(); // unsupported scheme
    expect(linkifyPastedUrl('example.com', 'sel')).toBeNull(); // no scheme
  });
});
