import { cpSync, existsSync, mkdirSync, realpathSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { projectRoot, checkLinks } from './check-links.mjs';

export function exportModule(id, destination) {
  const config = createRequire(import.meta.url)(path.join(projectRoot, 'atlas.config.js'));
  const selected = config.modules.find(module => module.id === id);
  if (!selected) throw new Error(`Módulo inválido. Disponíveis: ${config.modules.map(module => module.id).join(', ')}`);
  if (!destination) throw new Error('Informe a pasta de destino.');
  const target = path.resolve(destination);
  if (existsSync(target)) throw new Error('O destino já existe. Escolha uma pasta nova.');
  // Resolve parent symlinks before checking; do not export into the source tree.
  const parent = realpathSync(path.dirname(target));
  const actual = path.join(parent, path.basename(target));
  const relative = path.relative(realpathSync(projectRoot), actual);
  if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Escolha um destino fora da pasta do projeto de origem.');
  }
  mkdirSync(target);
  try {
    const copy = relative => cpSync(path.join(projectRoot, relative), path.join(target, relative), {
      recursive: true,
      filter: source => !['__pycache__', 'saida-demo', '.DS_Store', 'backlog-server.mjs', 'backlog.mjs'].includes(path.basename(source)) && !source.endsWith('.pyc')
    });
    copy(`modules/${selected.id}`);
    for (const shared of selected.shared) copy(`shared/${shared}`);
    for (const file of ['index.html', 'package.json', '.gitignore', 'tools', 'tests']) copy(file);
    const packageInfo = JSON.parse(readFileSync(path.join(target, 'package.json'), 'utf8'));
    delete packageInfo.scripts.backlog;
    writeFileSync(path.join(target, 'package.json'), JSON.stringify(packageInfo, null, 2) + '\n');
    writeFileSync(path.join(target, 'atlas.config.js'),
      `(function(root){const config=${JSON.stringify({ modules: [selected] }, null, 2)};if(typeof module==='object'&&module.exports)module.exports=config;else root.AtlasPlatform=config;})(globalThis);\n`);
    writeFileSync(path.join(target, 'README.md'), `# ${selected.title} — módulo independente\n\nAbra \`index.html\` no navegador, ou sirva esta pasta com \`python3 -m http.server 8765\`. Não exige npm install ou build.\n\nCopie esta pasta inteira para transportar o módulo, preservando \`modules/\`, \`shared/\` e \`atlas.config.js\`. O menu contém somente o módulo exportado.\n\nDocumentação: [modules/${selected.id}/README.md](modules/${selected.id}/README.md).\n\nVerificação (Node.js 18+): \`node tools/test.mjs\`.\n\nConfigurações e snapshots salvos no navegador não fazem parte deste pacote. Exporte os JSONs pela interface antes de mudar de origem. Tokens não são incluídos.\n`);
    const errors = checkLinks(target);
    if (errors.length) throw new Error(errors.join('\n'));
  } catch (error) {
    rmSync(target, { recursive: true, force: true });
    throw error;
  }
  return target;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(`Módulo exportado: ${exportModule(process.argv[2], process.argv[3])}`);
  } catch (error) {
    console.error(`${error.message}\nUso: node tools/export-module.mjs <agents|repositories|backstage> <pasta-nova>`);
    process.exitCode = 1;
  }
}
