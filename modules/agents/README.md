# Agente CI/CD — interface H5

Abra `index.html` no navegador. A interface está separada em `index.html`, `style.css` e `app.js`, sem dependências externas ou etapa de build. O núcleo Python opcional fica em `engine/` e a especificação em `docs/spec.md`. Pode ser servido como página estática. As rotas são `#overview`, `#history` e `#settings`.

## O que está implementado

- Visão geral com estado do agente, indicadores da última análise, agendas e solicitações recentes.
- Histórico pesquisável por ID ou escopo, filtro por estado e consulta ao relatório.
- Configuração de horário diário, dia/horário do consolidado e escopo padrão.
- Execução manual com escopo independente e corte fixado no instante da confirmação, no fuso de Brasília.
- Simulação de processamento, conclusão, coleta parcial, falha e ausência de execuções.
- Desligamento sem bloquear execução manual nem interromper o processamento simulado.
- Prevenção de cliques repetidos enquanto há uma análise em andamento na página.
- Persistência demonstrativa em localStorage, chave `atlas-cicd-h5-v1`.
- Layout responsivo, controles rotulados, foco visível, diálogos nativos e suporte a movimento reduzido.

Todos os dados, recomendações, perfis e repositórios são exemplos. Agendas são exibidas, mas não executadas pelo navegador. A identidade visual do Atlas é uma proposta, não uma reprodução de seu design system oficial.

## Integração com o Atlas/BFF

O contrato real não foi fornecido. Os endpoints abaixo são uma proposta para alinhar com o BFF existente, não APIs já integradas.

| Operação | Contrato sugerido |
| --- | --- |
| Obter configuração | `GET /api/cicd-agent/config` |
| Atualizar configuração | `PATCH /api/cicd-agent/config`, com versão/ETag |
| Listar repositórios autorizados | `GET /api/cicd-agent/repositories` com paginação |
| Solicitar análise manual | `POST /api/cicd-agent/analyses`, com `Idempotency-Key` |
| Consultar solicitações | `GET /api/cicd-agent/analyses?status=&scope=&cursor=` |
| Consultar resultado | `GET /api/cicd-agent/analyses/{id}` |

Configuração: `enabled`, `daily`, `weekly`, `weekday` (0=domingo), `scope` (`all`, `sigla`, `repo`), `value` e `timezone: America/Sao_Paulo`.

Solicitação manual: enviar escopo e valor. O backend deve fixar o corte usando seu relógio e retornar identificador, origem, intervalo com offset, estado e contagens. No modelo do protótipo, `found` e `pending` podem ser `null` quando desconhecidos. Em produção, distinguir estado do processamento, completude da coleta e quantidade de execuções; um resultado vazio não é falha.

### Pontos de substituição no HTML

1. Substituir `seed`, carregamento inicial e `persist` pelas chamadas ao BFF. Não armazenar tokens em localStorage.
2. Trocar a criação local de registros e `setTimeout`/`finish` pelo POST idempotente e consulta de status por polling ou eventos. Remover o seletor “Resultado da simulação”.
3. Substituir `repos` pela lista autorizada, com busca/paginação se necessário.
4. Preencher `openReport` com os achados reais. Hoje ele mostra um único exemplo detalhado, não uma lista real das recomendações contadas.
5. Utilizar sessão, permissões e proteção CSRF do Atlas/BFF. O HTML não autentica usuários e não aplica autorização; todos os acessos devem ser validados no servidor.
6. Usar as próximas execuções calculadas pelo backend. `nextRun` serve apenas para a apresentação demonstrativa.
7. Agendas, notificações, histórico no S3 e processamento ECS/Bedrock pertencem ao backend. A suspensão precisa ser verificada no disparo de ambas as agendas; reativação não deve recuperar disparos perdidos.
8. Aplicar idempotência no servidor, inclusive entre abas e clientes. O bloqueio do botão no protótipo é apenas proteção de interface.

O estado ligado/desligado é salvo imediatamente. Agenda e escopo são salvos pelo botão “Salvar configurações”. Para integração por iframe, alinhar CSP `frame-ancestors`, sessão e origem autorizada; para integração direta, adaptar o CSS e a navegação ao shell do Atlas. Não há necessidade de pressupor um novo motor de MFE.

## Design system leve

Tokens no `:root`: fundo `#f7f8fa`, superfície branca, texto `#202631`, bordas `#e6e9ee` e cor primária `#4559db`. Tipografia nativa do sistema. Componentes: botão primário/secundário, status, switch, cartões, tabela, filtros, formulário, aviso e diálogo. Breakpoints em 1150px e 720px.

## Limites do protótipo

Não há conexão com Atlas, GitHub, S3, ECS, Bedrock ou Teams. As agendas não disparam tarefas reais. A cobertura automática termina no corte diário, e o consolidado deve considerar apenas dados disponíveis dos sete dias anteriores. A regra de sigla ainda precisa ser validada contra os nomes reais. Autenticação, idempotência distribuída e persistência real são necessários antes do uso em produção.

## Tema e catálogo Atlas

A página carrega tema e navegação de `../../shared/`, com tema escuro inicial e alternância persistente. Os módulos disponíveis no menu são definidos em `../../atlas.config.js`. Para transportar apenas Agentes, use o exportador descrito no README da raiz. O catálogo de repositórios possui seu próprio motor de discovery do GitHub. A simulação do agente CI/CD continua independente e sem conexão com serviços.
