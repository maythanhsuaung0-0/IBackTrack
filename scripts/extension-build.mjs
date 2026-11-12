import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const projectRoot = process.argv[3]
  ? resolve(process.argv[3])
  : fileURLToPath(new URL('..', import.meta.url));
const inventoryPath = join(projectRoot, 'scripts/extension-files.json');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));

function runtimePath(path) {
  if (
    typeof path !== 'string' ||
    isAbsolute(path) ||
    path.includes('..') ||
    path.includes('\\')
  ) {
    throw new Error(`Invalid generated extension path: ${path}`);
  }
  return /^(manifest\.json|background\.js|popup\.html|content-scripts\/[^/]+\.(js|css)|chunks\/[^/]+\.js|icon\/\d+\.png|assets\/popup-[^/]+\.css)$/.test(
    path,
  );
}

function filesIn(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const relative = prefix + entry.name;
      if (entry.isDirectory())
        return filesIn(join(directory, entry.name), relative + '/');
      if (!entry.isFile())
        throw new Error(`Unexpected build entry: ${relative}`);
      return [relative];
    })
    .sort();
}

function check() {
  const manifestPath = join(projectRoot, 'manifest.json');
  if (!existsSync(manifestPath))
    throw new Error(
      'manifest.json is missing. Run npm run build, then select the repository folder in Chrome.',
    );
  const manifest = json(manifestPath);
  const inventory = json(inventoryPath);
  const pkg = json(join(projectRoot, 'package.json'));
  if (manifest.manifest_version !== 3 || manifest.version !== pkg.version)
    throw new Error(
      'The extension manifest is invalid or its version is stale. Run npm run build.',
    );
  if (
    inventory.schemaVersion !== 1 ||
    !inventory.files ||
    typeof inventory.files !== 'object'
  )
    throw new Error('Invalid extension build inventory.');
  for (const [path, hash] of Object.entries(inventory.files)) {
    if (!runtimePath(path))
      throw new Error(`Unexpected generated extension path: ${path}`);
    const target = join(projectRoot, path);
    if (!existsSync(target) || !statSync(target).isFile())
      throw new Error(`Missing extension file: ${path}`);
    if (digest(readFileSync(target)) !== hash)
      throw new Error(
        `Extension file changed or is stale: ${path}. Run npm run build.`,
      );
  }
  const resources = [
    manifest.background?.service_worker,
    manifest.action?.default_popup,
    ...Object.values(manifest.icons ?? {}),
    ...(manifest.content_scripts ?? []).flatMap((script) => [
      ...(script.js ?? []),
      ...(script.css ?? []),
    ]),
    ...(manifest.web_accessible_resources ?? []).flatMap(
      (entry) => entry.resources ?? [],
    ),
  ].filter(Boolean);
  const popup = manifest.action?.default_popup;
  if (popup) {
    const html = readFileSync(join(projectRoot, popup), 'utf8');
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const reference = match[1];
      if (/^(?:https?:|data:)/.test(reference)) continue;
      resources.push(reference.replace(/^\.\//, '').replace(/^\//, ''));
    }
  }
  for (const path of ['manifest.json', ...resources]) {
    if (!runtimePath(path) || !inventory.files[path])
      throw new Error(
        `Manifest or popup references an unpackaged file: ${path}`,
      );
  }
  console.log(
    `Ready to load: ${projectRoot} (${Object.keys(inventory.files).length} verified extension files).`,
  );
}

function stage() {
  const output = join(projectRoot, '.output/chrome-mv3');
  const files = filesIn(output);
  const hashes = {};
  const previous = existsSync(inventoryPath) ? json(inventoryPath).files : {};
  for (const path of files) {
    if (!runtimePath(path))
      throw new Error(
        `Refusing to overwrite a non-runtime source path: ${path}`,
      );
    hashes[path] = digest(readFileSync(join(output, path)));
  }
  // Remove only obsolete generated assets, never source files or directories.
  for (const path of Object.keys(previous ?? {})) {
    if (!runtimePath(path))
      throw new Error(`Unexpected previous build path: ${path}`);
    if (!hashes[path]) rmSync(join(projectRoot, path), { force: true });
  }
  for (const path of files) {
    const target = join(projectRoot, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(output, path), target);
  }
  mkdirSync(dirname(inventoryPath), { recursive: true });
  writeFileSync(
    inventoryPath,
    JSON.stringify({ schemaVersion: 1, files: hashes }, null, 2) + '\n',
  );
  check();
}

try {
  if (process.argv[2] === 'stage') stage();
  else if (process.argv[2] === 'check') check();
  else throw new Error('Usage: node scripts/extension-build.mjs stage|check');
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Could not prepare the extension.',
  );
  process.exitCode = 1;
}
