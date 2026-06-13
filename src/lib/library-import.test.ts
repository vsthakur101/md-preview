import { describe, it, expect } from 'vitest';
import { parseLibraryImport } from './library-import';
import { buildLibraryExport } from './library-export';

describe('parseLibraryImport', () => {
  it('rejects non-JSON', () => {
    expect(parseLibraryImport('not json')).toEqual({ ok: false, error: 'not valid JSON' });
  });

  it('rejects documents without a files array', () => {
    expect(parseLibraryImport('{"foo":1}')).toEqual({ ok: false, error: 'not a library backup' });
    expect(parseLibraryImport('[]')).toEqual({ ok: false, error: 'not a library backup' });
  });

  it('round-trips an export produced by buildLibraryExport', () => {
    const exported = buildLibraryExport(
      [
        { title: 'A', content: '# A', tags: ['x'], createdAt: '2026-01-01T00:00:00.000Z' },
        { title: 'B', content: 'body', tags: [], createdAt: '2026-02-01T00:00:00.000Z' },
      ],
      new Date('2026-06-13T00:00:00.000Z')
    );
    const parsed = parseLibraryImport(JSON.stringify(exported));
    expect(parsed).toEqual({
      ok: true,
      skipped: 0,
      entries: [
        { title: 'B', content: 'body', tags: [] },
        { title: 'A', content: '# A', tags: ['x'] },
      ],
    });
  });

  it('skips malformed entries but keeps valid ones', () => {
    const json = JSON.stringify({
      files: [
        { title: 'good', content: 'body' },
        { title: '', content: 'no title' },
        { title: 'no content', content: '   ' },
        { content: 'missing title' },
        { title: 'tags filtered', content: 'x', tags: ['a', 2, null, 'b'] },
      ],
    });
    const parsed = parseLibraryImport(json);
    expect(parsed).toEqual({
      ok: true,
      skipped: 3,
      entries: [
        { title: 'good', content: 'body', tags: [] },
        { title: 'tags filtered', content: 'x', tags: ['a', 'b'] },
      ],
    });
  });
});
