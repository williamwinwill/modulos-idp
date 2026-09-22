import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, renameSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { exportModule } from '../tools/export-module.mjs';
import { checkLinks, projectRoot } from '../tools/check-links.mjs';

const require = createRequire(import.meta.url);
const config = require('../atlas.config.js');
for (const module of config.modules) {
  test(`${module.id}: exportação pode mudar de pasta sem depender dos outros módulos`, () => {
    const temp = mkdtempSync(path.join(tmpdir(), 'atlas-portability-'));
    try {
      const original = path.join(temp, 'exportado');
      exportModule(module.id, original);
      const moved = path.join(temp, 'outro projeto com espaços');
      renameSync(original, moved);
      assert.deepEqual(checkLinks(moved), []);
      const exported = require(path.join(moved, 'atlas.config.js'));
      assert.deepEqual(exported.modules.map(item => item.id), [module.id]);
      for (const sibling of config.modules.filter(item => item.id !== module.id)) {
        assert.equal(existsSync(path.join(moved, 'modules', sibling.id)), false);
      }
      const core = path.join(moved, 'modules', module.id, 'core.js');
      if (existsSync(core)) assert.ok(Object.keys(require(core)).length > 0);
      const before = readFileSync(path.join(moved, 'index.html'), 'utf8');
      assert.throws(() => exportModule(module.id, moved), /já existe/);
      assert.equal(readFileSync(path.join(moved, 'index.html'), 'utf8'), before);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
}
test('exportação rejeita módulo desconhecido e destino dentro da origem', () => {
  assert.throws(() => exportModule('unknown', '/unused'), /Módulo inválido/);
  assert.throws(() => exportModule(config.modules[0].id, path.join(projectRoot, 'forbidden-export')), /fora da pasta/);
});
