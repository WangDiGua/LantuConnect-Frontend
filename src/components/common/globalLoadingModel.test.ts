import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGlobalLoadingPalette,
  GLOBAL_LOADING_SWEEP_RINGS,
} from './globalLoadingModel.ts';

test('buildGlobalLoadingPalette returns distinct dark and light palettes', () => {
  const dark = buildGlobalLoadingPalette('dark');
  const light = buildGlobalLoadingPalette('light');

  assert.equal(dark.surface, '#0d0b12');
  assert.equal(light.surface, '#f4f2ee');
  assert.notEqual(dark.label, light.label);
  assert.match(dark.halo, /rgba\(99, 102, 241, 0\.16\)/);
});

test('GLOBAL_LOADING_SWEEP_RINGS defines two brand-specific sweep rings', () => {
  assert.equal(GLOBAL_LOADING_SWEEP_RINGS.length, 2);
  assert.deepEqual(
    GLOBAL_LOADING_SWEEP_RINGS.map((ring) => ring.rotate),
    [-18, 18],
  );
  assert.deepEqual(
    GLOBAL_LOADING_SWEEP_RINGS.map((ring) => ring.duration),
    [4.8, 6.2],
  );
  assert.deepEqual(
    GLOBAL_LOADING_SWEEP_RINGS.map((ring) => ring.dashArray),
    ['92 104', '68 128'],
  );
});
