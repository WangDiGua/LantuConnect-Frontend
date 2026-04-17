import assert from 'node:assert/strict';
import test from 'node:test';

import { detectMojibakeInLine } from './lib/mojibake-detector.mjs';

test('detectMojibakeInLine catches corrupted Chinese UI copy', () => {
  assert.equal(detectMojibakeInLine("e.recordCount = '璁板綍鏁颁笉鑳藉皬浜?0';"), true);
  assert.equal(detectMojibakeInLine("hint: 'OpenAI 鍏煎接口'"), true);
});

test('detectMojibakeInLine ignores valid nullish-coalescing code and normal Chinese', () => {
  assert.equal(detectMojibakeInLine('const value = raw ?? fallback;'), false);
  assert.equal(detectMojibakeInLine("const label = '请填写服务地址';"), false);
});
