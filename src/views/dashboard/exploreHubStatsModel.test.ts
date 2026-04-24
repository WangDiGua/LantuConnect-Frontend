import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildExploreHubTrendView,
  normalizeExploreHubTrendMap,
} from './exploreHubStatsModel.ts';

test('buildExploreHubTrendView describes up, flat, and down changes from yesterday', () => {
  assert.deepEqual(
    buildExploreHubTrendView({ today: 5, yesterday: 2, delta: 3, direction: 'up' }, '个'),
    { text: '较昨日新增 3个', value: '+3个', tone: 'up' },
  );

  assert.deepEqual(
    buildExploreHubTrendView({ today: 2, yesterday: 2, delta: 0, direction: 'flat' }, '次'),
    { text: '较昨日持平', value: '0', tone: 'flat' },
  );

  assert.deepEqual(
    buildExploreHubTrendView({ today: 1, yesterday: 4, delta: -3, direction: 'down' }, '人'),
    { text: '较昨日下降 3人', value: '-3人', tone: 'down' },
  );
});

test('normalizeExploreHubTrendMap accepts backend trend payloads and derives missing direction', () => {
  const trends = normalizeExploreHubTrendMap({
    agent: { today: 4, yesterday: 1, basis: 'daily_new' },
    calls: { today: 8, yesterday: 10, delta: -2 },
  });

  assert.equal(trends.agent?.delta, 3);
  assert.equal(trends.agent?.direction, 'up');
  assert.equal(trends.agent?.basis, 'daily_new');
  assert.equal(trends.calls?.delta, -2);
  assert.equal(trends.calls?.direction, 'down');
});
