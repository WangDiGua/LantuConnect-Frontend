/**
 * 将 Vditor 静态资源复制到 public/vditor，供 options.cdn 同源加载（匹配生产 CSP script/style 仅 self）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules', 'vditor', 'dist');
const dest = path.join(root, 'public', 'vditor', 'dist');

if (!fs.existsSync(src)) {
  console.warn('[copy-vditor-public] skip: node_modules/vditor/dist not found');
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log('[copy-vditor-public] copied to public/vditor/dist');
