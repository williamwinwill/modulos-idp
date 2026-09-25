// Registro dos módulos instalados. Caminhos relativos à raiz do pacote.
// Script clássico para funcionar também ao abrir index.html por file://.
(function (root, factory) {
  const config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  else root.AtlasPlatform = config;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
    management: { title: 'Gestão do backlog', path: 'management/backlog/index.html' },
    modules: [
      { id: 'agents', title: 'Agentes', path: 'modules/agents/index.html', icon: '▦', shared: ['theme', 'navigation'] },
      { id: 'repositories', title: 'Repositórios Atlas', path: 'modules/repositories/index.html', icon: '▱', shared: ['theme', 'navigation', 'ui', 'graph'] },
      { id: 'backstage', title: 'Catálogo Backstage', path: 'modules/backstage/index.html', icon: '⬡', shared: ['theme', 'navigation', 'ui', 'graph'] },
      { id: 'initiatives', title: 'Iniciativas de IA', path: 'modules/initiatives/index.html', icon: '✧', shared: ['theme', 'navigation', 'ui'] }
    ]
  };
});
