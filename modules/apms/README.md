# APMs · Atlas IDP

Módulo independente do Atlas com uma tela de entrada própria e um mock interativo para explorar e compor pacotes APM.

## Abrir

O item **APMs** na navegação do Atlas abre diretamente o catálogo funcional (`mock.html`). A página de menu continua disponível em `index.html`. Para servir a raiz do projeto:

    python3 -m http.server 8765

Acesse `http://localhost:8765/modules/apms/mock.html`.

## Mock

Busca, filtros, detalhes, composição de skills/targets, criação e edição usam dados de demonstração. Alterações são salvas na chave `atlas-idp-apm-demo-catalog-v1` do `localStorage` e permanecem neste navegador. Não há chamadas de API nem gravação nos manifests do projeto.

Para reiniciar a demonstração, remova essa chave nas ferramentas de armazenamento do navegador.
