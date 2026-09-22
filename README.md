# Atlas · Módulos portáveis

Três módulos independentes de interface, com tema, navegação e componentes visuais compartilhados. HTML, CSS e JavaScript nativo, sem framework, CDN, dependências npm ou build. Abra [index.html](index.html) para escolher o módulo.

## Estrutura

```text
atlas-platform/
├── index.html                  # entrada dos módulos instalados
├── atlas.config.js             # registro do menu e dependências compartilhadas
├── modules/
│   ├── agents/                 # Agentes CI/CD
│   │   ├── index.html, app.js, style.css
│   │   ├── engine/             # base Python opcional, independente da interface
│   │   └── docs/               # especificação do agente
│   ├── repositories/           # discovery GitHub, relações e versões
│   │   ├── index.html, app.js, core.js, graph-view.js
│   │   └── examples/, docs/, tests/
│   └── backstage/              # catálogo e relações Backstage
│       ├── index.html, app.js, core.js, demo.js, style.css
│       └── examples/, docs/, tests/
├── shared/
│   ├── theme/                  # tema claro/escuro e preferência
│   ├── navigation/             # menu e página inicial
│   ├── ui/                     # estilos de catálogo, formulários e grafos
│   └── graph/                  # algoritmo de layout independente de domínio
├── tools/                      # exportação e verificação
└── tests/                      # testes de portabilidade
```

Nenhum módulo importa arquivos de outro módulo. `core.js` contém o motor de cada catálogo, separado da interface e do armazenamento local. Os dois motores expõem `AtlasCore` / `BackstageCore` no navegador e `module.exports` no Node; `shared/graph/layout.js` expõe `AtlasGraph`. São scripts clássicos intencionalmente: não exigem servidor para carregar imports ES Modules ou JSON via fetch.

## Abrir e transportar o projeto inteiro

Copie **toda esta pasta `atlas-platform`** para o local desejado. Abra `index.html` diretamente ou, a partir desta pasta, execute:

```sh
python3 -m http.server 8765
```

Acesse `http://localhost:8765/`. Os recursos e o menu usam caminhos relativos; é possível hospedar o pacote na raiz ou em uma subpasta. Não depende da pasta antiga `outputs` nem de caminhos da máquina original.

As consultas GitHub/Backstage dependem das permissões, autenticação e CORS das APIs. Isso não muda com a organização dos arquivos. Interfaces e dados de exemplo funcionam sem conexão externa.

## Levar somente um módulo

Com Node.js 18+ disponível, execute na raiz deste projeto, sem `npm install`:

```sh
node tools/export-module.mjs backstage ../atlas-backstage
node tools/export-module.mjs repositories ../atlas-repositories
node tools/export-module.mjs agents ../atlas-agents
```

Cada comando cria um pacote autossuficiente com o módulo escolhido, somente as pastas compartilhadas declaradas por ele, exemplos, documentação e testes. Abra o `index.html` do pacote exportado. O menu terá apenas esse módulo; nenhuma tela aponta para um módulo ausente.

O destino deve ser uma pasta nova, fora do projeto, cujo diretório pai já exista. O exportador recusa sobrescrever arquivos. Não inclui `__pycache__`, saídas da demonstração Python ou configurações do navegador. O pacote exportado também pode ser verificado ou exportado novamente.

Para compor manualmente um projeto, preserve `modules/<id>/`, as pastas `shared` declaradas e os arquivos da raiz. Ajuste a lista `modules` em `atlas.config.js` aos módulos presentes. Para integrar em React/Backstage/TypeScript, reaproveite primeiro os motores puros; as telas atuais são páginas completas com CSS global, não componentes isolados para montar juntos no mesmo DOM.

## Configurações e dados

As chaves existentes foram preservadas: `atlas-cicd-h5-v1`, `atlas-repositories-v1`, `atlas-backstage-v1` e `atlas-theme`. No mesmo endereço de servidor, a mudança de caminho mantém o armazenamento da origem.

**Copiar arquivos não copia o localStorage do navegador.** Antes de mudar host/porta/navegador, exporte o JSON de Repositórios e, no Backstage, entidades e conexão. Depois importe-os na nova origem. Arquivos abertos via `file://` podem ter armazenamento separado por caminho, conforme o navegador. O módulo Agentes ainda não oferece importação/exportação da configuração: suas preferências devem ser refeitas ao mudar de origem.

Tokens não são gravados nos pacotes. Os arquivos em `examples/` são exemplos, não configurações privadas da organização. Os motores de coleta continuam manuais; o agendamento de produção e as operações de escrita no GitHub permanecem como propostas/backlog.

## Verificar

```sh
node tools/test.mjs
node tools/check-links.mjs
```

O primeiro comando verifica referências locais, executa os testes dos motores/layout e exporta cada módulo em uma pasta temporária para testar a mudança de localização e a proteção contra sobrescrita. Os mesmos comandos funcionam nos pacotes exportados.

## Documentação por módulo

- [Agentes CI/CD](modules/agents/README.md) · [Base Python](modules/agents/engine/README.md)
- [Repositórios Atlas](modules/repositories/README.md) · [Automação](modules/repositories/docs/AUTOMACAO.md) · [Backlog](modules/repositories/docs/BACKLOG.md)
- [Catálogo Backstage](modules/backstage/README.md) · [Motor e relações](modules/backstage/docs/MOTOR.md)

Os HTMLs antigos em `../outputs/` são apenas atalhos de compatibilidade e preservam a rota `#...` ao redirecionar. Não precisam ser levados para outro projeto.
