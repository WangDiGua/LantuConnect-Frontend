import assert from 'node:assert/strict';
import test from 'node:test';

import type { RealtimeServerMessage } from './realtimePush.ts';
import {
  getRealtimeUiSignal,
  isExplicitRealtimeUiSignal,
  matchesRealtimeUiSignal,
} from './realtimeUiSignal.ts';

test('getRealtimeUiSignal classifies realtime pushes for UI policy', () => {
  const cases: Array<[RealtimeServerMessage, ReturnType<typeof getRealtimeUiSignal>]> = [
    [
      { type: 'alert', action: 'firing', payload: { ruleName: 'CPU 过高' } },
      { category: 'critical_alert' },
    ],
    [
      { type: 'audit', action: 'pending_changed', payload: { pendingCount: 4 } },
      { category: 'audit_sync' },
    ],
    [
      { type: 'health', action: 'config_updated', payload: { resourceCode: 'weather-skill' } },
      {
        category: 'health_config_sync',
        resourceType: undefined,
        resourceId: undefined,
        resourceCode: 'weather-skill',
      },
    ],
    [
      {
        type: 'circuit',
        action: 'state_changed',
        payload: { resourceType: 'mcp', resourceId: 42, resourceCode: 'supabase-community' },
      },
      {
        category: 'health_runtime_sync',
        resourceType: 'mcp',
        resourceId: '42',
        resourceCode: 'supabase-community',
      },
    ],
    [
      {
        type: 'health',
        action: 'probe_status_changed',
        payload: { resource_type: 'agent', resource_id: '7', resource_code: 'campus-assistant' },
      },
      {
        category: 'health_runtime_sync',
        resourceType: 'agent',
        resourceId: '7',
        resourceCode: 'campus-assistant',
      },
    ],
    [
      { type: 'monitoring', action: 'kpi_digest', payload: { summary: '监控指标已更新' } },
      { category: 'monitoring_sync' },
    ],
    [
      {
        type: 'notification',
        notification: { type: 'resource_submitted' },
      },
      {
        category: 'workflow_notification_sync',
        notificationType: 'resource_submitted',
        resourceType: undefined,
        resourceId: undefined,
        resourceCode: undefined,
      },
    ],
    [
      {
        type: 'notification',
        notification: {
          type: 'platform_resource_force_deprecated',
          resourceType: 'mcp',
          resourceId: '42',
          resourceCode: 'supabase-community',
        },
      },
      {
        category: 'workflow_notification_sync',
        notificationType: 'platform_resource_force_deprecated',
        resourceType: 'mcp',
        resourceId: '42',
        resourceCode: 'supabase-community',
      },
    ],
  ];

  for (const [msg, expected] of cases) {
    assert.deepEqual(getRealtimeUiSignal(msg), expected);
  }
});

test('isExplicitRealtimeUiSignal only keeps critical alerts as visible interruptions', () => {
  assert.equal(isExplicitRealtimeUiSignal({ category: 'critical_alert' }), true);
  assert.equal(isExplicitRealtimeUiSignal({ category: 'audit_sync' }), false);
  assert.equal(isExplicitRealtimeUiSignal({ category: 'health_runtime_sync' }), false);
  assert.equal(isExplicitRealtimeUiSignal({ category: 'health_config_sync' }), false);
  assert.equal(isExplicitRealtimeUiSignal({ category: 'monitoring_sync' }), false);
  assert.equal(isExplicitRealtimeUiSignal({ category: 'workflow_notification_sync' }), false);
});

test('matchesRealtimeUiSignal filters by category and workflow notification type', () => {
  const workflowSignal = {
    category: 'workflow_notification_sync' as const,
    notificationType: 'resource_published',
  };
  const runtimeSignal = {
    category: 'health_runtime_sync' as const,
    resourceType: 'mcp',
    resourceId: '8',
    resourceCode: 'how-to-cook',
  };

  assert.equal(
    matchesRealtimeUiSignal(workflowSignal, {
      categories: ['workflow_notification_sync'],
      notificationTypes: ['resource_published'],
    }),
    true,
  );
  assert.equal(
    matchesRealtimeUiSignal(workflowSignal, {
      categories: ['workflow_notification_sync'],
      notificationTypes: ['audit_rejected'],
    }),
    false,
  );
  assert.equal(
    matchesRealtimeUiSignal(runtimeSignal, {
      categories: ['health_runtime_sync'],
      resourceType: 'mcp',
      resourceId: '8',
    }),
    true,
  );
  assert.equal(
    matchesRealtimeUiSignal(runtimeSignal, {
      categories: ['health_runtime_sync'],
      resourceType: 'agent',
    }),
    false,
  );
  assert.equal(
    matchesRealtimeUiSignal(
      {
        category: 'workflow_notification_sync',
        notificationType: 'resource_version_switched',
        resourceType: 'mcp',
        resourceId: '8',
      },
      {
        categories: ['workflow_notification_sync'],
        notificationTypes: ['resource_version_switched'],
        resourceType: 'mcp',
        resourceId: '8',
      },
    ),
    true,
  );
});
