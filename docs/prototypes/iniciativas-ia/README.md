# ATL-022 · Protótipo de iniciativas de IA

Abra [index.html](index.html) para explorar o protótipo navegável. [source.html](source.html) é o fragmento editável usado na conversa; o index é sua exportação pelo renderizador da skill visualize.

Este diretório registra o refinamento de produto. Não instala um quarto módulo, não altera o menu real da plataforma e não implementa persistência. Os dados são fictícios e as alterações duram somente a sessão da demonstração. O item ATL-022 permanece em Refinar.

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

## Persistência a implementar após aprovação

O requisito é salvar pela própria página mantendo um arquivo `iniciativas.json` como base. A proposta é um pequeno serviço de gravação, local inicialmente, com controle de revisão para evitar sobrescritas concorrentes. Hospedagem e acesso compartilhado ainda precisam ser definidos. Uma página estática no S3, por si só, não implementa a gravação autenticada do arquivo.

Login, delegação de permissões, gravação real, integração com S3 e publicação não fazem parte desta entrega. O pedido de commit versiona o protótipo, sem autorizar essas implementações.

## Exportação

Para regenerar `index.html`, execute o `scripts/render.py` da skill visualize com `source.html` como entrada, `index.html` como destino e `--force --title 'Atlas · Protótipo de iniciativas de IA'`. O renderizador inclui o ambiente de apresentação; os estilos próprios do protótipo estão na fonte. Os recursos de apresentação podem depender de CDNs, diferentemente dos módulos portáveis já implementados.

## Verificação desta versão

A exportação é derivada da fonte preservada nesta pasta. A checagem de sintaxe do JavaScript e a inspeção do diff são verificações de empacotamento, não validação funcional do futuro módulo. O item não está concluído.
