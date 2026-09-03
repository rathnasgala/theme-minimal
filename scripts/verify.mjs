import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ROOT_FIELDS = ['schemaVersion', 'id', 'version', 'name', 'description', 'framework', 'css'];
const FRAMEWORK_FIELDS = ['minimumVersion', 'maximumVersionExclusive'];
const CSS_FIELDS = ['path', 'sha256'];

export async function verifyTheme(root = ROOT) {
  const manifest = JSON.parse(await readFile(path.join(root, 'gala-theme.json'), 'utf8'));
  exactFields(manifest, ROOT_FIELDS, 'manifest');
  exactFields(manifest.framework, FRAMEWORK_FIELDS, 'framework');
  exactFields(manifest.css, CSS_FIELDS, 'css');
  requireValue(manifest.schemaVersion === 1, 'schemaVersion must be 1');
  requireValue(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.id), 'id must be a lowercase slug');
  requireValue(path.basename(root) === `theme-${manifest.id}`, 'repository directory must match the theme id');
  requireValue(/^\d+\.\d+\.\d+$/.test(manifest.version), 'version must be stable semantic version syntax');
  requireValue(manifest.name.length > 0 && manifest.name.length <= 120, 'name is invalid');
  requireValue(manifest.description.length > 0 && manifest.description.length <= 500, 'description is invalid');
  requireValue(/^\d+\.\d+\.\d+$/.test(manifest.framework.minimumVersion), 'minimumVersion is invalid');
  requireValue(/^\d+\.\d+\.\d+$/.test(manifest.framework.maximumVersionExclusive), 'maximumVersionExclusive is invalid');
  requireValue(compareVersions(manifest.framework.minimumVersion, manifest.framework.maximumVersionExclusive) < 0,
    'framework compatibility range is empty');
  requireValue(safeCssPath(manifest.css.path), 'css.path is unsafe');
  requireValue(/^[0-9a-f]{64}$/.test(manifest.css.sha256), 'css.sha256 is invalid');

  const cssBytes = await readFile(path.join(root, manifest.css.path));
  requireValue(cssBytes.length > 0 && cssBytes.length <= 32 * 1024, 'theme CSS exceeds its byte limit');
  const css = new TextDecoder('utf-8', { fatal: true }).decode(cssBytes);
  requireValue(!/@import/i.test(css), 'theme CSS may not import stylesheets');
  requireValue(!/url\s*\(/i.test(css), 'theme CSS may not load resources');
  requireValue(!/!important/i.test(css), 'theme CSS may not bypass managed precedence with !important');
  requireValue(/@media\s+print\b/i.test(css), 'theme CSS must define print behavior');
  const digest = createHash('sha256').update(cssBytes).digest('hex');
  requireValue(digest === manifest.css.sha256, 'theme CSS does not match its declared SHA-256');
  verifyContrast(css);
  return { manifest, cssBytes: cssBytes.length, digest };
}

function verifyContrast(css) {
  for (const mode of ['light', 'dark']) {
    const colors = declarations(css, `:root[data-mode='${mode}']`);
    const pairs = [
      ['text', '--gala-color-text', '--gala-color-background', 4.5],
      ['muted text', '--gala-color-muted', '--gala-color-background', 4.5],
      ['link', '--gala-color-accent', '--gala-color-background', 4.5],
      ['surface text', '--gala-color-text', '--gala-color-surface', 4.5],
      ['surface muted text', '--gala-color-muted', '--gala-color-surface', 4.5],
      ['surface link', '--gala-color-accent', '--gala-color-surface', 4.5],
      ['control border', '--gala-color-border', '--gala-color-background', 3]
    ];
    for (const [label, foreground, background, minimum] of pairs) {
      const ratio = contrast(hex(colors.get(foreground)), hex(colors.get(background)));
      requireValue(ratio >= minimum, `${mode} ${label} contrast ${ratio.toFixed(2)} is below ${minimum}`);
    }
  }
}

function declarations(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^{}]*)\\}`));
  requireValue(match, `missing ${selector} declarations`);
  const values = new Map();
  for (const declaration of match[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    values.set(declaration[1], declaration[2].trim());
  }
  return values;
}

function hex(value) {
  const colors = String(value ?? '').match(/#[0-9a-f]{6}\b/gi);
  requireValue(colors?.length, `expected a six-digit color in ${value}`);
  return colors.at(-1);
}

function contrast(left, right) {
  const high = Math.max(luminance(left), luminance(right));
  const low = Math.min(luminance(left), luminance(right));
  return (high + 0.05) / (low + 0.05);
}

function luminance(value) {
  const channels = value.slice(1).match(/../g).map((part) => Number.parseInt(part, 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function safeCssPath(value) {
  return typeof value === 'string' && value.length <= 200 && value.endsWith('.css')
    && !value.startsWith('/') && !value.includes('\\')
    && value.split('/').every((part) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(part));
}

function compareVersions(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function exactFields(value, expected, label) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  requireValue(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()),
    `${label} fields are invalid`);
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await verifyTheme();
  console.log(`Verified ${result.manifest.name} ${result.manifest.version}: ${result.cssBytes} bytes, ${result.digest}`);
}
