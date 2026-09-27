# Infrastructure Discovery · Atlas

Módulo demonstrativo, independente e portável do Atlas IDP. Abra `index.html` diretamente ou sirva a pasta da plataforma com um servidor estático. Não exige build nem dependências externas.

## Áreas

- Discovery: inventory filtrável por classificação, detalhe do workload e ownership das seis camadas.
- Cobertura: disponibilidade e lacunas de fontes; Federated State Discovery é opcional.
- Findings: conflitos, fontes ausentes e ownership ainda desconhecido.
- Drift: seleção repo → ambiente → grupo → recurso, summary do plan, histórico e cron. A falta de baseline resulta em `Not evaluated`.
- Adoção: sequência demonstrativa de revisão e preview Backstage sem import ou apply.

Todas as informações são fictícias. Nenhum dado AWS, state, workflow, GitHub, PR ou Backstage é consultado ou alterado. As telas e integrações propostas estão descritas em `docs/spec.md`; `docs/visual-reference.html` preserva a referência visual consolidada.

## Domínio

`core.js` contém classificação por claims confirmados e a regra de estado de Drift sem dependência de DOM. `examples/demo-data.json` reúne fixtures locais. O item `Infrastructure Discovery` está registrado em `atlas.config.js` e depende apenas de `shared/theme` e `shared/navigation`.

## Verificação

`node --test modules/infrastructure-discovery/tests/core.test.cjs`
