# Motor Backstage — proposta de separação

O domínio Backstage tem configuração, armazenamento local e motor de consulta próprios. Ele não altera o discovery do GitHub nem as relações manuais do catálogo de repositórios. Somente os estilos e o algoritmo de posicionamento do grafo podem ser compartilhados.

## Dois domínios

| Motor | Identidade | Fonte principal | Relação |
| --- | --- | --- | --- |
| Repositórios | organização/repositório | GitHub e arquivos de controle | consumo de código e versão/ref |
| Catálogo Backstage | kind:namespace/name | API do Software Catalog | dependsOn, providesApi, consumesApi, partOf, ownedBy |

Uma entidade Backstage não equivale necessariamente a um repositório. Um repositório pode hospedar várias entidades; uma API ou um recurso podem não ter repositório próprio. Um vínculo futuro entre motores deve ser explícito, apoiado por annotations/metadados de origem, sem igualar objetos apenas pelo nome.

## Caminho de produção

1. **Adapter:** o backend Atlas autentica na API do catálogo e coleta as páginas de entidades autorizadas. Usa cursor e mantém o contexto da consulta.
2. **Normalizador:** calcula a referência completa de cada entidade, preservando kind e namespace; lê `relations[].targetRef` e normaliza relações inversas.
3. **Grafo:** elimina duplicatas exatas, preserva tipos de relação diferentes e representa referências fora da coleta como não carregadas. Não conclui que estão excluídas ou incorretas.
4. **Snapshot:** grava entidades, relações, data, escopo autorizado e avisos em uma transação; uma consulta incompleta não substitui um snapshot íntegro.
5. **API:** serve o snapshot pela sessão e autorização do Atlas. Um cache coletado com credencial administrativa não deve ser entregue indistintamente a todos os usuários.
6. **Atualização:** uma tarefa do backend faz reconciliação periódica; a interface oferece atualização manual. O catálogo Backstage já processa suas fontes; o motor consome o resultado desse processamento.

Contratos propostos, ainda não implementados como endpoints de backend:

- `GET /api/atlas-backstage/snapshot`
- `GET /api/atlas-backstage/config`
- `POST /api/atlas-backstage/sync`

Nenhuma agenda é criada por esta proposta. Não há escrita, cadastro, exclusão ou refresh de entidades no Backstage pela tela.

## Relações e versões

Usar as relações processadas retornadas pelo catálogo, sem inferir ligações pela nomenclatura ou transformar qualquer annotation em dependência. Campos de spec podem ser material de diagnóstico, mas relações retornadas pelo catálogo são a fonte inicial de visualização.

Relações do catálogo não carregam uma versão Git em uso. `apiVersion` identifica o esquema da entidade (por exemplo, `backstage.io/v1alpha1`), não a versão do software. Versões de plugins/pacotes, actions instaladas e módulos internos pertencem a um inventário da instalação do Backstage, com outro adapter e fontes como manifests/lockfiles/configuração do backend. Não devem ser deduzidas da API do catálogo.

## Referências oficiais

- https://backstage.io/docs/features/software-catalog/software-catalog-api/
- https://backstage.io/docs/features/software-catalog/well-known-relations/
- https://backstage.io/docs/features/software-catalog/descriptor-format/
