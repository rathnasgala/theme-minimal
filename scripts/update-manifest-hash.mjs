import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const manifestUrl = new URL('gala-theme.json', root);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
const cssPath = manifest?.css?.path;
if (typeof cssPath !== 'string' || !cssPath.endsWith('.css') || cssPath.startsWith('/')
    || cssPath.includes('\\')
    || !cssPath.split('/').every((part) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(part))) {
  throw new Error('Refusing to hash an unsafe css.path');
}
const cssUrl = new URL(cssPath, root);
const cssBytes = await readFile(cssUrl);
manifest.css.sha256 = createHash('sha256').update(cssBytes).digest('hex');
await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Updated ${fileURLToPath(manifestUrl)} with ${manifest.css.sha256}`);
