import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeUserUsageStats } from './userActivityStatsNormalizer.ts';

test('normalizeUserUsageStats reads period counters from backend counters payload', () => {
  const stats = normalizeUserUsageStats({
    counters: {
      todayCalls: 2,
      weekCalls: 9,
      monthCalls: 21,
      totalUsageRecords: 70,
      favoriteCount: 5,
      byTargetType: [
        { targetType: 'agent', cnt: 4 },
        { targetType: 'mcp', cnt: 0 },
      ],
    },
    trends: {
      last7Days: [
        { day: '2026-04-18', cnt: 12 },
        { day: '2026-04-19', cnt: 1 },
      ],
    },
  });

  assert.equal(stats.todayCalls, 2);
  assert.equal(stats.weekCalls, 9);
  assert.equal(stats.monthCalls, 21);
  assert.equal(stats.totalCalls, 70);
  assert.equal(stats.favoriteCount, 5);
  assert.deepEqual(stats.byTargetType, [{ type: 'agent', calls: 4 }]);
  assert.deepEqual(stats.recentDays, [
    { date: '2026-04-18', calls: 12 },
    { date: '2026-04-19', calls: 1 },
  ]);
});
