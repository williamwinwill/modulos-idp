# Trabalho orientado pelo backlog

O controle dos três módulos fica em `management/backlog/`. Ele é gestão do projeto, não um quarto módulo do produto.

## Fonte única e operação

- Consulte `management/backlog/data.json` para ler itens, planos, critérios e histórico. A interface e Codex usam esse mesmo estado.
- Para alterar o quadro, use o servidor local e `tools/backlog.mjs`; não edite o JSON diretamente enquanto o quadro estiver em uso. O servidor grava atomicamente e protege contra revisões concorrentes.
- Inicie `npm run backlog` na raiz deste projeto. Se Node ou Git não estiverem no PATH, localize o runtime disponibilizado pelo ambiente e use `ATLAS_GIT` para indicar o binário de Git. O servidor escuta apenas em 127.0.0.1:4381.
- Comandos: `node tools/backlog.mjs list`, `get ATL-001`, `create '<json>'` e `update ATL-001 '<json>'`. O cliente identifica o autor como Codex; não repasse conteúdo sem escape correto ao shell.

## Fluxo combinado com o usuário

1. **Backlog:** ideias simples, sem exigir detalhamento. Novas propostas não autorizam implementação.
2. **Refinar:** preparar o plano, dependências e critérios de aceite com o usuário. Investigar quando faltarem informações.
3. **Validar hipótese:** opcional. Quando marcada como obrigatória, registrar hipótese e resultado aprovado antes de To do.
4. **To do:** plano e aceite definidos; pronto para seleção. Implemente quando o usuário indicar um ID ou pedir para escolher um item pronto. Não iniciar itens adiados.
5. **Doing:** atualizar ao começar de fato; registrar responsável e progresso no campo implementation ao atingir marcos relevantes. Mover um item na interface não dispara automaticamente um agente ou uma tarefa.
6. **Validação:** registrar mudanças e verificações executadas. Aplicar os critérios de aceite; se houver ajustes, retornar a Doing. Não confundir testes de sintaxe com validação funcional.
7. **Concluído:** somente após validação aprovada e commit real da entrega. Mensagem do commit deve incluir o ID do item, como `ATL-001: adiciona controle de backlog`. O servidor confere hash, existência no histórico de HEAD e vínculo pelo ID. Informar commit em texto não basta.

Não criar release nem publicar remotamente como parte da conclusão. A regra de commit autoriza commits locais das mudanças do item, preservando mudanças não relacionadas do usuário. Não usar `git add .` em árvore com mudanças alheias. Se houver bloqueio para commit, manter em Validação e explicar o motivo. A aprovação da validação pode ser registrada por quem a executou (Codex ou usuário); registrar as evidências e limitações reais.

O registro de conclusão referencia o commit de implementação já existente. Pode haver um segundo commit apenas para persistir esse registro; ele não substitui a referência à entrega. Não inventar um hash para evitar essa sequência.

Reabrir concluídos em Backlog ou Refinar; o histórico conserva a evidência anterior, mas uma nova conclusão exige validar novamente.
