# Repositórios Atlas

Abra `index.html` no navegador ou sirva a pasta como conteúdo estático. HTML, CSS e JavaScript nativo, sem instalação, framework, CDN ou build. Tema, navegação e layout do grafo vêm de `../../shared/`. O menu é definido em `../../atlas.config.js`; o exportador da raiz permite transportar somente este módulo. O padrão inicial é escuro; a preferência é salva em `atlas-theme`.

## Uso

1. Em **Configuração**, salve a organização do GitHub. Para Enterprise, configure a API (`https://github.empresa.com/api/v3`) e a URL web.
2. Ajuste as regras, os nomes específicos e as exclusões. A configuração inicial cobre Terraform, templates, plugins, frontend, backend/Backstage e break-glass.
3. Clique em **Descobrir repositórios**. Um token opcional pode ser informado para consultar privados; não é salvo em localStorage, exportações ou arquivos. Sem token, a API só fornece os recursos públicos acessíveis.
4. Explore o catálogo, filtre por família ou clique em um repositório para abrir seu mapa.
5. No mapa, adicione ou edite dependências. Cada relação possui consumidor, dependência, versão em uso e arquivo de origem opcional.
6. Exporte o JSON para preservar o arquivo de controle. A importação preenche o editor para revisão e exige **Validar e salvar JSON** para aplicar.

Os exemplos de repositórios e versões são demonstrativos. A consulta real substitui o catálogo demonstrativo, inclusive quando retorna zero repositórios. As relações iniciais também são exemplos manuais; ajuste-as à configuração real. Não há inferência automática de relações nem leitura dos arquivos mencionados em `file` nesta versão.

## Regras e contrato

O arquivo `examples/repositories.json` fornece o contrato completo. JSON foi escolhido entre os formatos solicitados por funcionar nativamente no navegador. YAML não é interpretado nesta versão.

- `schemaVersion`: 1.
- `github`: organização, URL base da API e URL web. Apenas HTTPS sem credenciais embutidas.
- `includeArchived`: false por padrão.
- `rules`: lista ordenada de `{pattern, category}`. `*` corresponde a zero ou mais caracteres; o restante é literal. Comparação do nome inteiro, sem diferenciar maiúsculas/minúsculas. A primeira regra correspondente vence.
- `repositories`: nomes exatos e suas categorias, com prioridade sobre regras.
- `exclude`: nomes exatos removidos do resultado, inclusive das referências de dependências. Excluir não apaga a relação declarada; ela permanece visível como não descoberta.
- `dependencies`: `{from, to, version, file}`. Uma mesma dependência pode ter versões distintas em consumidores diferentes. Duplicatas da mesma relação e autorreferências são rejeitadas. Ciclos entre repositórios são apresentados no mapa e sua expansão termina no ciclo.

Repositórios usados nas relações também são consultados, mesmo fora das regras, com categoria `Dependência` quando necessário. Remover um nome explícito não elimina uma correspondência por regra ou uma referência de dependência; use `exclude` para retirá-lo do discovery. O mapa limita a expansão para manter a interface utilizável em grafos grandes.

## Discovery implementado

O motor independente `core.js` consulta:

- `GET /orgs/{org}/repos?type=all&sort=full_name&direction=asc&per_page=100&page=N`;
- `GET /repos/{org}/{repo}` para nomes específicos/referenciados ausentes na listagem;
- `GET /repos/{org}/{repo}/tags?per_page=100&page=N` para as versões.

A paginação continua até uma página com menos de 100 itens, com limite explícito de 1.000 páginas. Quatro repositórios podem consultar tags em paralelo; cada requisição tem timeout de 30 segundos. URLs são construídas a partir do destino configurado e redirects são recusados. Os links web usam o nome real retornado pelo GitHub.

A versão disponível é a **maior tag SemVer estável** (`1.2.3` ou `v1.2.3`, com build metadata opcional), não a tag mais recentemente criada nem a release marcada como latest. Pré-releases são ignoradas. Não se assume ordem cronológica da resposta. A comparação é numérica:

| Condição | Exibição |
| --- | --- |
| Versão em uso menor que a disponível | Atualização disponível |
| Mesmo número de versão | Em dia |
| Versão em uso maior | Acima da disponível |
| Branch, SHA, range, pré-release ou ausência de versão | Verificar |

Falha na listagem da organização mantém o último resultado, identificado pelo horário da consulta. Falhas por repositório/tag aparecem nos avisos; versões não consultadas ficam desconhecidas, sem reaproveitar números antigos como atuais. Ausência de tags estáveis é diferente de erro de consulta. Ao mudar regras ou conexão, o snapshot é invalidado e o modo demonstrativo é identificado até o próximo discovery.

Documentação oficial utilizada: [repositórios da organização](https://docs.github.com/en/rest/repos/repos#list-organization-repositories) e [tags de repositório](https://docs.github.com/en/rest/repos/repos#list-repository-tags).

## Persistência e integração

Configuração e último snapshot ficam neste navegador em `atlas-repositories-v1`. O token existe somente durante a consulta. A exportação inclui apenas os campos do contrato público, sem token ou cache. Salvar a configuração não grava arquivos no disco nem faz commits remotos.

O discovery funciona diretamente no browser quando a API permite CORS. GitHub Enterprise e políticas corporativas podem impedir acesso direto. Para integrar ao Atlas, usar seu BFF/GitHub App para autenticação, autorização, cache e consulta à API, mantendo o token no servidor. A interface atual não é uma implementação de sessão/autorização do Atlas. Ela oferece uma conexão manual de leitura para validação inicial.

Limites atuais: uma organização por configuração, relações manuais, tags estáveis SemVer, sem descoberta contínua em segundo plano. Organização e credencial reais não foram fornecidas, portanto a integração privada não foi validada nesta entrega.

## Validação

`node --test modules/repositories/tests/core.test.cjs`

Testes automatizados cobrem regras/exclusões, comparação de versões, validação do JSON, remoção de credenciais extras, paginação de repositórios e tags, inclusão explícita/referenciada, falha de autenticação, consulta parcial e tags sem versão estável.

Também foram verificados no navegador busca, mapa RDS, edição de versão com atualização dos indicadores, ciclos, tema claro/escuro e persistência.

## Backlog

Veja `docs/BACKLOG.md` e a aba Backlog da interface. As funcionalidades de escrita no GitHub não estão ativadas.

## Visão do todo

O mapa agora abre na **Visão do todo**, renderizada em SVG, com um único nó por repositório e todas as relações declaradas. Dependências compartilhadas, ciclos e itens sem relações são preservados. O layout agrupa ciclos antes de distribuir os nós em camadas; não aplica o limite de 100 expansões da árvore individual.

Use **Expandir**, **Ajustar tudo**, os botões de zoom e arraste o fundo. Com foco no mapa, as setas movem a visão, +/− ajustam o zoom e 0 reenquadra. Ctrl/Cmd + roda do mouse também controla o zoom. Um clique ou Enter em um nó mostra consumidores, dependências e versões; **Abrir árvore** mantém a análise individual disponível. Em grafos grandes, ajustar tudo preserva a visão geral, mas será necessário zoom para ler os nomes. Não há promessa de ausência de cruzamentos em grafos densos.

O coletor automático está detalhado em `docs/AUTOMACAO.md` como proposta de implementação, não como integração já ativa.

Testes de layout: `node --test shared/graph/tests/layout.test.cjs` cobre relações compartilhadas, ciclos, referências ausentes, itens isolados, unicidade de nós, limites do enquadramento e grafo de 240 repositórios.
