# Documentação das Rotas da API — FAC-Lab.Mobile

Documento técnico com a especificação completa de todas as rotas e contratos da API RESTful do **Fraterno Auxílio Cristão (FAC)** de Garibaldi - RS.

---

## 1. Informações Gerais

- **Ambiente Padrão**: `http://localhost:3333`
- **Formato de Comunicação**: JSON (`application/json`) para a maioria dos endpoints e `multipart/form-data` para envio de arquivos.
- **Formato de Datas**: ISO 8601 (`YYYY-MM-DDTHH:mm:ss`) ou formato específico (`YYYY-MM-DD`) quando indicado.
- **Padrão de Autenticação**: Bearer Token (JSON Web Token - JWT). Deve ser enviado no cabeçalho HTTP:
  ```http
  Authorization: Bearer <TOKEN_JWT>
  ```

### Perfis de Acesso (RBAC)
- **`ADMINISTRADOR`**: Acesso irrestrito a todas as rotas de gestão, enturmação, homologação de matrículas e auditoria.
- **`COLABORADOR`**: Acesso a visualização operacional, agenda de eventos, chamada de presenças e relatórios (com restrição a dados sensíveis de menores sob a LGPD).
- **`RESPONSAVEL`**: Acesso restrito e focado na consulta e movimentação exclusiva de seus dependentes diretos (solicitação de matrícula, upload de documentos e frequência).

### Formato Padrão de Erro
Todas as respostas de erro seguem o contrato padronizado:
```json
{
  "codigo": "DADOS_INVALIDOS",
  "mensagem": "Dados de entrada invalidos",
  "detalhes": [
    {
      "campo": "email",
      "mensagem": "Email em formato invalido"
    }
  ]
}
```

---

## 2. Índice de Módulos

1. [Health Check](#health-check)
2. [Autenticação (`/auth`)](#autenticação-auth)
3. [Unidades Institucionais (`/unidades`)](#unidades-institucionais-unidades)
4. [Alunos (`/alunos`)](#alunos-alunos)
5. [Turmas (`/turmas`)](#turmas-turmas)
6. [Matrículas (`/matriculas`)](#matrículas-matriculas)
7. [Documentos (`/documentos`)](#documentos-documentos)
8. [Agenda e Eventos (`/agenda`)](#agenda-e-eventos-agenda)
9. [Presenças e Frequência (`/presencas`)](#presenças-e-frequência-presencas)
10. [Auditoria (`/auditoria`)](#auditoria-auditoria)

---

## Health Check

### `GET /health`
Verifica a disponibilidade da API e o status de conexão com o banco de dados SQLite.

- **Autenticação**: Nenhuma (Pública).
- **Resposta Sucesso (200 OK)**:
  ```json
  {
    "status": "ok",
    "banco": "conectado",
    "timestamp": "2026-09-29T23:00:00.000Z"
  }
  ```

---

## Autenticação (`/auth`)

### `POST /auth/login`
Autentica o usuário no sistema gerando token de acesso JWT e token de renovação (*refresh token*).

- **Autenticação**: Nenhuma (Pública).
- **Corpo da Requisição (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `email` | string | Sim | E-mail cadastrado (formato válido) |
  | `senha` | string | Sim | Senha do usuário (mínimo 6 caracteres) |
- **Resposta Sucesso (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "48bfaec0-...",
    "usuario": {
      "id": "18f8b8ce-...",
      "email": "admin@facgaribaldi.org.br",
      "papel": "ADMINISTRADOR",
      "status": "ATIVO"
    }
  }
  ```
- **Erros Comuns**: `400 DADOS_INVALIDOS`, `401 CREDENCIAIS_INVALIDAS`, `401 USUARIO_INATIVO`.

---

### `POST /auth/refresh`
Gera um novo token JWT de acesso através de um refresh token válido.

- **Autenticação**: Nenhuma (Pública).
- **Corpo da Requisição (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `refreshToken` | string | Sim | Token de renovação ativo |
- **Resposta Sucesso (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "6b2a0c62-..."
  }
  ```
- **Erros Comuns**: `400 DADOS_INVALIDOS`, `401 TOKEN_INVALIDO`.

---

### `POST /auth/registro-responsavel`
Auto-registro de responsáveis por alunos na plataforma, gerando conta com perfil `RESPONSAVEL`.

- **Autenticação**: Nenhuma (Pública).
- **Corpo da Requisição (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `nome` | string | Sim | Nome completo (mínimo 3 caracteres) |
  | `email` | string | Sim | E-mail único no sistema |
  | `senha` | string | Sim | Senha (mínimo 6 caracteres) |
  | `cpf` | string | Não | CPF único (11 dígitos numéricos) |
  | `rg` | string | Não | Documento de identidade |
  | `parentesco` | string | Sim | Grau de parentesco (ex: Mãe, Pai, Avó, Tutor) |
  | `telefone` | string | Sim | Telefone de contato (mínimo 8 dígitos) |
  | `localTrabalho` | string | Não | Nome da empresa ou local de trabalho |
  | `telefoneTrabalho`| string | Não | Telefone profissional |
- **Resposta Sucesso (201 Created)**:
  ```json
  {
    "mensagem": "Responsavel registrado com sucesso",
    "usuarioId": "d63d63c9-...",
    "responsavelId": "0e9bc513-..."
  }
  ```
- **Erros Comuns**: `400 DADOS_INVALIDOS`, `409 EMAIL_JA_CADASTRADO`, `409 CPF_JA_CADASTRADO`.

---

### `GET /auth/me`
Retorna os dados do perfil do usuário autenticado a partir do token JWT.

- **Autenticação**: Obrigatória (`Bearer <token>`).
- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`, `RESPONSAVEL`.
- **Resposta Sucesso (200 OK)**:
  ```json
  {
    "id": "d63d63c9-...",
    "email": "maria@exemplo.com",
    "papel": "RESPONSAVEL",
    "status": "ATIVO",
    "criado_em": "2026-09-29 18:00:00",
    "responsavel_id": "0e9bc513-...",
    "responsavel_nome": "Maria Silva",
    "responsavel_telefone": "54999998888"
  }
  ```
- **Erros Comuns**: `401 TOKEN_INVALIDO`, `404 USUARIO_NAO_ENCONTRADO`.

---

### `POST /auth/logout`
Invalida o refresh token no banco de dados e encerra a sessão ativa.

- **Autenticação**: Opcional.
- **Corpo da Requisição (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `refreshToken` | string | Não | Token de renovação a ser revogado |
- **Resposta Sucesso (204 No Content)**.

---

## Unidades Institucionais (`/unidades`)

Todas as rotas exigem cabeçalho `Authorization: Bearer <token>`.

### `GET /unidades`
Lista todas as unidades físicas de atendimento do FAC.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`, `RESPONSAVEL`.
- **Resposta Sucesso (200 OK)**:
  ```json
  [
    {
      "id": "unidade-gloria-id",
      "nome": "Unidade Glória",
      "endereco": "Rua Exemplo, 100",
      "telefone": "5434620001",
      "criado_em": "2026-01-01 08:00:00",
      "atualizado_em": "2026-01-01 08:00:00"
    }
  ]
  ```

---

### `GET /unidades/:id`
Obtém detalhes de uma unidade institucional pelo identificador.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`, `RESPONSAVEL`.
- **Parâmetros de Rota**:
  | Parâmetro | Tipo | Descrição |
  | :--- | :--- | :--- |
  | `id` | string | Identificador da unidade |
- **Resposta Sucesso (200 OK)**: Objeto da unidade correspondente.
- **Erros Comuns**: `404 UNIDADE_NAO_ENCONTRADA`.

---

## Alunos (`/alunos`)

Todas as rotas exigem cabeçalho `Authorization: Bearer <token>`.

### `POST /alunos`
Cadastra um novo aluno no sistema.

- **Permissões**: `ADMINISTRADOR`.
- **Corpo da Requisição (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `nomeCompleto` | string | Sim | Nome completo (mínimo 2 caracteres) |
  | `sexo` | string | Não | `'M'`, `'F'` ou `'OUTRO'` |
  | `dataNascimento` | string | Sim | Formato `YYYY-MM-DD` |
  | `naturalidade` | string | Não | Cidade natal |
  | `ufNaturalidade` | string | Não | UF com 2 caracteres |
  | `cpf` | string | Não | 11 dígitos numéricos (único) |
  | `rg` | string | Não | Registro geral |
  | `religiao` | string | Não | Religião da família |
  | `enderecoLogradouro` | string | Sim | Logradouro / Rua |
  | `enderecoNumero` | string | Sim | Número residencial |
  | `enderecoBairro` | string | Sim | Bairro |
  | `enderecoCidade` | string | Sim | Município |
  | `telefoneRecado` | string | Não | Telefone adicional para recados |
  | `problemasSaude` | string | Não | Alergias, laudos ou observações de saúde |
  | `escolaRegular` | string | Não | Escola formal de turno regular |
  | `serieEscolar` | string | Não | Ano/série na escola regular |
  | `situacaoMoradia` | string | Não | `'PROPRIA'`, `'ALUGADA'`, `'CEDIDA'`, `'OUTRO'` |
  | `vinculoMatrimonialPais` | string | Não | Estado civil / vínculo dos responsáveis |
  | `fotoUrl` | string | Não | URL da foto do aluno |
  | `status` | string | Não | `'ATIVO'` (padrão), `'INATIVO'`, `'LISTA_ESPERA'` |
  | `observacoes` | string | Não | Observações gerais |
  | `responsavelId` | string | Não | ID de responsável para vínculo imediato |
  | `contatoPrincipal` | boolean | Não | Se é o contato principal (padrão `true`) |
- **Resposta Sucesso (201 Created)**: Objeto do aluno cadastrado.
- **Erros Comuns**: `400 DADOS_INVALIDOS`, `403 FORBIDDEN`, `409 CONFLICT` (CPF duplicado).

---

### `GET /alunos`
Lista alunos cadastrados com suporte a busca, filtros e paginação.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`, `RESPONSAVEL`.
  - **`RESPONSAVEL`**: Lista apenas os seus dependentes vinculados.
  - **`COLABORADOR`**: Campos sensíveis (`situacao_moradia`, `vinculo_matrimonial_pais`) retornam nulos por diretriz LGPD.
- **Parâmetros de Consulta (*Query Parameters*)**:
  | Parâmetro | Tipo | Padrão | Descrição |
  | :--- | :--- | :--- | :--- |
  | `nome` | string | - | Busca parcial por nome do aluno |
  | `status` | string | - | Filtro por `'ATIVO'`, `'INATIVO'` ou `'LISTA_ESPERA'` |
  | `unidadeId` | string | - | Filtrar por alunos matriculados na unidade |
  | `turmaId` | string | - | Filtrar por alunos alocados na turma |
  | `limite` | integer | `50` | Quantidade de registros por página |
  | `pagina` | integer | `1` | Número da página |
- **Resposta Sucesso (200 OK)**:
  ```json
  [
    {
      "id": "aluno-uuid",
      "nome_completo": "Lucas Silva",
      "sexo": "M",
      "data_nascimento": "2015-05-10",
      "status": "ATIVO",
      "endereco_cidade": "Garibaldi"
    }
  ]
  ```

---

### `GET /alunos/:id`
Consulta detalhes do aluno e seus responsáveis vinculados.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`, `RESPONSAVEL`.
  - Responsáveis acessam somente dados de seus dependentes.
  - Consultas com perfil `ADMINISTRADOR` geram log de auditoria `VISUALIZAR_SENSIVEL`.
- **Parâmetros de Rota**:
  | Parâmetro | Tipo | Descrição |
  | :--- | :--- | :--- |
  | `id` | string | Identificador do aluno |
- **Resposta Sucesso (200 OK)**: Objeto do aluno contendo a propriedade `responsaveis: [...]`.
- **Erros Comuns**: `403 FORBIDDEN`, `404 ALUNO_NAO_ENCONTRADO`.

---

### `PUT /alunos/:id`
Atualiza os dados cadastrais do aluno.

- **Permissões**: `ADMINISTRADOR`.
- **Parâmetros de Rota**: `id` (string).
- **Corpo da Requisição**: Mesmos campos de `POST /alunos` (todos opcionais).
- **Resposta Sucesso (200 OK)**: Objeto atualizado do aluno.
- **Erros Comuns**: `400 DADOS_INVALIDOS`, `404 ALUNO_NAO_ENCONTRADO`.

---

### `DELETE /alunos/:id`
Inativação lógica do aluno (altera status para `INATIVO`).

- **Permissões**: `ADMINISTRADOR`.
- **Parâmetros de Rota**: `id` (string).
- **Resposta Sucesso (204 No Content)**.

---

### `POST /alunos/:id/responsaveis`
Vincula um responsável existente a um aluno.

- **Permissões**: `ADMINISTRADOR`.
- **Parâmetros de Rota**: `id` (string) — ID do aluno.
- **Corpo da Requisição (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `responsavelId` | string | Sim | Identificador do responsável cadastrado |
  | `contatoPrincipal` | boolean | Não | Define contato prioritário (padrão `false`) |
- **Resposta Sucesso (200 OK)**:
  ```json
  {
    "mensagem": "Responsavel vinculado com sucesso"
  }
  ```

---

### `DELETE /alunos/:id/responsaveis/:responsavelId`
Desvincula um responsável do aluno.

- **Permissões**: `ADMINISTRADOR`.
- **Parâmetros de Rota**:
  | Parâmetro | Tipo | Descrição |
  | :--- | :--- | :--- |
  | `id` | string | Identificador do aluno |
  | `responsavelId` | string | Identificador do responsável |
- **Resposta Sucesso (204 No Content)**.

---

## Turmas (`/turmas`)

Todas as rotas exigem cabeçalho `Authorization: Bearer <token>`.

### `POST /turmas`
Cadastra uma nova turma.

- **Permissões**: `ADMINISTRADOR`.
- **Corpo da Requisição (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `unidadeId` | string | Sim | Identificador da unidade de atendimento |
  | `nome` | string | Sim | Nome da turma (ex: "Turma A - Manhã") |
  | `turno` | string | Sim | `'MANHA'`, `'TARDE'` ou `'INTEGRAL'` |
  | `anoLetivo` | integer | Sim | Ano letivo (entre 2020 e 2050) |
- **Resposta Sucesso (201 Created)**: Objeto da turma criada.

---

### `GET /turmas`
Lista turmas cadastradas com contador de alunos vinculados.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`.
- **Parâmetros de Consulta (*Query Parameters*)**:
  | Parâmetro | Tipo | Descrição |
  | :--- | :--- | :--- |
  | `unidadeId` | string | Filtrar turmas por unidade |
  | `anoLetivo` | integer | Filtrar por ano letivo |
- **Resposta Sucesso (200 OK)**: Array de turmas com o campo `total_alunos`.

---

### `GET /turmas/:id`
Obtém detalhes de uma turma.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`.
- **Parâmetros de Rota**: `id` (string).
- **Resposta Sucesso (200 OK)**: Dados da turma.

---

### `PUT /turmas/:id`
Atualiza dados da turma.

- **Permissões**: `ADMINISTRADOR`.
- **Parâmetros de Rota**: `id` (string).
- **Corpo da Requisição**: Campos parciais (`unidadeId`, `nome`, `turno`, `anoLetivo`).
- **Resposta Sucesso (200 OK)**: Dados atualizados da turma.

---

### `DELETE /turmas/:id`
Exclui uma turma cadastrada.

- **Permissões**: `ADMINISTRADOR`.
- **Parâmetros de Rota**: `id` (string).
- **Resposta Sucesso (204 No Content)**.

---

### `POST /turmas/:id/alunos`
Aloca um aluno individual na turma.

- **Permissões**: `ADMINISTRADOR`.
- **Parâmetros de Rota**: `id` (string) — ID da turma.
- **Corpo da Requisição (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `alunoId` | string | Sim | Identificador do aluno a ser enturmado |
- **Resposta Sucesso (200 OK)**:
  ```json
  {
    "mensagem": "Aluno enturmado com sucesso"
  }
  ```

---

### `POST /turmas/:id/alunos/lote`
Aloca múltiplos alunos na turma em lote.

- **Permissões**: `ADMINISTRADOR`.
- **Parâmetros de Rota**: `id` (string) — ID da turma.
- **Corpo da Requisição (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `alunoIds` | array de strings | Sim | Lista com ao menos um ID de aluno |
- **Resposta Sucesso (200 OK)**:
  ```json
  {
    "mensagem": "Alunos enturmados em lote com sucesso"
  }
  ```

---

### `DELETE /turmas/:id/alunos/:alunoId`
Desaloca/remove o aluno da turma.

- **Permissões**: `ADMINISTRADOR`.
- **Parâmetros de Rota**:
  | Parâmetro | Tipo | Descrição |
  | :--- | :--- | :--- |
  | `id` | string | Identificador da turma |
  | `alunoId` | string | Identificador do aluno |
- **Resposta Sucesso (204 No Content)**.

---

### `GET /turmas/:id/alunos`
Lista os alunos que pertencem à turma especificada.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`.
- **Parâmetros de Rota**: `id` (string) — ID da turma.
- **Resposta Sucesso (200 OK)**:
  ```json
  [
    {
      "id": "aluno-uuid",
      "nome_completo": "Lucas Silva",
      "data_nascimento": "2015-05-10",
      "status": "ATIVO",
      "enturmado_em": "2026-02-15 08:30:00"
    }
  ]
  ```

---

## Matrículas (`/matriculas`)

Todas as rotas exigem cabeçalho `Authorization: Bearer <token>`.

### `POST /matriculas`
Inicia um processo de matrícula, rematrícula ou pré-inscrição para um aluno.

- **Permissões**: `ADMINISTRADOR`, `RESPONSAVEL`.
  - Usuários com perfil `RESPONSAVEL` só podem solicitar matrícula para seus próprios dependentes vinculados.
- **Corpo da Requisição (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `alunoId` | string | Sim | Identificador do aluno |
  | `unidadeId` | string | Sim | Identificador da unidade de interesse |
  | `anoLetivo` | integer | Sim | Ano letivo de atendimento (2020 a 2050) |
  | `tipo` | string | Sim | `'PRE_INSCRICAO'`, `'MATRICULA_NOVA'`, `'REMATRICULA'` |
  | `rendaFamiliar` | number | Não | Renda familiar mensal bruta (não negativa) |
  | `numeroDependentes` | integer | Não | Número total de dependentes da família |
- **Resposta Sucesso (201 Created)**: Objeto da matrícula criada (status inicial padrão: `PENDENTE_PRESENCIAL`).
- **Erros Comuns**: `400 DADOS_INVALIDOS`, `403 FORBIDDEN`, `409 CONFLICT` (matrícula já ativa no mesmo ano letivo).

---

### `GET /matriculas`
Lista solicitações de matrícula com filtros e paginação.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`, `RESPONSAVEL`.
  - Responsáveis visualizam apenas as matrículas de seus dependentes.
- **Parâmetros de Consulta (*Query Parameters*)**:
  | Parâmetro | Tipo | Padrão | Descrição |
  | :--- | :--- | :--- | :--- |
  | `status` | string | - | `'PENDENTE_PRESENCIAL'`, `'ENVIADA'`, `'APROVADA'`, `'REJEITADA'`, `'CANCELADA'` |
  | `unidadeId` | string | - | Filtrar por unidade |
  | `anoLetivo` | integer | - | Filtrar por ano letivo |
  | `alunoId` | string | - | Filtrar por aluno |
  | `tipo` | string | - | `'PRE_INSCRICAO'`, `'MATRICULA_NOVA'`, `'REMATRICULA'` |
  | `limite` | integer | `50` | Registros por página |
  | `pagina` | integer | `1` | Página atual |
- **Resposta Sucesso (200 OK)**: Array com a lista de matrículas.

---

### `GET /matriculas/:id`
Consulta detalhes da matrícula e a lista de documentos já anexados.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`, `RESPONSAVEL`.
- **Parâmetros de Rota**: `id` (string).
- **Resposta Sucesso (200 OK)**: Objeto detalhado da matrícula contendo `documentos: [...]`.

---

### `PATCH /matriculas/:id/homologar`
Homologa a solicitação de matrícula, aprovando ou rejeitando o pedido.

- **Permissões**: `ADMINISTRADOR`.
- **Parâmetros de Rota**: `id` (string).
- **Corpo da Requisição (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `status` | string | Sim | `'APROVADA'` ou `'REJEITADA'` |
  | `motivoRejeicao` | string | Condicional | Obrigatório caso status seja `'REJEITADA'` |
- **Resposta Sucesso (200 OK)**: Objeto da matrícula homologada com `data_aprovacao` preenchida.

---

### `PATCH /matriculas/:id/contribuicao`
Confirma ou atualiza a quitação da contribuição financeira/espiritual voluntária.

- **Permissões**: `ADMINISTRADOR`.
- **Parâmetros de Rota**: `id` (string).
- **Corpo da Requisição (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `contribuicaoPaga` | boolean | Sim | Indica se a taxa/contribuição foi paga |
- **Resposta Sucesso (200 OK)**: Objeto da matrícula com `contribuicao_paga` atualizada.

---

### `DELETE /matriculas/:id`
Cancela a matrícula solicitada (define status como `CANCELADA`).

- **Permissões**: `ADMINISTRADOR`, `RESPONSAVEL`.
- **Parâmetros de Rota**: `id` (string).
- **Resposta Sucesso (204 No Content)**.

---

## Documentos (`/documentos`)

Todas as rotas exigem cabeçalho `Authorization: Bearer <token>`.

### `POST /documentos/matricula/:matriculaId`
Realiza o upload de arquivos e documentos comprobatórios exigidos para o processo de matrícula.

- **Permissões**: `ADMINISTRADOR`, `RESPONSAVEL`.
- **Formato da Requisição**: `multipart/form-data`
- **Parâmetros de Rota**:
  | Parâmetro | Tipo | Descrição |
  | :--- | :--- | :--- |
  | `matriculaId` | string | Identificador da matrícula associada |
- **Campos do Formulário**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `arquivo` | Arquivo binário | Sim | Tamanho máx: 10MB. Tipos aceitos: PDF, JPEG, PNG, WEBP |
  | `tipoDocumento` | string | Sim | `'DOC_ALUNO'`, `'DOC_RESPONSAVEL'`, `'COMPROVANTE_RESIDENCIA'`, `'COMPROVANTE_RENDA'`, `'TERMO_IMAGEM_VOZ'`, `'FOTO_3X4'`, `'OUTRO'` |
- **Resposta Sucesso (201 Created)**:
  ```json
  {
    "id": "doc-uuid",
    "matricula_id": "mat-uuid",
    "tipo_documento": "COMPROVANTE_RESIDENCIA",
    "caminho_arquivo": ".../files/hash.pdf",
    "nome_arquivo": "comprovante_luz.pdf",
    "tipo_mime": "application/pdf",
    "tamanho_bytes": 1048576,
    "enviado_em": "2026-09-29 20:15:00"
  }
  ```

---

### `GET /documentos/matricula/:matriculaId`
Lista os metadados dos documentos anexados a uma matrícula.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`, `RESPONSAVEL`.
- **Parâmetros de Rota**: `matriculaId` (string).
- **Resposta Sucesso (200 OK)**: Array com a lista de documentos da matrícula.

---

### `GET /documentos/:id`
Realiza o download / streaming do arquivo do documento.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`, `RESPONSAVEL`.
- **Parâmetros de Rota**: `id` (string) — ID do documento.
- **Cabeçalhos de Resposta**:
  - `Content-Type`: Tipo MIME original do arquivo (ex: `application/pdf`, `image/png`).
  - `Content-Disposition`: `inline; filename="nome_arquivo"`.
- **Resposta Sucesso (200 OK)**: Conteúdo binário do arquivo.

---

### `DELETE /documentos/:id`
Exclui o arquivo do armazenamento local e remove o registro do banco de dados.

- **Permissões**: `ADMINISTRADOR`, `RESPONSAVEL`.
- **Parâmetros de Rota**: `id` (string).
- **Resposta Sucesso (204 No Content)**.

---

## Agenda e Eventos (`/agenda`)

Todas as rotas exigem cabeçalho `Authorization: Bearer <token>`.

### `POST /agenda/eventos`
Cadastra um evento, reunião ou oficina socioeducativa na agenda da instituição.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`.
- **Corpo da Requisição (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `unidadeId` | string | Sim | Identificador da unidade onde ocorrerá o evento |
  | `turmaId` | string | Não | Identificador da turma vinculada (se aplicável) |
  | `titulo` | string | Sim | Título da atividade (mínimo 2 caracteres) |
  | `descricao` | string | Não | Descrição detalhada da atividade |
  | `tipoEvento` | string | Sim | `'OFICINA'`, `'REUNIAO_FAMILIAR'`, `'ATENDIMENTO_INDIVIDUAL'`, `'EVENTO_GERAL'` |
  | `dataHoraInicio` | string | Sim | Início em formato ISO 8601 |
  | `dataHoraFim` | string | Sim | Término em formato ISO 8601 |
  | `ehRecorrente` | boolean | Não | Flag indicando se é atividade periódica (padrão `false`) |
  | `regraRecorrencia` | string | Não | Especificação textual da periodicidade |
- **Resposta Sucesso (201 Created)**: Objeto do evento criado.

---

### `GET /agenda/eventos`
Lista eventos da agenda com filtros de período, unidade, turma e tipo.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`, `RESPONSAVEL`.
- **Parâmetros de Consulta (*Query Parameters*)**:
  | Parâmetro | Tipo | Descrição |
  | :--- | :--- | :--- |
  | `dataInicio` | string | Data/hora mínima de início |
  | `dataFim` | string | Data/hora máxima de término |
  | `unidadeId` | string | Filtrar por unidade |
  | `turmaId` | string | Filtrar por turma |
  | `tipoEvento` | string | Filtrar por tipo (`'OFICINA'`, `'REUNIAO_FAMILIAR'`, etc.) |
- **Resposta Sucesso (200 OK)**: Array com a lista de eventos.

---

### `GET /agenda/eventos/:id`
Obtém detalhes de um evento específico.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`, `RESPONSAVEL`.
- **Parâmetros de Rota**: `id` (string).
- **Resposta Sucesso (200 OK)**: Objeto detalhado do evento.

---

### `PUT /agenda/eventos/:id`
Atualiza os dados de um evento da agenda.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`.
- **Parâmetros de Rota**: `id` (string).
- **Corpo da Requisição**: Campos parciais de `POST /agenda/eventos`.
- **Resposta Sucesso (200 OK)**: Objeto atualizado do evento.

---

### `DELETE /agenda/eventos/:id`
Remove um evento da agenda.

- **Permissões**: `ADMINISTRADOR`.
- **Parâmetros de Rota**: `id` (string).
- **Resposta Sucesso (204 No Content)**.

---

## Presenças e Frequência (`/presencas`)

Todas as rotas exigem cabeçalho `Authorization: Bearer <token>`.

### `POST /presencas/evento/:eventoId`
Registra ou atualiza a chamada/frequência de múltiplos alunos para uma determinada oficina ou evento.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`.
- **Parâmetros de Rota**:
  | Parâmetro | Tipo | Descrição |
  | :--- | :--- | :--- |
  | `eventoId` | string | Identificador do evento na agenda |
- **Corpo da Requisição (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  | :--- | :--- | :--- | :--- |
  | `presencas` | array de objetos | Sim | Lista de presenças a serem registradas (mínimo 1) |
  | `presencas[].alunoId` | string | Sim | Identificador do aluno |
  | `presencas[].presente` | boolean | Sim | `true` se presente, `false` se ausente |
  | `presencas[].justificativa` | string | Não | Justificativa em caso de ausência |
- **Resposta Sucesso (200 OK)**:
  ```json
  {
    "mensagem": "Presencas registradas com sucesso"
  }
  ```

---

### `GET /presencas/evento/:eventoId`
Lista a frequência registrada para todos os alunos em um evento específico.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`.
- **Parâmetros de Rota**: `eventoId` (string).
- **Resposta Sucesso (200 OK)**:
  ```json
  [
    {
      "id": "presenca-uuid",
      "evento_agenda_id": "evento-uuid",
      "aluno_id": "aluno-uuid",
      "aluno_nome": "Lucas Silva",
      "presente": 1,
      "justificativa": null,
      "registrado_em": "2026-09-29 15:30:00"
    }
  ]
  ```

---

### `GET /presencas/aluno/:alunoId`
Obtém o relatório consolidado de assiduidade de um aluno, com histórico completo de chamadas.

- **Permissões**: `ADMINISTRADOR`, `COLABORADOR`, `RESPONSAVEL`.
  - Responsáveis só podem acessar a frequência de seus dependentes diretos.
- **Parâmetros de Rota**: `alunoId` (string).
- **Resposta Sucesso (200 OK)**:
  ```json
  {
    "alunoId": "aluno-uuid",
    "nomeCompleto": "Lucas Silva",
    "totalEventos": 20,
    "totalPresencas": 18,
    "totalFaltas": 2,
    "percentualPresenca": 90,
    "historico": [
      {
        "eventoId": "evento-uuid",
        "tituloEvento": "Oficina de Música",
        "dataHoraInicio": "2026-09-28T14:00:00",
        "presente": true,
        "justificativa": null
      }
    ]
  }
  ```

---

## Auditoria (`/auditoria`)

Rotas de controle de segurança e conformidade com a LGPD.

### `GET /auditoria`
Consulta trilha de auditoria de operações do sistema (quem fez, o que alterou, quando e IP).

- **Autenticação**: Obrigatória (`Bearer <token>`).
- **Permissões**: Exclusivo `ADMINISTRADOR`.
- **Parâmetros de Consulta (*Query Parameters*)**:
  | Parâmetro | Tipo | Padrão | Descrição |
  | :--- | :--- | :--- | :--- |
  | `usuarioId` | string | - | Filtrar por usuário executor |
  | `acao` | string | - | `'CRIAR'`, `'ATUALIZAR'`, `'EXCLUIR'`, `'VISUALIZAR_SENSIVEL'` |
  | `recurso` | string | - | Tabela ou recurso (ex: `'alunos'`, `'matriculas'`) |
  | `dataInicio` | string | - | Data inicial |
  | `dataFim` | string | - | Data final |
  | `limite` | integer | `50` | Registros por página |
  | `pagina` | integer | `1` | Página atual |
- **Resposta Sucesso (200 OK)**:
  ```json
  [
    {
      "id": "audit-uuid",
      "usuario_id": "user-uuid",
      "usuario_email": "admin@facgaribaldi.org.br",
      "acao": "VISUALIZAR_SENSIVEL",
      "recurso": "alunos",
      "recurso_id": "aluno-uuid",
      "detalhes": "{\"alunoId\":\"aluno-uuid\",\"motivo\":\"Acesso a ficha cadastral sensivel\"}",
      "endereco_ip": "127.0.0.1",
      "criado_em": "2026-09-29 19:40:12"
    }
  ]
  ```
