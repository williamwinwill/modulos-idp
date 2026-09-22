# Agente de análise e melhoria de esteiras CI/CD

## 1 — V1 entregável

**Épico:** Analisar execuções de CI/CD do GitHub corporativo e recomendar melhorias.

**Objetivo:** entregar um agente funcional em uma semana, de segunda a sexta-feira, com análise diária autônoma, execução manual pela interface, histórico no S3 e consolidado semanal no Teams.

**Equipe:** uma pessoa implementando, com suporte pontual.

### Escopo e regras definidas

| Item | Regra |
|---|---|
| Atuação | Somente analisar e recomendar. Não alterar arquivos, abrir PRs ou executar pipelines. |
| Fonte | Execuções de CI e CD de release do GitHub corporativo. |
| Processamento | ECS com conectividade à rede interna e utilização de modelo no Bedrock. |
| Construção do agente | Aplicação que orquestra coleta, preparação de contexto, análise, persistência e atualização do estado da solicitação. |
| Publicação | Implantar a aplicação no ECS e disponibilizar backend, interface e agendas integrados, pelo procedimento corporativo. |
| Integração GitHub | API direta. Não construir MCP no V1. |
| Persistência | S3 para dados coletados, estados das análises e relatórios. |
| Análise automática | Todos os dias às **20h**, horário de Brasília. |
| Período analisado | Dia atual, de **00h até o instante do disparo**. |
| Cobertura | Todas as execuções encontradas no intervalo, independentemente de sucesso, falha ou andamento. |
| Execução manual | Pela interface, usando o mesmo intervalo diário até o disparo. |
| Filtros | Todos os repositórios autorizados, uma sigla de sistema ou um repositório. |
| Sigla | Texto livre, associado à convenção de nomes, como `SRO-agenda`, `dup-driver` e `ctc-teste`. |
| Notificação | Teams, pelo serviço existente, toda **sexta-feira às 8h**, horário de Brasília. |
| Consolidado | Resultados disponíveis dos sete dias anteriores ao envio. |
| Desligamento | Suspende novas análises automáticas e notificações. Mantém execução manual. |
| Processamento em andamento | Termina normalmente após o desligamento. |
| Controle de acesso | Utilizar o controle existente pelo Atlas. |
| Interface | Tela mínima funcional para configuração, execução e consulta aos resultados. |

**Fuso técnico:** `America/Sao_Paulo`.

**Arquitetura do agente no V1:** o agente é a aplicação executada no ECS, que utiliza um modelo autorizado no Bedrock. Não está prevista a criação de um agente gerenciado no Bedrock nem seu cadastro em um catálogo de agentes. A construção está explicitada em H3, apoiada pelas capacidades de H2 e H4; a operação fica em H5 e a publicação integrada em H7.

**Regra proposta para correspondência de sigla:** comparar o texto informado com o trecho anterior ao primeiro hífen, sem diferenciar maiúsculas de minúsculas. Validar essa regra contra os nomes reais na implementação.

### Limite conhecido de cobertura

A análise automática das 20h cobre as execuções encontradas entre 00h e 20h daquele dia. Execuções posteriores não são recuperadas automaticamente no dia seguinte.

Uma execução manual posterior pode ampliar a cobertura daquele dia. O relatório deve informar seu intervalo real, sem apresentar a coleta como cobertura completa de 24 horas.

O consolidado de sexta-feira às 8h normalmente terá como última análise automática a de quinta-feira às 20h. Também poderá incluir análises manuais disponíveis no período.

### H1 — Preparar o ambiente e validar o processamento no ECS

**Objetivo:** preparar o ambiente de execução e validar o acesso às integrações necessárias. A publicação da versão funcional integrada será concluída em H7.

**Tarefas macro:**

- Identificar e reutilizar o mecanismo autorizado de autenticação no GitHub corporativo.
- Configurar o ECS e implantar uma versão inicial para validar conectividade, permissões e integrações.
- Identificar o procedimento corporativo de geração da imagem, implantação e retorno à versão anterior.
- Configurar acesso ao Bedrock, S3 e serviço Teams.
- Validar as integrações com dados reais.

**Critérios de aceite:**

- Consultar uma execução real do GitHub a partir do ECS.
- Invocar o modelo autorizado no Bedrock.
- Gravar e recuperar dados no S3.
- Validar o envio pelo serviço Teams.
- Registrar falhas das integrações de forma distinguível.

**Dependências:** credenciais, permissões e procedimento de implantação. A conectividade de rede foi informada como disponível.

### H2 — Selecionar o escopo e coletar as execuções

**Objetivo:** coletar todas as execuções encontradas no intervalo e escopo solicitados.

**Tarefas macro:**

- Consultar os repositórios dentro do escopo autorizado.
- Aplicar os filtros todos, sigla ou repositório.
- Percorrer todas as páginas de resultados da API.
- Coletar metadados, jobs, steps e logs disponíveis.
- Consultar workflows e configurações pertinentes à versão analisada, quando necessários e acessíveis.
- Persistir evidências e identificação da coleta no S3.

**Critérios de aceite:**

- O instante de corte é fixado no início da solicitação.
- Não selecionar somente a última execução ou somente falhas.
- Ausência de resultados é diferenciada de falha de consulta.
- Execuções em andamento são identificadas como provisórias.
- Registrar repositório, identificador da execução e tentativa, quando disponibilizada.
- Recoletas não duplicam a contagem da mesma tentativa.
- Informar quantidades encontradas, analisadas e pendentes.
- Se a coleta falhar parcialmente, deixar explícito que o total conhecido pode estar incompleto.

**Dependência:** H1.

**Detalhe técnico a validar:** campo temporal utilizado para incluir execuções e novas tentativas no intervalo diário, conforme a API do GitHub corporativo.

### H3 — Construir o agente, orquestrar a análise e recomendar melhorias

**Objetivo:** construir o núcleo do agente e o fluxo de processamento que produz recomendações sustentadas pelas evidências coletadas.

**Cobertura inicial:**

- Configuração do projeto, como dependências, package, Maven e versões de linguagem.
- Configuração ou comportamento das actions.
- Dependências entre etapas.
- Oportunidades de paralelismo.
- Outras causas observáveis, como permissões ou infraestrutura.

**Tarefas macro:**

- Implementar a orquestração de cada solicitação: receber escopo e instante de corte, coletar evidências por H2, preparar o contexto, invocar o modelo no Bedrock, persistir o resultado por H4 e atualizar o estado da solicitação.
- Definir e versionar as instruções de análise e o formato de saída.
- Preparar o contexto a partir das evidências.
- Integrar a análise ao Bedrock.
- Tratar falhas das etapas e registrar o estado e as limitações da análise.
- Disponibilizar o mesmo fluxo de processamento para os disparos manuais e automáticos de H5.
- Validar os resultados com exemplos reais.

**Critérios de aceite:**

- Uma solicitação percorre o fluxo de coleta, preparação de contexto, análise, persistência e atualização de estado.
- Disparos manuais e automáticos utilizam a mesma implementação do fluxo, respeitando o escopo e o instante de corte de cada solicitação.
- Falhas identificam a etapa afetada e deixam o estado da solicitação consultável; resultados parciais são explicitamente identificados.
- Cada análise registra a versão das instruções utilizadas, e a saída é validada contra o formato definido antes de ser disponibilizada como relatório.
- Cada achado identifica a execução afetada, evidência, explicação e recomendação.
- Hipóteses são apresentadas como hipóteses.
- Evidência insuficiente resulta em conclusão limitada ou inconclusiva.
- O diagnóstico não força todos os problemas em “configuração do projeto” ou “action”.
- Recomendações de paralelismo respeitam dependências de dados e artefatos.
- Não recomendar paralelizar o upload com o build que produz o artefato.
- Conteúdo de repositórios e logs é tratado como dado, não como instrução para controlar o agente.

**Dependências:** H2 e contratos de persistência e estados de H4. Pode começar com exemplos reais previamente coletados; a integração completa depende da implementação de H4.

### H4 — Manter histórico e disponibilizar relatórios no S3

**Objetivo:** preservar resultados para consulta e consolidação semanal.

**Tarefas macro:**

- Definir a organização dos registros no S3.
- Persistir solicitações, evidências, estados e relatórios.
- Disponibilizar consulta aos resultados pelo backend.

**Critérios de aceite:**

- Cada análise registra identificador, origem manual ou automática, filtro, intervalo, estado, resultado, versão da aplicação e versão das instruções de análise.
- Relatórios anteriores podem ser recuperados.
- Histórico de análises e identidade das execuções são separados.
- Uma nova análise da mesma execução não aumenta indevidamente a contagem de pipelines.
- Os resultados podem ser reutilizados no consolidado semanal.

O S3 será o histórico persistente do V1. Memória de aprendizado ou de decisões entre análises não integra esta entrega.

**Dependências:** contratos dos dados de H2 e H3. Implementação pode acompanhar essas histórias.

### H5 — Controlar o agente pela interface e pelas agendas

**Objetivo:** permitir operação autônoma e manual com acesso pelo Atlas.

**Controles da interface:**

- Estado ligado/desligado.
- Agenda da análise diária, inicialmente às 20h.
- Agenda de notificação, inicialmente sexta-feira às 8h.
- Filtro por todos, sigla ou repositório.
- Botão para execução manual.
- Estado das solicitações e consulta aos relatórios.

**Critérios de aceite:**

- Controle de acesso integrado ao Atlas.
- Configurações persistem e são respeitadas pelos disparos seguintes.
- Quando ligado, o agente executa as análises e notificações conforme suas agendas.
- Quando desligado, não inicia novas análises automáticas nem notificações.
- Processamentos já iniciados terminam normalmente.
- A execução manual continua disponível quando desligado.
- A execução manual não gera notificação imediata; seu resultado fica disponível para consulta e consolidação.
- A interface apresenta processamento, conclusão e falha.
- Cliques repetidos não duplicam a mesma solicitação.
- Ligar novamente retoma as agendas futuras, sem recuperação automática dos disparos perdidos.

**Dependências:** integração com Atlas, contratos do backend e processamento disponível. Validar o reaproveitamento do BFF existente; não pressupor construção de todo o motor de MFE.

### H6 — Consolidar os resultados e notificar no Teams

**Objetivo:** enviar um resumo semanal das análises disponíveis.

**Tarefas macro:**

- Consultar resultados do período no S3.
- Consolidar achados e contagens sem duplicações.
- Integrar o serviço Teams existente.
- Registrar o estado do envio.

**Critérios de aceite:**

- Envio automático às sextas-feiras, às 8h de Brasília, quando o agente estiver ligado.
- Considerar resultados disponíveis referentes ao intervalo dos sete dias anteriores ao disparo.
- Apresentar período, principais achados, repositórios afetados e totais conhecidos.
- Não contar novamente a mesma tentativa presente em múltiplas análises.
- Informar cobertura parcial, dias sem análise e falhas conhecidas.
- Diferenciar ausência de execuções de ausência de dados.
- Registrar sucesso ou falha no envio.
- Evitar reenvio acidental do mesmo consolidado.
- A agenda de notificação permanece independente da agenda de análise.

**Dependências:** H3, H4, controle de ativação e contrato do serviço Teams.

### H7 — Publicar e validar o agente integrado

**Objetivo:** disponibilizar a versão funcional do agente no ambiente de entrega, com backend, interface, agendas e integrações funcionando de ponta a ponta.

Publicar o agente significa implantar a aplicação no ECS utilizando o modelo autorizado no Bedrock. H1 prepara e valida o ambiente; H7 publica e valida a versão integrada.

**Tarefas macro:**

- Gerar e identificar a imagem da aplicação pelo procedimento corporativo.
- Configurar permissões, variáveis de ambiente e referências a segredos necessários à execução.
- Implantar a versão integrada no ECS e disponibilizar backend, interface com acesso pelo Atlas e agendas.
- Validar uma execução real de ponta a ponta: solicitação, coleta no GitHub, análise no Bedrock, persistência no S3 e consulta do relatório pela interface.
- Validar o consolidado e o envio ao Teams por disparo controlado na quinta-feira.
- Registrar a versão publicada, o procedimento de implantação e como retornar à versão anterior.

**Critérios de aceite:**

- A versão da aplicação e a imagem implantada são identificáveis.
- O agente executa no ECS com as configurações e permissões do ambiente de entrega.
- A interface está disponível aos usuários autorizados pelo Atlas e permite executar e consultar uma análise real.
- Uma solicitação conclui o fluxo integrado, com estado atualizado e relatório recuperável no S3 e consultável pela interface.
- As agendas diária e semanal estão configuradas no fuso `America/Sao_Paulo` e respeitam o controle ligado/desligado.
- O envio ao Teams foi validado por disparo controlado antes do envio real de sexta-feira às 8h.
- Falhas do fluxo podem ser identificadas pelos registros e pelo estado consultável da solicitação.
- O procedimento de implantação e de retorno à versão anterior está documentado.

**Dependências:** H1 a H6 integradas e procedimento corporativo de implantação disponível. A preparação da publicação pode acompanhar a implementação; o aceite exige a versão integrada.

### Dependências e oportunidades de execução independente

| Frente | Dependência | Pode avançar independentemente? |
|---|---|---|
| Infraestrutura e acessos | Ambiente e permissões | É a primeira validação. |
| Coleta | Acesso ao GitHub | Após H1. |
| Construção e orquestração do agente | Contratos de coleta, análise, persistência e estados | Pode começar com amostras; a validação completa exige coleta e persistência integradas. |
| Persistência | Contratos dos registros | Pode acompanhar coleta e análise. |
| Interface e Atlas | Contratos do backend | Pode começar com respostas de exemplo. |
| Teams | Formato do consolidado e serviço existente | Pode ser validado antes da análise completa. |
| Publicação integrada e teste completo | H1 a H6 e procedimento corporativo de implantação | A preparação pode acompanhar a implementação; o aceite depende da união das frentes. |

Com uma pessoa, essas possibilidades permitem reorganizar o trabalho, mas o cronograma não pressupõe desenvolvimento simultâneo.

### Plano de segunda a sexta-feira

| Dia | Resultado esperado |
|---|---|
| **Segunda** | Preparar o ambiente e validar ECS → GitHub/Bedrock/S3/Teams e integração com Atlas. Confirmar o procedimento de implantação. Coletar dados reais e medir o volume inicial. |
| **Terça** | Implementar coleta com filtros, persistência e primeira versão do agente com análise baseada em evidências e instruções versionadas. |
| **Quarta** | Integrar a orquestração de coleta → análise → persistência → atualização de estado, com tratamento de falhas, fluxo comum para execução manual e automática, agenda diária e controle de ativação. |
| **Quinta** | Integrar interface e consolidado Teams, publicar a versão funcional no ECS e validar o fluxo completo. Testar o envio ao Teams por disparo controlado e documentar implantação e retorno à versão anterior. |
| **Sexta** | Verificar o envio real das 8h, corrigir e republicar se necessário, e demonstrar a versão entregue com execução manual, controles e relatórios. |

A validação da notificação deve ocorrer na quinta-feira, por disparo controlado, para que o envio real das 8h de sexta não seja o primeiro teste.

### Checklist de validação da entrega

- [ ] Versão integrada do agente publicada no ECS, com imagem e versão identificáveis.
- [ ] Configurações, permissões e referências a segredos aplicadas ao ambiente de entrega.
- [ ] Procedimento de implantação e retorno à versão anterior documentado.
- [ ] Orquestração completa de coleta, preparação de contexto, análise, persistência e atualização de estado validada.
- [ ] Execução manual e automática utilizando o mesmo fluxo de processamento.
- [ ] Instruções de análise versionadas e saída validada contra o formato definido.
- [ ] Acesso à interface controlado pelo Atlas.
- [ ] Coleta real executada no ECS.
- [ ] Todas as páginas da API percorridas.
- [ ] Filtros todos, sigla e repositório funcionando.
- [ ] Tratamento de filtro sem resultados.
- [ ] Intervalo diário correto no horário de Brasília.
- [ ] Execuções com sucesso, falha e em andamento incluídas.
- [ ] Recoleta sem duplicação de contagens.
- [ ] Diagnósticos com evidências e limitações explícitas.
- [ ] Dependências de build e upload preservadas nas recomendações.
- [ ] Histórico recuperável no S3.
- [ ] Análise automática às 20h.
- [ ] Desligamento suspendendo ambos os disparos autônomos.
- [ ] Processamento iniciado concluindo após desligamento.
- [ ] Execução manual disponível com o agente desligado.
- [ ] Envio ao Teams validado por disparo controlado na quinta-feira.
- [ ] Consolidado semanal enviado ao Teams.
- [ ] Falhas de coleta e envio visíveis.
- [ ] Fluxo validado com o volume real do piloto.

### Condições para o prazo

A entrega em cinco dias depende de acessos e permissões utilizáveis no primeiro dia, integração viável com Atlas, disponibilidade do serviço Teams e procedimento corporativo de implantação viável no prazo. A construção e a publicação do agente fazem parte desses cinco dias. A versão integrada precisa estar publicada e validada até quinta-feira para permitir o envio real de sexta-feira às 8h.

O volume real de repositórios, execuções e logs deve ser medido na segunda-feira. Não reduzir silenciosamente a cobertura: qualquer limite necessário precisa ser explícito.

## 2 — Complementos importantes

- **Recuperar execuções após o corte diário:** incluir posteriormente execuções iniciadas depois das 20h e atualizar as que estavam em andamento.
- **Recuperar períodos sem processamento:** permitir analisar intervalos anteriores após desligamentos ou falhas.
- **Comparar análises:** identificar recorrência e verificar se alterações resolveram problemas.
- **Acompanhar recomendações:** registrar aceitação, descarte e implementação.
- **Disponibilizar ferramentas via MCP:** caso outros agentes precisem reutilizar a integração.
- **Completar a integração com os motores de MFE e BFF:** conforme a evolução da plataforma, preservando o acesso pelo Atlas no V1.

## 3 — Evoluções possíveis

- Dashboard de falhas e duração por sistema e repositório.
- Indicadores de tempo economizado após melhorias.
- Priorização por impacto e recorrência.
- Memória de decisões e contexto dos sistemas.
- Visão histórica das dependências e oportunidades de paralelismo.
