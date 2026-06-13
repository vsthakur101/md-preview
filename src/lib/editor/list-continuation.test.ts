import { describe, it, expect } from 'vitest';
import { listItemAction } from './list-continuation';

describe('listItemAction', () => {
  it('returns null for non-list lines', () => {
    expect(listItemAction('just a paragraph')).toBeNull();
    expect(listItemAction('')).toBeNull();
    expect(listItemAction('# Heading')).toBeNull();
  });

  it('continues unordered bullets, preserving marker and indent', () => {
    expect(listItemAction('- item')).toEqual({ type: 'continue', insert: '\n- ' });
    expect(listItemAction('  * nested')).toEqual({ type: 'continue', insert: '\n  * ' });
    expect(listItemAction('+ plus')).toEqual({ type: 'continue', insert: '\n+ ' });
  });

  it('increments ordered list numbers', () => {
    expect(listItemAction('1. first')).toEqual({ type: 'continue', insert: '\n2. ' });
    expect(listItemAction('  9. nested')).toEqual({ type: 'continue', insert: '\n  10. ' });
  });

  it('continues task items with a fresh unchecked box', () => {
    expect(listItemAction('- [ ] todo')).toEqual({ type: 'continue', insert: '\n- [ ] ' });
    expect(listItemAction('- [x] done')).toEqual({ type: 'continue', insert: '\n- [ ] ' });
  });

  it('continues blockquotes', () => {
    expect(listItemAction('> quoted')).toEqual({ type: 'continue', insert: '\n> ' });
  });

  it('exits the list on an empty item', () => {
    expect(listItemAction('- ')).toEqual({ type: 'exit' });
    expect(listItemAction('1. ')).toEqual({ type: 'exit' });
    expect(listItemAction('- [ ] ')).toEqual({ type: 'exit' });
    expect(listItemAction('> ')).toEqual({ type: 'exit' });
    expect(listItemAction('  - ')).toEqual({ type: 'exit' });
  });
});
