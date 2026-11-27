// Fails if built CSS inlines fonts as data: URIs or points at Google font hosts.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'assets');
let files;
try {
  files = readdirSync(dir);
} catch {
  console.error(`FAIL: ${dir} not found. Run npm run build first.`);
  process.exit(1);
}

const problems = [];
const rules = [
  [/data:font/i, 'data:font URI'],
  [/url\(\s*["']?data:[^)]*(woff2?|ttf|otf)/i, 'url(data:...) with font type'],
  [/fonts\.googleapis\.com/i, 'fonts.googleapis.com'],
  [/fonts\.gstatic\.com/i, 'fonts.gstatic.com'],
];

const cssFiles = files.filter((f) => f.endsWith('.css'));
for (const f of cssFiles) {
  const text = readFileSync(join(dir, f), 'utf8');
  for (const [re, label] of rules) {
    if (re.test(text)) problems.push(`${f}: contains ${label}`);
  }
}

const woff2 = files.filter((f) => f.endsWith('.woff2')).length;
if (woff2 === 0) problems.push('no .woff2 file in dist/assets');

if (problems.length) {
  for (const p of problems) console.error(`FAIL: ${p}`);
  process.exit(1);
}
console.log(`PASS: fonts self-hosted, ${woff2} woff2 files, ${cssFiles.length} css files clean`);
