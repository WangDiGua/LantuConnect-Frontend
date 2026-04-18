import assert from 'node:assert/strict';
import test from 'node:test';

import type { DataReportsData } from '../../types/dto/dashboard.ts';
import { buildDataReportsWorkbenchModel } from './dataReportsWorkbenchModel.ts';

const sampleData: DataReportsData = {
  range: '30d',
  callsByResourceType: [
    { type: 'mcp', calls: 3724, successRate: 94.4 },
    { type: 'agent', calls: 9, successRate: 100 },
  ],
  topResources: [
    { name: 'worryzyy', calls: 1234, successRate: 94.1, resourceType: 'mcp' },
    { name: 'modelcontextprotocol', calls: 1198, successRate: 94.8, resourceType: 'mcp' },
    { name: 'jtcsm_agent', calls: 9, successRate: 100, resourceType: 'agent' },
  ],
  topAgents: [
    { name: 'jtcsm_agent', calls: 9, successRate: 100, resourceType: 'agent' },
  ],
  topSkills: [],
  topMcps: [
    { name: 'worryzyy', calls: 1234, successRate: 94.1, resourceType: 'mcp' },
  ],
  topApps: [],
  topDatasets: [],
  methodBreakdown: [
    { path: 'POST /invoke', requests: 3733, avgLatencyMs: 393.17 },
    { path: 'POST /resolve', requests: 18, avgLatencyMs: 112.6 },
  ],
  departmentUsage: [
    { department: 'Platform', calls: 2400, users: 2 },
    { department: 'Product', calls: 1333, users: 1 },
  ],
};

test('buildDataReportsWorkbenchModel derives workbench summary and type structure', () => {
  const model = buildDataReportsWorkbenchModel(sampleData);

  assert.equal(model.totalCalls, 3733);
  assert.equal(model.weightedSuccessRate, 94.4);
  assert.equal(model.activeTypeCount, 2);
  assert.equal(model.activeUsers, 3);
  assert.equal(model.departmentCount, 2);
  assert.equal(model.leadingType?.type, 'mcp');
  assert.equal(model.leadingType?.share, 99.8);
  assert.equal(model.structureRows[0]?.label, 'MCP');
  assert.equal(model.structureRows[1]?.label.includes('智能'), true);
});

test('buildDataReportsWorkbenchModel ranks resources and methods for the workspace', () => {
  const model = buildDataReportsWorkbenchModel(sampleData);

  assert.equal(model.topLeaderboard.length, 3);
  assert.equal(model.topLeaderboard[0]?.rank, 1);
  assert.equal(model.topLeaderboard[0]?.width, 100);
  assert.equal(model.topLeaderboard[1]?.width, 97.1);
  assert.equal(model.topLeaderboard[2]?.width, 0.7);

  assert.equal(model.methodRows.length, 2);
  assert.equal(model.methodRows[0]?.path, 'POST /invoke');
  assert.equal(model.methodRows[0]?.requestShare, 100);
  assert.equal(model.departmentRows[0]?.share, 64.3);
  assert.equal(model.collectionSections[0]?.title.includes('智能'), true);
});
