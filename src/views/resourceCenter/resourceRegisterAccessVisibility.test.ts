import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldShowAgentAccessSection } from './resourceRegisterAccessVisibility.ts';

test('shouldShowAgentAccessSection only returns true for published agent resources', () => {
  assert.equal(shouldShowAgentAccessSection({ resourceId: undefined, status: 'published' }), false);
  assert.equal(shouldShowAgentAccessSection({ resourceId: 42, status: 'draft' }), false);
  assert.equal(shouldShowAgentAccessSection({ resourceId: 42, status: 'pending_review' }), false);
  assert.equal(shouldShowAgentAccessSection({ resourceId: 42, status: 'published' }), true);
});
