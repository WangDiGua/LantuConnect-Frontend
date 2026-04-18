import assert from 'node:assert/strict';
import test from 'node:test';

import type { UsageStatsData } from '../../types/dto/dashboard';
import { buildUsageStatsOverviewModel } from './usageStatsOverviewModel.ts';

const sampleData: UsageStatsData = {
  range: '7d',
  totalCalls: 420,
  activeUsers: 37,
  points: [
    { date: '2026-04-12', calls: 120, users: 12 },
    { date: '2026-04-13', calls: 90, users: 9 },
    { date: '2026-04-14', calls: 210, users: 16 },
  ],
  callsByResourceType: [
    { type: 'mcp', calls: 300, successRate: 95 },
    { type: 'agent', calls: 120, successRate: 80 },
  ],
  departmentUsage: [
    { department: 'Platform', calls: 240, users: 19 },
  ],
  ownerUsage: [
    { ownerName: 'Alice', calls: 180, successRate: 96, resourceCount: 4 },
  ],
  topResources: [
    { name: 'Bazi MCP', calls: 120, successRate: 99, resourceType: 'mcp' },
  ],
};

test('buildUsageStatsOverviewModel derives headline metrics and chart summary', () => {
  const model = buildUsageStatsOverviewModel(sampleData);

  assert.equal(model.latestCalls, 210);
  assert.equal(model.totalCalls, 420);
  assert.equal(model.activeUsers, 37);
  assert.equal(model.averageDailyCalls, 140);
  assert.equal(model.peakPoint?.date, '2026-04-14');
  assert.equal(model.peakPoint?.calls, 210);
  assert.equal(model.leadingResourceType?.type, 'mcp');
  assert.equal(model.overallSuccessRate, 90.7);
});

test('buildUsageStatsOverviewModel computes sorted resource shares and daily ranking', () => {
  const model = buildUsageStatsOverviewModel(sampleData);

  assert.equal(model.resourceTypeBreakdown.length, 2);
  assert.equal(model.resourceTypeBreakdown[0]?.type, 'mcp');
  assert.equal(model.resourceTypeBreakdown[0]?.share, 71.4);
  assert.equal(model.resourceTypeBreakdown[1]?.type, 'agent');
  assert.equal(model.resourceTypeBreakdown[1]?.share, 28.6);

  assert.equal(model.dailyRanking.length, 3);
  assert.equal(model.dailyRanking[0]?.date, '2026-04-14');
  assert.equal(model.dailyRanking[1]?.date, '2026-04-12');
  assert.equal(model.dailyRanking[2]?.date, '2026-04-13');
});
