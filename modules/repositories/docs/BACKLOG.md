# Backlog — Repositórios Atlas

## 1. Editar tags do repositório

- Distinguir topics/metadados das tags Git usadas para versionamento.
- Permitir as alterações autorizadas, com validação e trilha de auditoria.
- Integrar permissões pelo backend do Atlas/GitHub App.

## 2. Commit da versão em uso no arquivo de controle

- Definir repositório, branch e caminho do YAML/JSON de controle.
- Ao confirmar uma versão em uso, preparar a alteração da relação correspondente.
- Exibir diff e criar commit ou pull request, conforme a política da plataforma.
- Tratar concorrência com SHA/ETag e informar conflitos; não sobrescrever mudanças de outros usuários.
- Refletir na interface a versão persistida somente após confirmação do GitHub.

## 3. Descoberta automática de dependências

- Extrair referências de templates Backstage, fontes de módulos Terraform e arquivos YAML/JSON.
- Preservar versão/ref e localização de origem por relação.
- Distinguir dados extraídos, substituições manuais, referências dinâmicas e não resolvidas.
- Detectar ciclos e impacto em consumidores; integrar atualização por eventos ou agenda no backend.
