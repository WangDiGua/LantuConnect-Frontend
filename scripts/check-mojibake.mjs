import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listMojibakeHits } from './lib/mojibake-detector.mjs';

const root = process.cwd();
const siblingBackend = path.resolve(root, '..', 'LantuConnect-Backend');
const currentScriptPath = fileURLToPath(import.meta.url);
const ignoredFiles = new Set([
  currentScriptPath,
  path.resolve(root, 'scripts', 'check-mojibake.test.mjs'),
  path.resolve(root, 'scripts', 'lib', 'mojibake-detector.mjs'),
]);

const scanRoots = [root, siblingBackend];
const textExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.java',
  '.xml',
  '.yml',
  '.yaml',
  '.properties',
  '.sql',
  '.txt',
  '.mjs',
  '.cjs',
  '.gradle',
  '.kts',
]);

const ignoredDirs = new Set(['node_modules', 'dist', 'target', '.git', '.playwright-artifacts']);

function shouldSkip(filePath) {
  return filePath.split(/[\\/]+/).some((part) => ignoredDirs.has(part));
}

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walk(fullPath, onFile);
      }
      continue;
    }
    if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase()) && !shouldSkip(fullPath)) {
      onFile(fullPath);
    }
  }
}

const hits = [];

for (const scanRoot of scanRoots) {
  if (!fs.existsSync(scanRoot)) {
    continue;
  }
  walk(scanRoot, (filePath) => {
    if (ignoredFiles.has(filePath)) {
      return;
    }
    const text = fs.readFileSync(filePath, 'utf8');
    for (const hit of listMojibakeHits(text)) {
      hits.push(`${filePath}:${hit.lineNumber}: ${hit.line.trim()}`);
    }
  });
}

if (hits.length > 0) {
  console.error('Detected suspicious mojibake candidates:');
  for (const hit of hits) {
    console.error(hit);
  }
  process.exit(1);
}

console.log('No mojibake candidates detected.');
