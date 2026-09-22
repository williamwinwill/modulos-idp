# Catálogo Backstage · Atlas

Abra `index.html` ou sirva a raiz `atlas-platform` como conteúdo estático. HTML, CSS e JavaScript, sem build ou dependências externas. O motor está isolado em `core.js`, com chave de armazenamento própria `atlas-backstage-v1`. Não altera a configuração ou o cache da página de repositórios; compartilha apenas tema, estilos e layout genérico do grafo.

## Funcionalidades

- Mapa de sistemas, componentes, APIs, recursos, templates, grupos e domínios, incluindo referências para entidades não carregadas.
- Filtro de relações; o inicial é `dependsOn / dependencyOf`.
- Setas com direção, zoom, arraste, enquadramento, expansão e operação por teclado.
- Inspeção de saídas, entradas, JSON original e evidência de uma relação ao clicar na conexão.
- Consulta transitiva de dependências e consumidores, somente por `dependsOn`.
- Cadastro da conexão com o catálogo, consulta manual da API e importação de entidades JSON.
- Exportação de entidades e configuração, sem credencial.
- Tela explicando os tipos de relações e o desenho do motor de produção.

O exemplo contém 10 entidades carregadas, uma referência externa e 19 relações únicas (cinco `dependsOn`). São dados demonstrativos. A rede privada aparece como não carregada para ilustrar um alvo fora da coleta, não como falha comprovada.

## Relações

`core.js` usa `kind:namespace/name` em minúsculas como identidade. Se o namespace da entidade não vier, assume `default`; alvos em `relations[].targetRef` devem ser referências completas.

Os pares conhecidos são consolidados no sentido principal:

| Principal | Inversa |
| --- | --- |
| dependsOn | dependencyOf |
| providesApi | apiProvidedBy |
| consumesApi | apiConsumedBy |
| partOf | hasPart |
| ownedBy | ownerOf |
| childOf | parentOf |
| memberOf | hasMember |

A relação normalizada retém as evidências de ambos os lados. Tipos diferentes entre os mesmos alvos são preservados. Relações customizadas são mantidas sem inventar a inversa. Ciclos não causam expansão infinita nas consultas transitivas.

`spec.dependsOn` é uma declaração do cadastro. O motor lê relações já processadas da API do catálogo. Não executa processors Backstage localmente nem infere relações de `spec` na importação; avisa quando recebe declarações relevantes sem relações processadas.

## Conectar

1. Em **Conexão e JSON**, configure a base da API, por exemplo `https://atlas.empresa.com/api/catalog`, e a URL web do portal.
2. Escolha os kinds e o tamanho de página.
3. Clique em **Consultar Backstage**. Informe, se necessário, um token aceito pela instalação para leitura do catálogo.
4. O motor executa `GET /entities/by-query`, com filtros e limit na primeira página. Nas seguintes, usa o cursor retornado, sem reaplicar os filtros ao cursor.

O adapter é de leitura e foi testado com respostas simuladas; nenhuma instalação real foi fornecida. A chamada direta depende de CORS, autenticação e disponibilidade do endpoint na versão instalada. Tokens ficam só na consulta, não no armazenamento local ou nos arquivos exportados. Redirects são recusados e cada chamada tem timeout de 30s.

O resultado é aplicado apenas após completar a coleta. Falha de uma página mantém o snapshot anterior. Há limites de 1.000 páginas e 50.000 entidades; atingi-los interrompe a consulta com erro explícito. Esses limites não representam uma garantia de desempenho de renderização para catálogos muito grandes.

## JSON

- `examples/connection.json`: configuração inicial sem URL real ou token.
- `examples/entities.json`: payload de exemplo, com spec e relations.
- A importação aceita um array de entidades ou um objeto `{"items": [...]}`. Substitui somente o snapshot local após validação.
- Repetir kind, namespace e name (sem diferenciar caixa) é erro. Um mesmo name em kinds/namespaces distintos é permitido.
- `apiVersion` é versão do esquema de entidade; não representa release de software.

## Produção

O adapter atual é executado no navegador. `docs/MOTOR.md` descreve sua execução futura no backend Atlas, com tarefa de reconciliação, snapshots consistentes, sessão e autorização por escopo. Essa tarefa, persistência compartilhada e API de backend ainda não foram implementadas ou implantadas.

## Verificação

`node --test modules/backstage/tests/core.test.cjs`

Oito testes cobrem inversas, tipos diferentes, namespaces, alvos externos, ciclos e consultas transitivas, declarações não processadas, validação, remoção de tokens do contrato, paginação por cursor e falhas atômicas. Validação no navegador inclui filtro, inspeção de JSON e consumidores, navegação, temas e layout responsivo.
