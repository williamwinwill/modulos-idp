# Controle de backlog

Quadro local para Agentes CI/CD, Repositórios, Backstage e trabalho transversal. As sete abas são Backlog, Refinar, Validar hipótese, To do, Doing, Validação e Concluído.

## Abrir

Na raiz de `atlas-platform`, execute `npm run backlog` (Node 18+ e Git no PATH). Abra [o quadro](http://127.0.0.1:4381/management/backlog/). `ATLAS_GIT` permite escolher outro executável de Git; `ATLAS_BACKLOG_PORT` muda a porta. Não exige instalação de pacotes.

O HTML aberto diretamente por arquivo ou servido pelo servidor estático dos outros módulos mostra a orientação de inicialização. É necessário este servidor para salvar no projeto e verificar commits.

## Trabalhar juntos

Crie uma ideia com título e módulo. No detalhe, refine o plano, decida se precisa de hipótese e escolha a próxima etapa. O botão Copiar pedido prepara uma mensagem para enviar ao Codex; não inicia processamento. Você também pode escrever aqui “implemente ATL-004” ou “escolha um item de To do”.

Codex utiliza `tools/backlog.mjs`, que lê e atualiza os mesmos dados da interface. O quadro consulta atualizações a cada cinco segundos enquanto estiver visível. Responsável e estado Doing são registros de trabalho, não telemetria de um processo ou garantia de que um agente está conectado.

Os dados e o histórico ficam em `data.json`. Os `.md` de backlog permanecem referências de ideias e detalhamento; estado, plano ativo e aceite ficam neste controle. Foram importadas as ideias anteriores, sem inventar prioridade nem marcar entregas antigas como concluídas. Radar e Impacto estão adiados.

## Regras

- Backlog exige somente título e módulo. A etapa Refinar aceita plano em construção.
- To do exige plano, aceite e, se obrigatória, hipótese aprovada.
- Doing começa em To do ou retorna de Validação para ajustes.
- Validação exige passagem por Doing, implementação descrita e verificações registradas.
- Concluído exige validação aprovada e commit existente em HEAD, com o ID na mensagem. Não há release.
- Um item concluído precisa ser reaberto em Backlog ou Refinar antes de alterações.
- Alterar plano, aceite ou implementação invalida uma aprovação anterior, salvo nova aprovação explícita na mesma atualização.

Atualizações concorrentes são recusadas com aviso; o formulário mantém o texto digitado para revisão. O servidor é o único escritor suportado. Não executar dois servidores escrevendo no mesmo arquivo nem editar `data.json` diretamente enquanto estiverem ativos. Os autores Você/Codex são rótulos de colaboração local, não identidades autenticadas.

## Validação e distribuição

Os testes do quadro estão em `tests/`. Testam transições, conflitos de revisão e commits num repositório temporário. A suíte da plataforma inclui esses testes; para um Git fora do PATH, defina `ATLAS_GIT`.

O controle acompanha a pasta inteira da plataforma, mas não integra os pacotes de módulos exportados. Os três módulos continuam estáticos e independentes. A base JSON é versionável; commits nela podem conter o histórico de planos, portanto mantenha o repositório no escopo apropriado ao projeto.
