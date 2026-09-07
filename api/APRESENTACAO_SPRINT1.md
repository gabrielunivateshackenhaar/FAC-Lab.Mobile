# Apresentação da Sprint 1 — Backend da Plataforma FAC Garibaldi

Documento síntese com o andamento do projeto, decisões arquiteturais, modelagem de dados e validações técnicas para a apresentação da Sprint 1.

---

## 1. Visão Geral e Entregas da Sprint 1

- **Vinculação e Estruturação do Repositório**:
  - Repositório remoto integrado ao GitHub sob a branch `main`.
  - Estruturação modular com isolamento exclusivo do backend dentro do diretório `api/`.
  - Configuração de políticas de exclusão (`.gitignore`) para credenciais, variáveis de ambiente, binários SQLite e arquivos locais.
- **Fundação do Backend**:
  - Configuração completa do runtime Node.js LTS com TypeScript em modo estrito (`ES2022`).
  - Criação do pipeline de compilação e scripts operacionais (`dev`, `build`, `start`, `test`).
- **Mecanismo de Autenticação e Segurança**:
  - Autenticação stateless com Access Tokens JWT (curta duração: 15 minutos).
  - Mecanismo de renovação automática via Refresh Tokens rotacionáveis (validade: 7 dias) persistidos no banco.
  - Criptografia irreversível de senhas com algoritmo `bcrypt`.
  - Controle de acesso baseado em papéis (RBAC): `ADMINISTRADOR`, `COLABORADOR` e `RESPONSAVEL`.
  - Endpoint de auto-cadastro de responsáveis (`POST /auth/registro-responsavel`) com transação atômica.
- **Trilha de Auditoria (Conformidade LGPD)**:
  - Registro sistemático de ações sensíveis (`CRIAR`, `ATUALIZAR`, `EXCLUIR`, `VISUALIZAR_SENSIVEL`) na tabela `logs_auditoria`.
  - Rastreabilidade com captura de endereço IP, identificador de usuário, recurso e payload do evento.
- **Garantia de Qualidade e Testes**:
  - Suíte de testes automatizados ponta a ponta (E2E) com 16 cenários validados (100% de aprovação).

---

## 2. Decisões Arquiteturais e Padrões Adotados

- **Arquitetura em Camadas (Clean Architecture / Separation of Concerns)**:
  - `config/`: Configurações de ambiente validadas em runtime e singleton de infraestrutura.
  - `core/`: Tipagens globais do domínio e hierarquia semântica de classes de erro.
  - `middlewares/`: Autenticação JWT, autorização RBAC, validação de contrato e manipulador global de exceções.
  - `modules/`: Módulos coesos organizados por domínio de negócio (ex: `auth`, `auditoria`, `health`).
- **Premissa de Infraestrutura de Custo Zero**:
  - Aplicação desenvolvida para operação em modelo *self-hosting* sem custos recorrentes de servidores ou bancos em nuvem.
  - Exposição segura para o aplicativo mobile e web por meio de **Cloudflare Tunnel** (HTTPS ponta a ponta sem necessidade de IP público estático).
- **Padrão de Respostas HTTP (REST Direto - KISS)**:
  - Respostas de sucesso retornam diretamente a entidade ou lista correspondente com códigos de status HTTP semânticos (200, 201, 204), eliminando envelopamento redundante para clientes mobile.
  - Respostas de erro padronizadas em estrutura única (`codigo`, `mensagem`, `detalhes`), facilitando o mapeamento de campos inválidos nas telas do aplicativo.
- **Validação Estrita de Contratos em Tempo de Execução**:
  - Utilização do **Zod** para validação estática e em runtime de todas as variáveis de ambiente (`env.ts`) e payloads HTTP (`schemas.ts`).

---

## 3. Estratégia e Engenharia do Banco de Dados (SQLite)

- **Driver Utilizado**:
  - `better-sqlite3`: Driver síncrono em C para Node.js, oferecendo a mais alta taxa de throughput e latência na ordem de microssegundos em acessos locais.
- **Modo de Operação WAL (Write-Ahead Logging)**:
  - Ativação de `PRAGMA journal_mode = WAL`: permite leituras concorrentes simultâneas sem bloqueio por operações de escrita, essencial para múltiplas requisições simultâneas de usuários e responsáveis.
- **Configuração de Desempenho e Integridade (PRAGMAs)**:
  - `PRAGMA foreign_keys = ON`: Garantia rígida de integridade referencial entre entidades relacionais.
  - `PRAGMA synchronous = NORMAL`: Equilíbrio ótimo entre durabilidade e taxa de transferência de I/O em disco.
  - `PRAGMA busy_timeout = 5000`: Tratamento automático de espera ativa contra exceções de contenção de escrita (`SQLITE_BUSY`).
  - `PRAGMA cache_size = -64000`: Alocação dedicada de 64 MB de memória RAM para cache de páginas do banco.
  - `PRAGMA temp_store = MEMORY`: Execução de ordenações e tabelas temporárias exclusivamente em RAM.
- **Bootstrap e Inicialização Automática**:
  - Execução idempotente do arquivo `database/schema.sql` na inicialização do servidor.
  - Seed automático do usuário administrador inicial (`admin@facgaribaldi.org.br`) caso o banco seja criado do zero.
- **Portabilidade e Backup**:
  - Banco contido em arquivo único local (`database/fac_garibaldi.db`), viabilizando rotinas simples de backup periódico sem necessidade de serviços de gerenciamento de terceiros.

---

## 4. Política de Armazenamento de Arquivos (`files/`)

- **Armazenamento Local Estruturado**:
  - Diretório `api/files/` configurado na raiz do backend, com criação automática na inicialização e ignorado pelo controle de versão.
  - Separação planejada para documentos comprobatórios (certidões, comprovantes de residência e renda) e fotos 3x4 dos alunos.
- **Limites de Proteção**:
  - Teto de **20 MB** para documentos em formato PDF.
  - Teto de **10 MB** para imagens (JPEG/PNG).

---

## 5. Resultados dos Testes Automatizados da Sprint 1

Execução da suíte completa de testes via comando `npm test`:

| Caso de Teste | Rota / Operação | Status Esperado | Status Obtido | Resultado |
| :--- | :--- | :---: | :---: | :---: |
| 1. Integridade da API | `GET /health` | 200 | 200 | Aprovado |
| 2. Autenticação Válida | `POST /auth/login` | 200 | 200 | Aprovado |
| 3. Senha Incorreta | `POST /auth/login` | 401 | 401 | Aprovado |
| 4. Validação de Email/Senha | `POST /auth/login` | 400 | 400 | Aprovado |
| 5. Perfil Autenticado | `GET /auth/me` | 200 | 200 | Aprovado |
| 6. Ausência de Token | `GET /auth/me` | 401 | 401 | Aprovado |
| 7. Token Adulterado | `GET /auth/me` | 401 | 401 | Aprovado |
| 8. Renovação de Token | `POST /auth/refresh` | 200 | 200 | Aprovado |
| 9. Reuso de Token Consumido | `POST /auth/refresh` | 401 | 401 | Aprovado |
| 10. Cadastro de Responsável | `POST /auth/registro-responsavel` | 201 | 201 | Aprovado |
| 11. Conflito por Email/CPF | `POST /auth/registro-responsavel` | 409 | 409 | Aprovado |
| 12. Perfil com Dados de Responsável | `GET /auth/me` | 200 | 200 | Aprovado |
| 13. Revogação de Sessão (Logout) | `POST /auth/logout` | 204 | 204 | Aprovado |
| 14. Refresh Pós-Logout | `POST /auth/refresh` | 401 | 401 | Aprovado |
| 15. Rota Não Encontrada | `GET /rota-inexistente` | 404 | 404 | Aprovado |
| 16. Verificação de Auditoria | Consulta SQLite em `logs_auditoria` | 8 logs | 8 logs | Aprovado |

---

## 6. Próximos Passos (Planejamento para a Sprint 2)

- **Módulo de Unidades e Turmas**: Cadastro das unidades Glória, São Francisco e São Pedro e enturmação por turno.
- **Módulo de Alunos**: Fichas digitais completas de crianças/adolescentes com vínculos parentais e controle de privacidade.
- **Módulo de Matrículas e Inscrições**: Fluxo de pré-inscrição, análise documental presencial e rematrícula anual.
- **Módulo de Agenda e Frequência**: Calendário de eventos institucionais, oficinas diárias e chamadas de presença.
