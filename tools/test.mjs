import { readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { checkLinks, projectRoot } from './check-links.mjs';

const errors = checkLinks();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const files = [];
function visit(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (/\.test\.(cjs|mjs)$/.test(entry.name)) files.push(file);
  }
}
for (const directory of ['modules', 'shared', 'tests']) visit(path.join(projectRoot, directory));
const result = spawnSync(process.execPath, ['--test', ...files.sort()], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
