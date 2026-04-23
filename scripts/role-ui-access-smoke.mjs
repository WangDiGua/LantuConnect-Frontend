import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('monitoring alert center gates platform-admin-only operations in the UI', () => {
  const src = read('src/views/monitoring/AlertCenterPage.tsx');

  assert.match(src, /useUserRole\(\)/);
  assert.match(src, /canManagePlatformOperations\(platformRole\)/);
  assert.match(src, /hidden:\s*!canManagePlatformOperations\(platformRole\)/);
  assert.match(src, /tab === 'rules' && canManagePlatformOperations\(platformRole\)/);
});

test('health governance hides platform health operations from non platform admins', () => {
  const src = read('src/views/monitoring/HealthGovernancePage.tsx');

  assert.match(src, /useUserRole\(\)/);
  assert.match(src, /canManagePlatformOperations\(platformRole\)/);
  assert.match(src, /\{canManagePlatformOperations\(platformRole\) \? \(/);
  assert.match(src, /footer=\{canManagePlatformOperations\(platformRole\) \? \(/);
});

test('resource center lifecycle health actions are platform-admin-only', () => {
  const src = read('src/views/resourceCenter/ResourceCenterManagementPage.tsx');

  assert.match(src, /canManagePlatformOperations\(platformRole\)/);
  assert.match(src, /\{canManagePlatformOperations\(platformRole\) \? \(/);
});
