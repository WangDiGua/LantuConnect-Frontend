import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCapabilityWorkbenchInitialState,
  createCapabilityWorkbenchToolState,
} from './capabilityWorkbenchState.ts';

test('createCapabilityWorkbenchInitialState returns a clean workbench state for a resource', () => {
  const state = createCapabilityWorkbenchInitialState({ input: 'hello', locale: 'zh-CN' });

  assert.equal(state.payloadText, '{\n  "input": "hello",\n  "locale": "zh-CN"\n}');
  assert.equal(state.toolArgsText, '{\n  "input": "hello"\n}');
  assert.equal(state.selectedTool, '');
  assert.equal(state.resolveOutput, '');
  assert.equal(state.invokeOutput, '');
  assert.equal(state.toolOutput, '');
  assert.deepEqual(state.warnings, []);
  assert.deepEqual(state.tools, []);
  assert.equal(state.loadingAction, null);
  assert.equal(state.advancedOpen, false);
});

test('createCapabilityWorkbenchToolState always selects the first tool from the current resource', () => {
  const toolState = createCapabilityWorkbenchToolState(
    [
      { name: 'weather.search', description: 'Search weather' },
      { name: 'weather.forecast', description: 'Forecast weather' },
    ],
    ['tool list loaded'],
  );

  assert.equal(toolState.selectedTool, 'weather.search');
  assert.deepEqual(toolState.warnings, ['tool list loaded']);
  assert.deepEqual(toolState.tools, [
    { name: 'weather.search', description: 'Search weather' },
    { name: 'weather.forecast', description: 'Forecast weather' },
  ]);
});

test('createCapabilityWorkbenchToolState clears stale selection when the next resource has no tools', () => {
  const toolState = createCapabilityWorkbenchToolState([], []);

  assert.equal(toolState.selectedTool, '');
  assert.deepEqual(toolState.tools, []);
  assert.deepEqual(toolState.warnings, []);
});
