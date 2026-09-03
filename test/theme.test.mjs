import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { appendFile, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { verifyTheme } from '../scripts/verify.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const execute = promisify(execFile);

test('ships the immutable Minimal release contract', async () => {
  const { manifest, cssBytes } = await verifyTheme();
  const packageJson = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));

  assert.equal(manifest.id, 'minimal');
  assert.equal(manifest.version, '1.0.0');
  assert.equal(manifest.framework.minimumVersion, '2.0.32');
  assert.equal(manifest.framework.maximumVersionExclusive, '3.0.0');
  assert.equal(packageJson.name, '@rathnasgala/theme-minimal');
  assert.equal(packageJson.version, manifest.version);
  assert.equal(packageJson.license, 'MIT');
  assert.ok(cssBytes <= 32 * 1024);
});

test('rejects stylesheet bytes changed after manifest generation', async () => {
  await withFixture(async (fixture) => {
    await appendFile(path.join(fixture, 'theme.css'), '\nbody { outline: 1px solid red; }\n');
    await assert.rejects(() => verifyTheme(fixture), /does not match its declared SHA-256/);
  });
});

test('rejects external stylesheet resources', async () => {
  await withFixture(async (fixture) => {
    await appendFile(path.join(fixture, 'theme.css'), '\nbody { background: url(https://example.com/x.png); }\n');
    await assert.rejects(() => verifyTheme(fixture), /may not load resources/);
  });
});

test('rejects undeclared manifest fields', async () => {
  await withFixture(async (fixture) => {
    const manifestPath = path.join(fixture, 'gala-theme.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.repository = 'untrusted';
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await assert.rejects(() => verifyTheme(fixture), /manifest fields are invalid/);
  });
});

test('regenerates the immutable digest after an intentional CSS edit', async () => {
  await withFixture(async (fixture) => {
    await appendFile(path.join(fixture, 'theme.css'), '\nbody { text-underline-offset: 0.2em; }\n');
    await execute(process.execPath, [path.join(fixture, 'scripts', 'update-manifest-hash.mjs')]);
    await assert.doesNotReject(() => verifyTheme(fixture));
  });
});

async function withFixture(assertions) {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'gala-minimal-'));
  const fixture = path.join(temporaryDirectory, 'theme-minimal');
  try {
    await mkdir(fixture);
    await mkdir(path.join(fixture, 'scripts'));
    await copyFile(path.join(ROOT, 'gala-theme.json'), path.join(fixture, 'gala-theme.json'));
    await copyFile(path.join(ROOT, 'theme.css'), path.join(fixture, 'theme.css'));
    await copyFile(path.join(ROOT, 'scripts', 'update-manifest-hash.mjs'),
      path.join(fixture, 'scripts', 'update-manifest-hash.mjs'));
    await assertions(fixture);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
