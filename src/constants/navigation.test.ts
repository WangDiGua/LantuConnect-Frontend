import assert from 'node:assert/strict';
import test from 'node:test';

import { getNavSubGroups } from './navigation.ts';
import { buildHubPersonalNavModel } from './topNavPolicy.ts';

test('admin developer center exposes the same concrete child pages as the route matrix', () => {
  const itemIds = getNavSubGroups('developer-portal', true)
    .flatMap((group) => group.items)
    .map((item) => item.id);

  assert.deepEqual(itemIds, ['developer-docs', 'developer-tools', 'developer-statistics']);
});

test('user developer center declares docs, gateway tools, and permission-filtered statistics', () => {
  const itemIds = getNavSubGroups('developer-portal', false)
    .flatMap((group) => group.items)
    .map((item) => item.id);

  assert.deepEqual(itemIds, ['developer-docs', 'developer-tools', 'developer-statistics']);
});

test('buildHubPersonalNavModel attaches submenu badge counts by item id', () => {
  const groups = getNavSubGroups('workspace', false).filter((group) => group.title === '入驻服务');
  const sections = buildHubPersonalNavModel('workspace', 'user', groups, {
    'developer-onboarding': 1,
    'developer-applications': 7,
  });

  assert.deepEqual(
    sections.flatMap((section) => section.rows.map((row) => [row.subItemId, row.badgeCount])),
    [
      ['developer-onboarding', 1],
      ['developer-applications', 7],
    ],
  );
});
