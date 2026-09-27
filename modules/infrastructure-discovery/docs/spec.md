# Infrastructure Discovery — módulo do IDP Atlas

**Projeto de destino:** Modulos IDP (`atlas-platform/`)  
**Nome do módulo:** Infrastructure Discovery  
**ID técnico proposto:** `infrastructure-discovery`  
**Backlog associado:** ATL-013 · Módulo Infrastructure Discovery do IDP · Refinar  
**Status:** especificação funcional/técnica para implementação do módulo e de um mock interativo  
**Escopo aprovado nesta etapa:** especificar e preparar a transferência de contexto; não executar workflows, criar PRs, conectar contas ou aplicar infraestrutura.

## 1. Resumo executivo

Adicionar ao Atlas IDP um módulo independente chamado **Infrastructure Discovery**. O módulo dá uma visão de recursos cloud, evidencia quem controla cada camada, mostra lacunas/conflitos e orienta adoção pelos padrões Atlas. Dentro do mesmo módulo, uma área de **Drift** permite selecionar o escopo de um `plan` executado pelo GitHub Actions, consultar os reports e schedules por repositório.

O módulo responde a quatro perguntas distintas:

1. **O que existe na conta cloud?** Inventory/discovery, sem exigir acesso a Terraform states externos.
2. **Quem controla cada parte?** Ownership por camada e por componente, com evidências e confiança.
3. **O que divergiu do IaC?** Resultado de um `plan` no workflow do repositório, quando o workflow consegue carregar sua configuração e seu baseline.
4. **Como adotar com segurança?** Plano revisável de import, handover por camada e catalogação no Backstage.

**Decisão de navegação:** incluir um novo item superior `Infrastructure Discovery` no IDP. Drift será uma seção interna, contextualizada pelo inventory e pelo ownership, em vez de um segundo módulo superior que duplique o contexto do recurso.

## 2. Encaixe no projeto Modulos IDP

O destino é o projeto `/Users/williamfernandes/Documents/ChatGPT/Agentes Nuclea/atlas-platform/`. A plataforma atual usa páginas portáveis, HTML/CSS/JavaScript nativo, sem framework/CDN/build e sem imports entre módulos. Tema e navegação vêm de `shared/`; cada módulo mantém sua própria navegação, motor, estado e dados.

O novo módulo deve seguir esse padrão:

```text
atlas-platform/
├── atlas.config.js                              # registra o novo item de menu
├── modules/infrastructure-discovery/
│   ├── index.html                               # shell e áreas do módulo
│   ├── app.js                                   # navegação e renderização
│   ├── core.js                                  # domínio puro, browser + Node
│   ├── style.css                                # estilos escopados do módulo
│   ├── README.md                                # uso, limites e integração
│   ├── examples/demo-data.json                  # dados fictícios
│   ├── docs/spec.md                             # esta especificação
│   └── tests/core.test.cjs                      # regras de domínio
└── tools/                                       # verificação e exportação existentes
```

Registro esperado em `atlas.config.js` (forma ilustrativa):

```js
{ id: 'infrastructure-discovery', title: 'Infrastructure Discovery',
  path: 'modules/infrastructure-discovery/index.html', icon: '⌕',
  shared: ['theme', 'navigation', 'ui'] }
```

Usar somente `shared/` listado no registro. Não editar Repositórios, Backstage, Agentes, Iniciativas nem o shell fora do registro do menu, salvo ajuste necessário e isolado na verificação/exportação da plataforma. A página deve abrir tanto pelo `index.html` da plataforma quanto sozinha, com caminhos relativos.

O pacote exportado deve continuar independente: o exportador lê o registro central, copia o módulo e somente suas dependências compartilhadas; documentação, dados públicos de exemplo e testes acompanham o pacote. Não incluir estados privados, tokens, snapshots do navegador ou credenciais.

## 3. Objetivos

- Descobrir recursos cloud existentes sem exigir acesso a states externos.
- Separar existência do recurso, presença de IaC e ownership efetivo pelo Atlas.
- Preservar ownership diferente em camadas e componentes do mesmo workload.
- Apresentar evidências, confiança, origem e lacunas de cobertura.
- Tratar descoberta, drift e adoção como etapas ligadas, mas não equivalentes.
- Exibir no Atlas o summary de `plan` e a referência à execução GitHub.
- Visualizar schedules de cada repositório e demonstrar alteração de cron via PR.
- Guiar um plano de adoção por camada, sem executar `apply` automaticamente.
- Relacionar o workload ao Backstage sem depender da existência de entidade.
- Entregar um mock navegável com dados demonstrativos que permita avaliar a arquitetura de telas.

## 4. Fora de escopo

- Conectar-se a uma conta AWS real ou ler credentials/tokens nesta etapa.
- Criar PR, disparar workflow, consultar GitHub ou efetuar deployment pelo mock.
- Executar Terraform `apply`, importar recursos ou alterar state remotamente.
- Alegar ausência de IaC só porque um state não foi encontrado.
- Tratar toda mudança observada como drift ou toda divergência como erro.
- Implementar autenticação/autorização do IDP dentro do HTML; futuramente usar o BFF/GitHub App existente.
- Modificar ou substituir o módulo Catálogo Backstage já existente.

## 5. Modelo funcional

### 5.1 Entidades

- **Resource:** recurso cloud com identidade canônica, provider, conta/projeto, região, tipo, nome e primeiro/último scan.
- **Workload:** agrupamento de recursos ligados a um serviço. Relações inferidas devem incluir origem e confiança, e podem ser confirmadas/corrigidas.
- **Ownership claim:** hipótese/afirmação sobre o controlador de uma camada ou componente, sua fonte, confiança e validade.
- **Evidence:** observação rastreável (fonte, escopo, timestamp, referência não secreta, confiança e resumo).
- **Discovery run:** execução de inventário por escopo e cobertura de fontes.
- **Drift run:** execução GitHub com scope, baseline reportado pelo workflow, ownership usado, report do plan e URL/ID do run.
- **Drift schedule:** cron encontrado no workflow por repositório, fuso de exibição, cobertura/escopo e revisão vigente.
- **Schedule change:** proposta de cron e PR associada; a proposta só vira schedule ativo após merge confirmado.
- **Adoption plan:** recursos/camadas escolhidos, padrão alvo, diff revisável, approvals e estado do handover.
- **Catalog link:** vínculo do workload a uma entidade Backstage ou estado da tentativa de correspondência.

### 5.2 Ownership por camada

| Camada | O que descreve | Exemplos de sinais |
| --- | --- | --- |
| Origin | origem/evidência de criação | tag `originBy: Atlas`, CloudTrail, registro de criação |
| Infrastructure | recursos base e objetos cloud | state/config Atlas, Terraform externo, CloudFormation/CDK, pipeline, manual |
| Configuration | configuração operacional do recurso | configuração declarada, workflow, alteração de console |
| Delivery | código, imagem, artefato, release e rollout | GitHub Actions, workflow de deploy, image tag, versão publicada |
| Runtime | time que responde pelo serviço | owner confirmado, entidade Backstage, metadado do repositório |
| Catalog | registro e relações de catálogo | Backstage `Component`/`Resource`, ausência ou dados desatualizados |

State é uma evidência do controlador IaC, não uma camada de ownership. O Atlas não precisa consultar diretamente states externos para descobrir recursos nem para exibir o módulo.

### 5.3 Classificação principal

Cada workload/recurso recebe uma classe principal e justificativa, com contagens mutuamente exclusivas:

| Classe | Interpretação |
| --- | --- |
| Atlas | controle atual pelo Atlas corroborado por registry/state/config identificados |
| Hybrid | camadas/componentes controlados por mecanismos diferentes |
| External Terraform | Terraform fora do Atlas confirmado por state, config, pipeline mapeado ou revisão humana |
| Other IaC | outro IaC confirmado, como CloudFormation/CDK |
| Pipeline | pipeline controla recurso/camada, sem declaração IaC suficiente para classificá-la |
| Manual | criação/alteração manual confirmada por evidência |
| Unknown | fontes insuficientes ou ainda não verificadas |
| Ownership Conflict | sinais atuais confiáveis apontam controladores incompatíveis ou gestão duplicada |

`originBy: Atlas` é uma evidência de origem. Sozinha não prova ownership atual; deve ser cruzada com o registro do Atlas e sinais recentes. Ausência de estado ou evidência mantém classificação `Unknown`/não confirmada, não `Manual`.

### 5.4 Recursos híbridos

- **Lambda:** role/policies/log group/VPC podem ser IaC; function code, artifact, alias/version podem ser pipeline.
- **ECS:** cluster/service/network podem ser IaC; task definition, image e rollout podem vir da esteira. Confirmar atributo por atributo qual sistema é autoridade.
- **API Gateway:** API/stage/route/integration/backend podem ter controladores diferentes.

Workload agrupa as partes, mas classificação e ownership continuam disponíveis por componente. A visão não deve achatar um workload misto em “Terraform” ou “sem IaC”.

## 6. Relação entre Discovery, Ownership e Drift

```text
Cloud inventory / query
        ↓
Resource + workload graph ──→ Evidências e ownership por camada
        │                                  │
        │                                  ├──→ Findings / adoção / Backstage
        │                                  │
        └── repo + ambiente + recurso ─────┴──→ GitHub Actions: terraform plan
                                                   ↓
                                      summary, baseline, diffs e run ID
```

- **Discovery sem state externo:** consulta provider/API e registra recursos existentes. States externos só ampliam a evidência de ownership por conexão opcional (`Federated State Discovery`). Estados não acessíveis aparecem como não verificados.
- **Drift exige comparação:** o Atlas solicita/acompanha o workflow GitHub; é o workflow do repositório que carrega configuração/state necessários ao `plan`. O Atlas não precisa ler diretamente o state.
- **Baseline indisponível:** se o workflow não obtiver config/state/credencial para aquele escopo, status é `Not evaluated` / “Não avaliado”; não apresentar “sem drift” nem contagens zero de create/update/destroy.
- **Sem mudanças:** só afirmar depois de `plan` concluído com baseline válido e report recebido.
- **Workload híbrido:** o report indica camada IaC e atributos comparados. Alteração legítima da camada Delivery (artefato, código/imagem/rollout) não é divergência IaC, exceto quando aquele atributo estiver explicitamente sob autoridade declarativa IaC.
- **Conflito:** possível dupla gestão ou falta de correspondência state/recurso pede revisão e não deve produzir conclusão silenciosa.

## 7. Navegação e telas

### Navegação externa

Adicionar `Infrastructure Discovery` como novo item no menu de módulos do IDP. O menu comum permanece gerido por `atlas.config.js` e `shared/navigation/`; o novo item não substitui Catálogo Backstage nem Repositórios Atlas.

### Navegação interna do módulo

1. **Overview:** cobertura/freshness, recursos por classe, findings prioritários e resumo de drift.
2. **Inventory:** busca, filtros, classificação e tabela de workloads/recursos.
3. **Coverage:** contas/regiões/famílias de provider consultadas, fontes disponíveis e não verificadas; Federated State Discovery opcional.
4. **Resource detail:** identidade cloud, relações/componentes, seis camadas de ownership, evidências/freshness/confiança, estado de catálogo e acesso a Drift/Adoption.
5. **Findings:** conflitos, unknowns, cobertura incompleta, possíveis duplicidades e itens que pedem confirmação.
6. **Drift:** subabas **Execução**, **Histórico** e **Schedules**.
7. **Adoption / Remediation:** revisão por camada, plano de import, validação, handover e prévia Backstage.
8. **Sources / Settings:** conexão, permissões, configuração de cobertura e integração opcional.

A navegação interna deve manter o identificador do recurso e filtros necessários ao trocar de área; links profundos podem ser representados por hash routes compatíveis com abertura direta.

### Overview e Inventory

- Indicar data do último scan, conta/ambiente e cobertura real ou demonstrativa.
- Contagens por Atlas, Hybrid, External Terraform, Other IaC, Pipeline, Manual, Unknown e Ownership Conflict.
- Filtros: provider, conta, região, tipo, ambiente, workload/time, classificação, confiança, camada, freshness e Backstage.
- Tabela paginada server-side quando conectada, com recurso/workload, tipo, classe, camadas resumidas, catálogo, evidência, confiança e próxima ação.
- Estados vazios e parciais distinguem nenhum recurso, filtro sem resultados, erro de fonte e área não verificada.

### Resource detail

Painel ou rota própria mostra identidade canônica, `originBy: Atlas` quando houver, árvore de componentes, owner por cada camada, evidências com fonte/data/confiança, cobertura ausente, entidade Backstage e status de drift conhecido. Ações previstas: **Investigar**, **Ver Drift**, **Criar plano de adoção**, **Ver entidade Backstage**.

Se repo/ambiente/grupo/recurso não estiverem mapeados para o workload, abrir Drift com seleção explícita pendente; não adivinhar o escopo.

### Drift — Execução

- Seletores em cascata: repositório IaC → abrangência → ambiente → grupo → recurso.
- Abrangências: repositório inteiro, ambiente, grupo de recursos e recurso específico.
- Ambientes suportados na proposta: HINT, HEXT, DEV, PROD. Os grupos variam por repo/ambiente (ex.: HINT → S3; HEXT → micro; PROD → rds); o exemplo HINT → rds → banco-x também deve ser representado quando configurado no repo.
- Mostrar caminho do escopo, workflow/branch, gatilho manual, camada declarativa, baseline/state/workspace reportado pelo workflow, commit/ref e limites de ownership.
- A ação futura dispara somente o workflow `plan`. No mock, botão apenas simula envio/conclusão.
- Statuses: `Queued`, `Running`, `Completed`, `Failed`, `Blocked`, `Not evaluated`.

### Drift — Report e Histórico

Exibir no Atlas o report/summary retornado pelo plan do GitHub:

- totais de create/update/destroy somente se o plan foi produzido;
- status geral e resumo por recurso;
- diffs por atributo (valor atual → planejado) e camada controladora;
- avisos/erros e causas de `Not evaluated`;
- repositório, escopo, ambiente, baseline reportado, commit/ref, duração, autor/gatilho e horário/fuso;
- link e run ID/URL da execução GitHub.

O histórico é paginado e cada linha abre o snapshot imutável do report daquele run, incluindo ownership e baseline usados. Não reconstruir relatório histórico a partir de estado atual do recurso.

### Drift — Schedules

- Mostrar cron por repositório e workflow, texto humano do horário, UTC, fuso de exibição, escopo/cobertura e próxima/última execução quando a fonte disponibilizar.
- Edição produz prévia do diff em `.github/workflows/...` e proposta de PR.
- Enquanto PR está aberta, exibir cron vigente e cron proposto. O schedule ativo só muda após merge confirmado.
- PR fechada/recusada mantém o cron vigente; conflito/falha de merge deve aparecer como status.
- Mock simula diff e PR pendente sem API GitHub. Chave ou token nunca vai para `localStorage` ou arquivos.

### Adoption / Remediation

1. Escolher workload/recurso e dependências.
2. Confirmar evidências, ownership atual, baseline e conflitos.
3. Selecionar camadas específicas para adoção (Infrastructure, Configuration, Delivery, Catalog).
4. Mapear para módulos/padrões/repositórios Atlas; mostrar recurso/import/diff, dependências e riscos.
5. Gerar plan de validação e PR de código/configuração revisável.
6. Exigir aprovação e handover explícitos; registrar antigo/novo owner, camadas, janela, rollback e run.
7. Verificar ownership no scan seguinte; sincronizar entidade Backstage após validar owner, relações e identificador.

Estados propostos: `Draft → Needs review → Ready → Applying/Handing over → Verifying → Adopted`, ou `Blocked`, `Cancelled`, `Failed`. Nesta etapa só exibir o fluxo; não executar passos externos.

## 8. Backstage e fontes

- Relacionar workload a `Component`; recursos físicos podem ser `Resource` quando fizer sentido. Não forçar uma entidade por recurso.
- Usar identificadores/annotations e referências de entidades como evidência/correspondência; não alterar o módulo Backstage existente.
- Catalogar separado de adotar: pode existir entidade sem controle Atlas e pode haver adoção antes do cadastro.
- Futuro sync deve pré-visualizar YAML/patch e validar owner, System, relations, UID e colisões antes da escrita.
- Conectores previstos: AWS inventory/provider query; Atlas registry/state/tag; GitHub workflow e report; Backstage catalog; Federated State Discovery opcional; CloudTrail/log de mudanças conforme cobertura/permissões.
- Fontes devem identificar escopo/freshness/status: `available`, `partial`, `not configured`, `not verified`, `permission denied`, `failed`.

## 9. Requisitos técnicos do módulo

### Limites e organização

- `core.js`: validação e normalização de resource/workload, relações, evidence, classificação, estado/ownership do drift e transições de plano. Funções puras, sem DOM/fetch/storage em regras de domínio; wrapper browser + CommonJS coerente com módulos atuais.
- `app.js`: rotas internas, adaptação dos dados demo e renderização de views; transações assíncronas futuras através de adapters injetáveis.
- `style.css`: tokens existentes, tema claro/escuro compartilhado, regras locais escopadas; layouts responsivos e acessíveis.
- `index.html`: inclui tema/navegação da plataforma e o menu interno. Sem build, imports remotos ou dependência entre módulos.
- `examples/`: datasets fictícios, sem nomes de contas reais, secrets ou dados privados.
- `tests/`: cobertura da core, fixtures híbridas, sinais ausentes, conflito e deduplicação.

### Modelo lógico sugerido

```text
Resource(id, provider, account, region, type, cloudId, name, firstSeen, lastSeen)
Workload(id, name, account, repository?, environment?, ownerTeam?, backstageEntityRef?)
Relationship(fromId, toId, kind, confidence, source)
OwnershipClaim(subjectId, layer, controller, owner?, confidence, validFrom, validTo?)
Evidence(id, subjectId, layer?, sourceType, sourceRef?, observedAt, confidence, summary, fingerprint)
DiscoveryRun(id, scope, sourceCoverage, startedAt, completedAt, status)
Finding(id, subjectId, kind, severity, evidenceIds, status, firstSeen, lastSeen)
DriftRun(id, repository, scope, baselineRef?, ownershipSnapshot, githubRunId?, githubUrl?, trigger, status, times, planSummary?, attributeDiffs?)
DriftSchedule(repository, workflowPath, cronExpression, timezone, scope, activeRevision, nextRunAt?)
ScheduleChange(id, repository, oldCron, proposedCron, pullRequestRef?, status, createdAt, mergedAt?)
AdoptionPlan(id, subjectIds, selectedLayers, targetPattern, state, approvals, auditRef)
CatalogLink(subjectId, entityRef?, status, lastSyncedAt?, validation)
```

Valores secretos não entram em `Evidence`, em fixtures, localStorage, exports, mensagens de erro ou reports do módulo. Guardar somente referências não secretas e o mínimo de valor necessário à revisão do atributo.

### Persistência do mock

Demo é identificada em todas as views e usa chave isolada, proposta `atlas-infrastructure-discovery-v1`. Pode guardar apenas filtros/estado da apresentação e dados de exemplo alterados localmente; não guardar token, credencial, state, URL privada ou PR real. Incluir reset de demo e export/import JSON somente quando houver validação de schema.

### Integrações futuras (contratos propostos, não APIs existentes)

1. `GET /api/infrastructure-discovery/resources?...` — inventory paginado e filters server-side.
2. `GET /api/infrastructure-discovery/resources/{id}` — relações, claims e evidências.
3. `POST /api/infrastructure-discovery/scans` / `GET /.../scans/{id}` — iniciar/acompanhar discovery.
4. `POST /api/infrastructure-discovery/drift-runs` — solicitar execução de workflow com repo/scope; precisa idempotency key e autorização por repositório.
5. `GET /api/infrastructure-discovery/drift-runs?...` — histórico/snapshot de summary.
6. `GET /api/infrastructure-discovery/schedules` — schedules descobertos por repo.
7. `POST /api/infrastructure-discovery/schedule-changes` — criar PR com cron novo; retorno inclui PR ref/URL, cron atual e proposto.
8. `POST /api/infrastructure-discovery/adoption-plans` / endpoints de revisão e transição — somente após política de governança definida.

Contrato final depende do BFF e GitHub App existentes. Integrações devem usar backend para autenticação, autorização, CORS, rate limit, cache, idempotência e auditoria. O browser não é autoridade para ações de segurança.

## 10. Conteúdo do mock inicial

- Shell harmonizado com `atlas-platform`: logo/menu, breadcrumb, tema e identidade dos módulos atuais.
- Novo item superior no menu e navegação interna de Discovery.
- Dados fictícios, marcados como demonstração.
- Overview/Inventory com classes e filtros; detalhe selecionado com as seis camadas.
- Cenários visíveis: Lambda híbrida (role/log group IaC, function/deploy GitHub Actions), ECS service/task/image híbridos, API Gateway parcialmente em CloudFormation/pipeline, recurso `originBy: Atlas`, Terraform externo, conflito e recurso manual/unknown.
- Coverage com fonte opcional de state externo não configurada, sem invalidar o discovery.
- Acesso ao Drift contextual a um recurso; tela Drift com três abas, selectors cascade, exemplo de report, histórico e schedules.
- Exemplo sem baseline com `Not evaluated`, sem contagem zero; nota sobre diferenças legítimas de delivery.
- Alteração cron com diff, validação básica, estado “PR simulada pendente”; schedule vigente permanece ativo.
- Adoption wizard demonstra seleção por camada, validação, diff e prévia Backstage, sem executar alteração.
- Interações de busca, filtro, navegação, seleção e modais funcionam localmente. Nenhuma API, workflow, PR ou operação cloud real.

O mock anterior — `infrastructure-discovery.html` — é a referência visual/funcional de origem. Ao levar esta spec para a pasta do módulo, incluir uma cópia autônoma em `docs/visual-reference.html` para que a implementação não dependa do caminho temporário da conversa.

## 11. Critérios de aceite da primeira entrega

### Módulo e integração com o projeto

- `Infrastructure Discovery` aparece no menu Atlas; os outros módulos continuam funcionando e com estado independente.
- Abrir pela home, por link direto, em `file://` e por servidor estático não quebra paths nem assets.
- Exportar somente este módulo gera um pacote funcional com compartilhados necessários, documentação, examples e testes; nenhum outro módulo vira dependência.
- Tema claro/escuro e navegação comum são preservados; teclado, labels e foco são acessíveis.

### Funcionalidade do mock

- Overview, Inventory, Coverage, Findings, detalhe, Drift e Adoption são navegáveis e mostram fixtures.
- Busca/filtros e seleção de recurso atualizam o detalhe sem perder ownership por camada.
- `originBy: Atlas` aparece como evidência, não como única condição para Atlas-managed.
- Pelo menos um workload Lambda/ECS demonstra ownership dividido e mostra camada delivery separada.
- O caminho de drift recebe repo/escopo contextualizado quando há mapping.
- Repo → ambiente → grupo → recurso funciona e oferece HINT, HEXT, DEV, PROD e os exemplos previstos.
- A tela mostra summary de plan com Create/Update/Destroy, report por recurso, diff por atributo e referência do run GitHub.
- Falta de baseline resulta em `Not evaluated`; nenhum contador `0` é usado para representá-la.
- Cron mostra schedule atual, prévia e PR simulada; a expressão atualmente ativa não muda ao criar proposta.
- Adoção escolhe camadas e mostra validação/diff; não aplica mudanças.
- Todos os dados e interações externas simuladas têm indicação explícita de protótipo.

### Core e validação

- Classificação, deduplicação, hierarquia de relações, baseline e status de drift têm testes de domínio.
- Estados `unknown`, fonte parcial/falha, conflito, sem baseline e plan sem mudanças não colapsam em falsos `0` ou falso “sem drift”.
- O verificador de links/export do projeto inclui o novo módulo sem quebrar exports existentes.
- Testar separadamente a página responsiva e cada aba/fluxo; registrar o que é mock e o que é integração futura.

## 12. Fases propostas

1. **Fase A — spec e mock:** telas, navegação local e fixtures; sem chamadas externas.
2. **Fase B — core e contratos:** modelo, normalização, classificação, evidências, fixtures e testes.
3. **Fase C — read-only:** BFF de inventory, ownership sources e Backstage links.
4. **Fase D — GitHub Drift:** dispatch de plan, summary/history e leitura de schedules.
5. **Fase E — propostas controladas:** PR de cron, adoption PR, aprovações e handover.
6. **Fase F — state federation opcional:** ampliar evidência somente por conexão autorizada e escopo explícito.

Cada fase mantém os estados/fonte de evidência visíveis. Fase C–F dependem de contratos/permissões do Atlas BFF, AWS e GitHub; não são parte da Fase A.

## 13. Decisões pendentes antes das integrações

1. Provider/contas/regiões/famílias para o primeiro inventory e método autorizado (`API` do provider, `terraform query/list` ou ambos).
2. Contrato de input/output e nomes de workflows Github por repo; formato estável de report/artefato.
3. Fonte de mapeamento repo → ambiente → grupos → recursos.
4. Regra de autoridade por atributo para Lambda, ECS e API Gateway; campos permitidos/excluídos do drift IaC.
5. Política para Ownership Conflict e necessidade de aprovação para drift/adoption.
6. Método BFF/GitHub App para disparo de workflow e criação/revisão de PR; nunca token no browser.
7. Padrões/modules/state alvo do Atlas para import e handover.
8. API, entityRef, ownership e política de escrita do Backstage.
9. Fuso padrão, cron permitido e política de merge da PR do schedule.
10. Retenção, visibilidade por time/conta e conteúdo permitido de evidence/plan.

## 14. Instrução de início para Codex no projeto Modulos IDP

> No projeto `Modulos IDP`, leia primeiro `AGENTS.md`, `atlas-platform/AGENTS.md`, e as instruções do backlog. Implemente a Fase A deste documento em `atlas-platform/modules/infrastructure-discovery/`, preservando a arquitetura independente dos módulos atuais. Registre o item de trabalho no fluxo do backlog antes de alterar o produto. Adicione o item ao `atlas-platform/atlas.config.js`, use tema/navegação compartilhados e atualize a verificação/exportação conforme necessário. Comece pelo módulo navegável com dados fictícios e ações locais; não implemente conexão real AWS/GitHub/Backstage, não execute workflows, não crie PR e não faça apply. Use `docs/visual-reference.html` como referência, cubra todos os critérios da Fase A e informe claramente quais interações são demonstrativas.

## 15. Referências da proposta

- Spec funcional/técnica Discovery + Ownership + Adoption consolidada anteriormente.
- Protótipo de Drift, com execução, histórico, schedules, cascata de seletores, plan report, diff de cron e PR simulada.
- Projeto destino: módulo portável `atlas-platform`, com módulos independentes e menu registrado em `atlas.config.js`.
- Esta spec é proposta de produto/arquitetura; conexões de produção, APIs e permissões ainda precisam ser confirmadas.
