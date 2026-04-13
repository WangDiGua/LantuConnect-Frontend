import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const CANDIDATES = [
  path.join(ROOT, 'node_modules', 'vite', 'node_modules', 'esbuild', 'lib', 'main.js'),
  path.join(ROOT, 'node_modules', 'esbuild', 'lib', 'main.js'),
];

function patchFile(filePath) {
  if (!existsSync(filePath)) return false;

  const original = readFileSync(filePath, 'utf8');
  if (original.includes('runWorkerThreadServiceSync')) return false;

  const marker = 'var build = (options) => ensureServiceIsRunning().build(options);';
  if (!original.includes(marker)) return false;

  const replacement = `var runWorkerThreadServiceSync = (method, args) => {
  if (!worker_threads || isInternalWorkerThread) return null;
  if (!workerThreadService) workerThreadService = startWorkerThreadService(worker_threads);
  return workerThreadService[method](...args);
};
var build = async (options) => {
  let result = runWorkerThreadServiceSync("buildSync", [options]);
  if (result !== null) return result;
  return ensureServiceIsRunning().build(options);
};`;

  const patched = original
    .replace(
      'var build = (options) => ensureServiceIsRunning().build(options);',
      replacement,
    )
    .replace(
      'var transform = (input, options) => ensureServiceIsRunning().transform(input, options);',
      `var transform = async (input, options) => {
  let result = runWorkerThreadServiceSync("transformSync", [input, options]);
  if (result !== null) return result;
  return ensureServiceIsRunning().transform(input, options);
};`,
    )
    .replace(
      'var formatMessages = (messages, options) => ensureServiceIsRunning().formatMessages(messages, options);',
      `var formatMessages = async (messages, options) => {
  let result = runWorkerThreadServiceSync("formatMessagesSync", [messages, options]);
  if (result !== null) return result;
  return ensureServiceIsRunning().formatMessages(messages, options);
};`,
    )
    .replace(
      'var analyzeMetafile = (messages, options) => ensureServiceIsRunning().analyzeMetafile(messages, options);',
      `var analyzeMetafile = async (messages, options) => {
  let result = runWorkerThreadServiceSync("analyzeMetafileSync", [messages, options]);
  if (result !== null) return result;
  return ensureServiceIsRunning().analyzeMetafile(messages, options);
};`,
    );

  if (patched === original) return false;
  writeFileSync(filePath, patched, 'utf8');
  return true;
}

let patchedCount = 0;
for (const filePath of CANDIDATES) {
  if (patchFile(filePath)) patchedCount += 1;
}

if (patchedCount > 0) {
  console.log(`[patch-esbuild-worker-thread] patched ${patchedCount} file(s)`);
} else {
  console.log('[patch-esbuild-worker-thread] no esbuild file patched');
}
