import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export function checkLinks(root = projectRoot) {
  const errors = [];
  const visit = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (['.git', 'node_modules', '__pycache__'].includes(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name.endsWith('.html')) {
        for (const match of readFileSync(file, 'utf8').matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
          const ref = match[1];
          if (ref.startsWith('#') || /^(https?:|mailto:|data:)/.test(ref)) continue;
          const target = new URL(ref, pathToFileURL(file));
          const local = fileURLToPath(target);
          const relative = path.relative(root, local);
          if (ref.startsWith('/') || ref.startsWith('file:') || relative.startsWith('..') || path.isAbsolute(relative)) {
            errors.push(`${path.relative(root, file)}: referência não portátil: ${ref}`);
          } else if (!existsSync(local)) errors.push(`${path.relative(root, file)}: não encontrado: ${ref}`);
        }
      }
    }
  };
  visit(root);
  const config = createRequire(import.meta.url)(path.join(root, 'atlas.config.js'));
  for (const module of config.modules) {
    if (!existsSync(path.join(root, module.path))) errors.push(`Menu: módulo ausente: ${module.path}`);
    for (const shared of module.shared) {
      if (!existsSync(path.join(root, 'shared', shared))) errors.push(`Módulo ${module.id}: shared/${shared} ausente`);
    }
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkLinks();
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Referências HTML, recursos compartilhados e menu: OK.');
}
