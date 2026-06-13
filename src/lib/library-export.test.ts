import { describe, it, expect } from 'vitest';
import { buildLibraryExport, LIBRARY_EXPORT_VERSION } from './library-export';

const NOW = new Date('2026-06-13T12:00:00.000Z');

describe('buildLibraryExport', () => {
  it('stamps version, timestamp, and count', () => {
    const out = buildLibraryExport([], NOW);
    expect(out).toEqual({
      version: LIBRARY_EXPORT_VERSION,
      exportedAt: '2026-06-13T12:00:00.000Z',
      count: 0,
      files: [],
    });
  });

  it('keeps only portable fields and defaults missing tags to []', () => {
    const out = buildLibraryExport(
      [
        // extra fields should be dropped
        { title: 'A', content: '# A', createdAt: '2026-01-01T00:00:00.000Z', id: 'x' } as never,
      ],
      NOW
    );
    expect(out.files[0]).toEqual({
      title: 'A',
      content: '# A',
      tags: [],
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('orders files newest-first by createdAt', () => {
    const out = buildLibraryExport(
      [
        { title: 'old', content: '', createdAt: '2026-01-01T00:00:00.000Z' },
        { title: 'new', content: '', createdAt: '2026-03-01T00:00:00.000Z' },
        { title: 'mid', content: '', createdAt: '2026-02-01T00:00:00.000Z' },
      ],
      NOW
    );
    expect(out.files.map((f) => f.title)).toEqual(['new', 'mid', 'old']);
    expect(out.count).toBe(3);
  });
});
