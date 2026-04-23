import assert from 'node:assert/strict';
import test from 'node:test';

import type { PlatformRoleCode } from '../types/dto/auth.ts';
import {
  canAccessDeveloperPortal,
  canManagePlatformOperations,
} from './platformRoleAccess.ts';

test('platform admin can access developer center even when server permissions are stale', () => {
  assert.equal(canAccessDeveloperPortal('platform_admin', () => false), true);
});

test('developer center access still honors developer portal permission for non platform admins', () => {
  assert.equal(canAccessDeveloperPortal('developer', (perm) => perm === 'developer:portal'), true);
  assert.equal(canAccessDeveloperPortal('reviewer', () => false), false);
  assert.equal(canAccessDeveloperPortal('user', () => false), false);
});

test('platform operation controls are only available to platform admins', () => {
  const roles: PlatformRoleCode[] = ['platform_admin', 'reviewer', 'developer', 'user', 'unassigned'];

  assert.deepEqual(
    roles.map((role) => [role, canManagePlatformOperations(role)]),
    [
      ['platform_admin', true],
      ['reviewer', false],
      ['developer', false],
      ['user', false],
      ['unassigned', false],
    ],
  );
});
