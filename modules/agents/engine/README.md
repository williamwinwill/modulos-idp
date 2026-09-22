# Base do agente de análise de CI/CD

Baseada em `../docs/spec.md`. Escolha de exemplo: Python 3.9+,
sem dependências externas. A spec não determina a linguagem.

## História atendida

**H3 — Construir o agente, orquestrar a análise e recomendar melhorias.**

Tarefa sugerida para o backlog: **Implementar o núcleo de orquestração do agente
de análise CI/CD com contratos de coleta, modelo e histórico.**

Como responsável pelas esteiras CI/CD, quero processar as evidências das execuções
em um fluxo único para obter recomendações rastreáveis e consultar o resultado
ou a etapa em que houve falha.

Esta entrega é uma base de implementação da H3, não seu aceite completo.

| Parte entregue | Relação com a spec |
|---|---|
| `AgenteAnaliseCICD.executar` | H3: coleta → contexto → análise → validação → persistência → estado |
| `Solicitacao.criar` | Corte fixado no início, de 00h até o disparo em Brasília |
| `instrucoes-v1.txt` | H3: instruções versionadas, hipóteses e limites de evidência |
| `validar_saida` | H3: valida estrutura, identidade e referências de evidências |
| `Coletor` | Contrato para implementação da H2 |
| `Historico` e demonstração local | Contrato inicial para H4; S3 ainda não implementado |
| Origem manual/automática no mesmo método | Ponto de integração da H5 |

## Fluxo e uso

O backend ou worker recebe uma solicitação, fixa o corte com `Solicitacao.criar`
e chama `agente.executar(solicitacao)`. A mesma solicitação deve ser preservada
em reprocessamentos. A análise é feita por execução, sem seleção apenas de falhas.

Execute a demonstração a partir desta pasta:

```sh
python3 agente.py
```

Ela usa dados fictícios e um modelo simulado. Salva estado e relatório em
`saida-demo/<id>/`. Não acessa GitHub, AWS ou Teams.

Exemplo de composição futura, após implementar os adaptadores:

```python
agente = AgenteAnaliseCICD(coletor_github, modelo_bedrock, historico_s3)
solicitacao = Solicitacao.criar("manual", {"tipo": "sigla", "valor": "SRO"})
relatorio = agente.executar(solicitacao)
```

## O que falta para concluir a história

- H2: coletor real com autorização, filtros, paginação, jobs/steps/logs e evidências
  no S3. Validar o campo temporal e o tratamento de novas tentativas na API real.
- H3: adaptador do modelo autorizado no Bedrock, limites de contexto explícitos,
  tratamento operacional de indisponibilidade e validação com exemplos reais.
  Esta base envia todas as evidências de uma execução; não possui divisão por tokens.
- H4: armazenamento e consultas S3; identidade de execução separada da identidade
  da análise. Recuperação operacional se a própria gravação de estado falhar.
- H5: Atlas, interface, configurações, agendas e idempotência de solicitações.
  O UUID nesta base identifica a análise; não impede cliques repetidos.
- H6/H7: consolidação, Teams e publicação integrada no ECS.

A validação de JSON não prova a correção do diagnóstico: revisar recomendações
com casos reais, inclusive dependência entre build e upload e logs com instruções
maliciosas. O adaptador do modelo deve separar instruções de dados e não oferecer
ferramentas de escrita ao modelo.

Na H5, verificar ligado/desligado antes de aceitar novos disparos automáticos.
O núcleo não verifica essa configuração durante o processamento, permitindo
concluir solicitações já iniciadas. A execução manual permanece permitida.
Não há envio ao Teams neste fluxo; H6 usa agenda independente.

Resultados com falha por execução são parciais, com quantidades conhecidas e
etapa afetada. Coleta completa sem execuções gera relatório concluído e zerado;
falha total de coleta gera estado de falha. Execução provisória pode ter análise
concluída, mantendo o indicador de que o pipeline ainda está em andamento.
