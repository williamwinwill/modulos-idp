const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../core.js');

test('origin tag alone is not current ownership', () => {
  assert.equal(core.classifyOwnership([{ layer: 'Origin', controller: 'Atlas', confirmed: true }]), 'Unknown');
});

test('confirmed Atlas and delivery claims classify a hybrid workload', () => {
  assert.equal(core.classifyOwnership([
    { layer: 'Infrastructure', controller: 'Atlas', confirmed: true },
    { layer: 'Delivery', controller: 'GitHub Actions', confirmed: true }
  ]), 'Hybrid');
});

test('ownership conflict takes precedence over individual controllers', () => {
  assert.equal(core.classifyOwnership([{ conflict: true }, { layer: 'Infrastructure', controller: 'Atlas', confirmed: true }]), 'Ownership Conflict');
});

test('missing plan baseline is never reported as no changes', () => {
  assert.equal(core.driftStatus({ planProduced: false, baselineAvailable: false, changes: false }), 'Not evaluated');
  assert.equal(core.driftStatus({ planProduced: true, baselineAvailable: true, changes: false }), 'No changes');
});

test('workload schema rejects unknown classes and layers', () => {
  assert.throws(() => core.validateWorkload({ id: 'x', classification: 'Terraform', layers: [] }), /Classificação/);
  assert.throws(() => core.validateWorkload({ id: 'x', classification: 'Atlas', layers: [{ layer: 'State' }] }), /Camadas/);
});
