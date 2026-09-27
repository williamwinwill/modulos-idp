(function (root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  else root.InfrastructureDiscoveryCore = core;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const classes = ['Atlas', 'Hybrid', 'External Terraform', 'Other IaC', 'Pipeline', 'Manual', 'Unknown', 'Ownership Conflict'];
  const layers = ['Origin', 'Infrastructure', 'Configuration', 'Delivery', 'Runtime', 'Catalog'];
  function classifyOwnership(claims = []) {
    const controllers = new Set(claims.filter(claim => claim && claim.confirmed && claim.layer !== 'Origin' && claim.controller).map(claim => claim.controller));
    if (claims.some(claim => claim && claim.conflict)) return 'Ownership Conflict';
    if (!controllers.size) return 'Unknown';
    if (controllers.size > 1) return 'Hybrid';
    const controller = [...controllers][0].toLowerCase();
    if (controller === 'atlas') return 'Atlas';
    if (controller.includes('terraform')) return 'External Terraform';
    if (controller.includes('cloudformation') || controller.includes('cdk')) return 'Other IaC';
    if (controller.includes('pipeline') || controller.includes('github actions')) return 'Pipeline';
    if (controller === 'manual' || controller === 'console') return 'Manual';
    return 'Unknown';
  }
  function driftStatus({ planProduced, baselineAvailable, changes }) {
    if (!baselineAvailable || !planProduced) return 'Not evaluated';
    return changes ? 'Drift detected' : 'No changes';
  }
  function validateWorkload(workload) {
    if (!workload || typeof workload.id !== 'string' || !workload.id.trim()) throw new TypeError('Workload precisa de id.');
    if (!classes.includes(workload.classification)) throw new TypeError('Classificação inválida.');
    if (!Array.isArray(workload.layers) || workload.layers.some(layer => !layers.includes(layer.layer))) throw new TypeError('Camadas inválidas.');
    return structuredClone(workload);
  }
  return { classes, layers, classifyOwnership, driftStatus, validateWorkload };
});
