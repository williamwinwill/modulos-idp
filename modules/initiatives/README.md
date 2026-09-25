# Iniciativas de IA

Módulo local para cadastrar iniciativas e apresentar resultados à liderança. Usa o tema e a navegação compartilhados do Atlas, sem framework, CDN, build ou instalação de pacotes.

## Usar

Na pasta da plataforma, com Node.js 18 ou superior:

```sh
npm run initiatives
```

Abra **http://127.0.0.1:4382/modules/initiatives/**. Mantenha o terminal aberto durante o uso. O serviço também oferece a página inicial e os demais módulos do Atlas na mesma porta. Abrir o HTML diretamente ou usar um servidor estático mostra a orientação para iniciar o serviço, sem fingir que salvou dados.

A primeira execução cria uma base **vazia** em `modules/initiatives/data/iniciativas.json`. Ela é o arquivo de dados real; cada ação de salvar grava ali. Essa pasta é ignorada pelo Git. Para outra localização, use `ATLAS_INITIATIVES_DATA=/caminho/iniciativas.json`; para outra porta, use `ATLAS_INITIATIVES_PORT=4383`.

## Fluxos

- **Iniciativas:** cadastro, edição e exclusão, busca e filtros por área, tipo e status. Cada iniciativa pode ter várias áreas e um tipo opcional. Arquitetura, responsável, modelo/provedor e links são opcionais.
- **Indicadores:** selecione mês/ano para consultar horas poupadas, redução de gasto, custo de IA e infraestrutura e tokens. Os totais distinguem medido de estimado; valor vazio não equivale a zero. Iniciativas em uso e distribuição por estágio representam o status atual, não uma reconstrução histórica.
- **Registro mensal:** abra uma iniciativa, clique em Registrar indicadores/Editar registro e escolha o mês. Salvar atualiza somente o período selecionado. Rascunhos de outros meses permanecem na memória da aba, não no arquivo; salve cada mês antes de fechá-la.
- **Configurações:** áreas, tipos, colunas e campos extras de texto, número, data e link. Categorias em uso são arquivadas; as sem uso podem ser removidas. Arquivar preserva o vínculo das iniciativas existentes. Excluir um campo remove também seus valores, após confirmação.
- **Apresentar:** oculta controles de edição para uma apresentação. É um modo visual, não autenticação.

Os tipos iniciais são Agente, MCP, Skill, Assistente, Assistente agêntico e Workflow com IA. O preenchimento do mês conta os valores informados, incluindo zero e estimativas, e não avalia desempenho.

## Gravação e recuperação

O servidor valida todo o documento, verifica a revisão e usa troca atômica de arquivo. Antes de cada gravação, mantém a versão anterior em `iniciativas.json.bak`. Se outra aba salvar primeiro, a segunda recebe um conflito e conserva os campos em edição. Use **Recarregar base**, revise o formulário preservado e salve novamente. Os campos que você alterou são preservados; os demais recebem a versão atual da base. Se ambos editaram o mesmo campo, revise seu valor antes de salvar.

**Exportar dados** baixa o último estado confirmado pelo servidor. Para transportar os dados entre computadores, pare o serviço, copie o JSON e inicie o serviço apontando para ele. Dados e backups são excluídos da exportação de código do módulo. Não substitua manualmente o JSON enquanto houver editores ativos.

Se uma interrupção deixar `iniciativas.json.lock`, pare todas as instâncias do serviço antes de remover esse arquivo de bloqueio. Se a base estiver corrompida, ela não será sobrescrita automaticamente: com o serviço parado, preserve uma cópia e restaure o `.bak` verificado.

## Escopo local

O servidor escuta somente em `127.0.0.1`, sem expor a base na rede. Outra pessoa pode usar o módulo no mesmo computador ou receber a pasta e o JSON para trabalhar em sua própria cópia. Edição compartilhada entre computadores exige hospedagem autenticada a definir; este serviço não deve ser exposto publicamente. S3 estático pode hospedar a interface, mas não substitui a API de gravação.

Limites: documento de até 8 MB, 2.000 iniciativas, 200 áreas/tipos, 50 campos extras e 1.200 registros mensais por iniciativa. Períodos aceitos entre 1900-01 e 9999-12.

## Verificar e exportar

```sh
node tools/test.mjs
node tools/export-module.mjs initiatives ../atlas-iniciativas
```

Os testes cobrem validação, cálculos, persistência, reinício, revisão concorrente, backup, proteção de rotas e portabilidade. A exportação inicia com base vazia.
