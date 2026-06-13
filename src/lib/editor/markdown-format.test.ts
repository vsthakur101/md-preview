import { describe, it, expect } from 'vitest';
import { toggleWrap, setHeadingLevel, applyHeadingAtCursor } from './markdown-format';

describe('toggleWrap', () => {
  it('wraps a selection', () => {
    // "abc" with "b" selected (1..2)
    const r = toggleWrap('abc', 1, 2, '**');
    expect(r.text).toBe('a**b**c');
    expect(r.text.slice(r.selStart, r.selEnd)).toBe('b');
  });

  it('unwraps when markers are inside the selection', () => {
    // select "**b**" in "a**b**c" (1..6)
    const r = toggleWrap('a**b**c', 1, 6, '**');
    expect(r.text).toBe('abc');
    expect(r.text.slice(r.selStart, r.selEnd)).toBe('b');
  });

  it('unwraps when markers immediately surround the selection', () => {
    // select inner "b" in "a**b**c" (3..4)
    const r = toggleWrap('a**b**c', 3, 4, '**');
    expect(r.text).toBe('abc');
    expect(r.text.slice(r.selStart, r.selEnd)).toBe('b');
  });

  it('inserts an empty pair with the cursor inside when nothing is selected', () => {
    const r = toggleWrap('ac', 1, 1, '**');
    expect(r.text).toBe('a****c');
    expect(r.selStart).toBe(3);
    expect(r.selEnd).toBe(3);
  });

  it('works with single-char markers (italic, code)', () => {
    expect(toggleWrap('abc', 1, 2, '*').text).toBe('a*b*c');
    expect(toggleWrap('a*b*c', 2, 3, '*').text).toBe('abc');
    expect(toggleWrap('abc', 1, 2, '`').text).toBe('a`b`c');
  });
});

describe('setHeadingLevel', () => {
  it('adds a heading prefix to a plain line', () => {
    expect(setHeadingLevel('Title', 1)).toBe('# Title');
    expect(setHeadingLevel('Title', 2)).toBe('## Title');
  });

  it('replaces an existing heading level instead of stacking', () => {
    expect(setHeadingLevel('# Title', 2)).toBe('## Title');
    expect(setHeadingLevel('### Title', 1)).toBe('# Title');
  });

  it('toggles off when applying the same level', () => {
    expect(setHeadingLevel('## Title', 2)).toBe('Title');
  });
});

describe('applyHeadingAtCursor', () => {
  it('operates on the line containing the cursor', () => {
    const value = 'first\nsecond\nthird';
    const cursor = 8; // inside "second"
    const r = applyHeadingAtCursor(value, cursor, 2);
    expect(r.text).toBe('first\n## second\nthird');
  });
});
