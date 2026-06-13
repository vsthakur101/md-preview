import { describe, it, expect } from 'vitest';
import { aggregateTagInsights } from './insights';

describe('aggregateTagInsights', () => {
  it('returns nothing for no files', () => {
    expect(aggregateTagInsights([])).toEqual([]);
  });

  it('counts articles per tag across files', () => {
    const out = aggregateTagInsights([
      { tags: ['ai', 'dev'], minutes: 10, fraction: 0 },
      { tags: ['ai'], minutes: 10, fraction: 0 },
    ]);
    expect(out.find((t) => t.tag === 'ai')?.total).toBe(2);
    expect(out.find((t) => t.tag === 'dev')?.total).toBe(1);
  });

  it('counts finished articles at the 97% threshold', () => {
    const out = aggregateTagInsights([
      { tags: ['x'], minutes: 10, fraction: 0.97 },
      { tags: ['x'], minutes: 10, fraction: 0.5 },
      { tags: ['x'], minutes: 10, fraction: 1 },
    ]);
    expect(out[0]).toMatchObject({ tag: 'x', total: 3, finished: 2 });
  });

  it('weights minutes read by progress fraction', () => {
    const out = aggregateTagInsights([
      { tags: ['x'], minutes: 20, fraction: 0.5 }, // 10
      { tags: ['x'], minutes: 8, fraction: 1 }, // 8
    ]);
    expect(out[0].minutesRead).toBe(18);
  });

  it('sorts by total desc, then alphabetically', () => {
    const out = aggregateTagInsights([
      { tags: ['b'], minutes: 1, fraction: 0 },
      { tags: ['a'], minutes: 1, fraction: 0 },
      { tags: ['c', 'a'], minutes: 1, fraction: 0 },
    ]);
    expect(out.map((t) => t.tag)).toEqual(['a', 'b', 'c']);
  });
});
