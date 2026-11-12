import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { afterEach, expect, it } from 'vitest';

const script = join(process.cwd(), 'scripts/extension-build.mjs');
const tempRoots: string[] = [];
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'backtrack-package-'));
  tempRoots.push(root);
  const manifest = {
    manifest_version: 3,
    name: 'Backtrack',
    version: '0.1.1',
    background: { service_worker: 'background.js' },
    action: { default_popup: 'popup.html' },
    content_scripts: [
      {
        matches: ['https://chatgpt.com/*'],
        js: ['content-scripts/chatgpt.js'],
      },
    ],
    web_accessible_resources: [
      {
        resources: ['content-scripts/chatgpt.css'],
        matches: ['https://chatgpt.com/*'],
      },
    ],
  };
  const files: Record<string, string> = {
    'manifest.json': JSON.stringify(manifest),
    'background.js': 'void 0;',
    'popup.html': '<script src="chunks/popup-test.js"></script>',
    'chunks/popup-test.js': 'void 0;',
    'content-scripts/chatgpt.js': 'void 0;',
    'content-scripts/chatgpt.css': 'body {}',
  };
  function write(path: string, text: string) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  for (const [path, text] of Object.entries(files)) write(path, text);
  write('package.json', JSON.stringify({ version: '0.1.1' }));
  function inventory() {
    write(
      'scripts/extension-files.json',
      JSON.stringify({
        schemaVersion: 1,
        files: Object.fromEntries(
          Object.entries(files).map(([p, t]) => [p, hash(t)]),
        ),
      }),
    );
  }
  inventory();
  return { root, files, write, inventory };
}
const run = (mode: string, root: string) =>
  execFileSync(process.execPath, [script, mode, root], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
afterEach(() => {
  for (const root of tempRoots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

it('validates a complete root manifest and all of its runtime assets', () => {
  const { root } = fixture();
  expect(run('check', root)).toContain('6 verified extension files');
});
it('reports a missing root manifest before Chrome is asked to load it', () => {
  const { root } = fixture();
  rmSync(join(root, 'manifest.json'));
  expect(() => run('check', root)).toThrow('manifest.json is missing');
});
it('rejects a manifest reference omitted from the build inventory', () => {
  const f = fixture();
  const manifest = JSON.parse(f.files['manifest.json']!);
  manifest.icons = { '16': 'icon/16.png' };
  f.files['manifest.json'] = JSON.stringify(manifest);
  f.write('manifest.json', f.files['manifest.json']);
  f.inventory();
  expect(() => run('check', f.root)).toThrow('unpackaged file: icon/16.png');
});
it('detects corrupted or stale generated JavaScript', () => {
  const f = fixture();
  f.write('background.js', 'changed');
  expect(() => run('check', f.root)).toThrow(
    'changed or is stale: background.js',
  );
});
it('rejects paths outside the runtime files rather than touching source files', () => {
  const f = fixture();
  f.files['../outside.js'] = 'bad';
  f.inventory();
  expect(() => run('check', f.root)).toThrow(
    'Invalid generated extension path',
  );
});
it('stages the complete build and removes an obsolete hashed chunk', () => {
  const f = fixture();
  for (const [p, t] of Object.entries(f.files))
    f.write('.output/chrome-mv3/' + p, t);
  f.write(
    '.output/chrome-mv3/popup.html',
    '<script src="chunks/popup-new.js"></script>',
  );
  f.write('.output/chrome-mv3/chunks/popup-new.js', 'new bundle');
  rmSync(join(f.root, '.output/chrome-mv3/chunks/popup-test.js'));
  expect(run('stage', f.root)).toContain('Ready to load');
  expect(existsSync(join(f.root, 'chunks/popup-test.js'))).toBe(false);
  expect(readFileSync(join(f.root, 'chunks/popup-new.js'), 'utf8')).toBe(
    'new bundle',
  );
});
