# ATL-022 · Protótipo de iniciativas de IA

Abra [index.html](index.html) para explorar o protótipo navegável. [source.html](source.html) é o fragmento editável usado na conversa; o index é sua exportação pelo renderizador da skill visualize.

Este diretório preserva o protótipo histórico, com dados fictícios e alterações apenas durante a sessão. Para cadastrar dados reais, use o [módulo Iniciativas de IA](../../../modules/initiatives/README.md), integrado à plataforma e com gravação em JSON pela página.

## Decisões do protótipo

- Visual baseado nos estilos compartilhados de Atlas, Repositórios e Backstage, incluindo menu lateral, tema claro/escuro e cor principal roxa.
- Catálogo de iniciativas separado do menu Indicadores. Busca e filtros por área, tipo e status.
- Várias áreas por iniciativa; áreas iniciais DevOps, Redes, Cloud e Atlas. Cadastro e remoção de áreas sem uso; arquivamento das associadas a iniciativas.
- Tipo opcional e configurável: Agente, MCP, Skill, Assistente, Assistente agêntico e Workflow com IA. Tipos em uso podem ser arquivados; os demais podem ser removidos.
- Nome, descrição, responsável, status, arquitetura, modelo/provedor e múltiplos links identificados por tipo e título.
- Colunas configuráveis e campos personalizados de texto, número, link e data.
- Registros mensais manuais de horas poupadas, redução de gasto, custo de operação (IA e infraestrutura) e tokens. Cada indicador distingue estimado de medido; vazio é diferente de zero.
- Mês e ano selecionáveis na consulta e no formulário de registro. Um registro existente é carregado para edição; um mês novo começa vazio. A troca de mês preserva o rascunho na demonstração, e salvar atualiza somente o mês selecionado.
- Preenchimento do mês informa quantas iniciativas possuem cada dado, separando medidos e estimados. Não é uma avaliação de desempenho.
- Modo de apresentação oculta as ações de edição; é uma opção visual, não controle de acesso.

## Evolução para o módulo real

O módulo real implementa o requisito de salvar pela própria página em `iniciativas.json`, usando um serviço local com controle de revisão e backup. Execute `npm run initiatives` na raiz da plataforma e abra http://127.0.0.1:4382/modules/initiatives/.

Login, delegação de permissões e hospedagem compartilhada ainda não fazem parte do módulo local. Uma página estática no S3, por si só, não implementa a gravação autenticada do arquivo.

## Exportação

Para regenerar `index.html`, execute o `scripts/render.py` da skill visualize com `source.html` como entrada, `index.html` como destino e `--force --title 'Atlas · Protótipo de iniciativas de IA'`. O renderizador inclui o ambiente de apresentação; os estilos próprios do protótipo estão na fonte. Os recursos de apresentação podem depender de CDNs, diferentemente dos módulos portáveis já implementados.

## Verificação desta versão

A exportação é derivada da fonte preservada nesta pasta. As verificações deste protótipo são históricas; a validação funcional do módulo real está nos testes da plataforma e no item ATL-022 do controle compartilhado.
