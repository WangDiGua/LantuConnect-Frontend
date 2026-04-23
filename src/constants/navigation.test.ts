import assert from 'node:assert/strict';
import test from 'node:test';

import { getNavSubGroups } from './navigation.ts';

test('admin developer center exposes the same concrete child pages as the route matrix', () => {
  const itemIds = getNavSubGroups('developer-portal', true)
    .flatMap((group) => group.items)
    .map((item) => item.id);

  assert.deepEqual(itemIds, ['developer-docs', 'developer-tools', 'developer-statistics']);
});
