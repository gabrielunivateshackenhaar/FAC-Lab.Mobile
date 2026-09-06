PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA cache_size = -64000;
PRAGMA temp_store = MEMORY;

CREATE TABLE IF NOT EXISTS unidades (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    endereco TEXT,
    telefone TEXT,
    criado_em TEXT NOT NULL DEFAULT (DATETIME('now')),
    atualizado_em TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    papel TEXT NOT NULL CHECK (papel IN ('ADMINISTRADOR', 'COLABORADOR', 'RESPONSAVEL')),
    status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'PENDENTE_APROVACAO')),
    criado_em TEXT NOT NULL DEFAULT (DATETIME('now')),
    atualizado_em TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE TABLE IF NOT EXISTS responsaveis (
    id TEXT PRIMARY KEY,
    usuario_id TEXT UNIQUE REFERENCES usuarios(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE,
    rg TEXT,
    parentesco TEXT NOT NULL,
    telefone TEXT NOT NULL,
    local_trabalho TEXT,
    telefone_trabalho TEXT,
    criado_em TEXT NOT NULL DEFAULT (DATETIME('now')),
    atualizado_em TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE TABLE IF NOT EXISTS alunos (
    id TEXT PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    sexo TEXT CHECK (sexo IN ('M', 'F', 'OUTRO')),
    data_nascimento TEXT NOT NULL,
    naturalidade TEXT,
    uf_naturalidade TEXT,
    cpf TEXT UNIQUE,
    rg TEXT,
    religiao TEXT,
    endereco_logradouro TEXT NOT NULL,
    endereco_numero TEXT NOT NULL,
    endereco_bairro TEXT NOT NULL,
    endereco_cidade TEXT NOT NULL,
    telefone_recado TEXT,
    problemas_saude TEXT,
    escola_regular TEXT,
    serie_escolar TEXT,
    situacao_moradia TEXT CHECK (situacao_moradia IN ('PROPRIA', 'ALUGADA', 'CEDIDA', 'OUTRO')),
    vinculo_matrimonial_pais TEXT,
    foto_url TEXT,
    status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'LISTA_ESPERA')),
    observacoes TEXT,
    criado_em TEXT NOT NULL DEFAULT (DATETIME('now')),
    atualizado_em TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE TABLE IF NOT EXISTS alunos_responsaveis (
    aluno_id TEXT NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    responsavel_id TEXT NOT NULL REFERENCES responsaveis(id) ON DELETE RESTRICT,
    contato_principal INTEGER NOT NULL DEFAULT 0 CHECK (contato_principal IN (0, 1)),
    criado_em TEXT NOT NULL DEFAULT (DATETIME('now')),
    PRIMARY KEY (aluno_id, responsavel_id)
);

CREATE TABLE IF NOT EXISTS matriculas (
    id TEXT PRIMARY KEY,
    aluno_id TEXT NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    unidade_id TEXT NOT NULL REFERENCES unidades(id) ON DELETE RESTRICT,
    ano_letivo INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('PRE_INSCRICAO', 'MATRICULA_NOVA', 'REMATRICULA')),
    status TEXT NOT NULL DEFAULT 'PENDENTE_PRESENCIAL' CHECK (status IN ('PENDENTE_PRESENCIAL', 'ENVIADA', 'APROVADA', 'REJEITADA', 'CANCELADA')),
    renda_familiar REAL,
    numero_dependentes INTEGER,
    data_solicitacao TEXT NOT NULL DEFAULT (DATE('now')),
    data_aprovacao TEXT,
    motivo_rejeicao TEXT,
    contribuicao_paga INTEGER NOT NULL DEFAULT 0 CHECK (contribuicao_paga IN (0, 1)),
    criado_em TEXT NOT NULL DEFAULT (DATETIME('now')),
    atualizado_em TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE TABLE IF NOT EXISTS documentos (
    id TEXT PRIMARY KEY,
    matricula_id TEXT NOT NULL REFERENCES matriculas(id) ON DELETE CASCADE,
    tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('DOC_ALUNO', 'DOC_RESPONSAVEL', 'COMPROVANTE_RESIDENCIA', 'COMPROVANTE_RENDA', 'TERMO_IMAGEM_VOZ', 'FOTO_3X4', 'OUTRO')),
    caminho_arquivo TEXT NOT NULL,
    nome_arquivo TEXT NOT NULL,
    tipo_mime TEXT NOT NULL,
    tamanho_bytes INTEGER NOT NULL,
    enviado_em TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE TABLE IF NOT EXISTS turmas (
    id TEXT PRIMARY KEY,
    unidade_id TEXT NOT NULL REFERENCES unidades(id) ON DELETE RESTRICT,
    nome TEXT NOT NULL,
    turno TEXT NOT NULL CHECK (turno IN ('MANHA', 'TARDE', 'INTEGRAL')),
    ano_letivo INTEGER NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (DATETIME('now')),
    atualizado_em TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE TABLE IF NOT EXISTS turmas_alunos (
    turma_id TEXT NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    aluno_id TEXT NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    enturmado_em TEXT NOT NULL DEFAULT (DATETIME('now')),
    PRIMARY KEY (turma_id, aluno_id)
);

CREATE TABLE IF NOT EXISTS eventos_agenda (
    id TEXT PRIMARY KEY,
    unidade_id TEXT NOT NULL REFERENCES unidades(id) ON DELETE RESTRICT,
    turma_id TEXT REFERENCES turmas(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('OFICINA', 'REUNIAO_FAMILIAR', 'ATENDIMENTO_INDIVIDUAL', 'EVENTO_GERAL')),
    data_hora_inicio TEXT NOT NULL,
    data_hora_fim TEXT NOT NULL,
    eh_recorrente INTEGER NOT NULL DEFAULT 0 CHECK (eh_recorrente IN (0, 1)),
    regra_recorrencia TEXT,
    criado_em TEXT NOT NULL DEFAULT (DATETIME('now')),
    atualizado_em TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE TABLE IF NOT EXISTS presencas (
    id TEXT PRIMARY KEY,
    evento_agenda_id TEXT NOT NULL REFERENCES eventos_agenda(id) ON DELETE CASCADE,
    aluno_id TEXT NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    presente INTEGER NOT NULL DEFAULT 1 CHECK (presente IN (0, 1)),
    justificativa TEXT,
    registrado_em TEXT NOT NULL DEFAULT (DATETIME('now')),
    UNIQUE (evento_agenda_id, aluno_id)
);

CREATE TABLE IF NOT EXISTS logs_auditoria (
    id TEXT PRIMARY KEY,
    usuario_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
    acao TEXT NOT NULL CHECK (acao IN ('CRIAR', 'ATUALIZAR', 'EXCLUIR', 'VISUALIZAR_SENSIVEL')),
    recurso TEXT NOT NULL,
    recurso_id TEXT,
    detalhes TEXT,
    endereco_ip TEXT,
    criado_em TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_papel ON usuarios(papel);

CREATE INDEX IF NOT EXISTS idx_alunos_nome_completo ON alunos(nome_completo);
CREATE INDEX IF NOT EXISTS idx_alunos_cpf ON alunos(cpf);
CREATE INDEX IF NOT EXISTS idx_alunos_status ON alunos(status);

CREATE INDEX IF NOT EXISTS idx_responsaveis_cpf ON responsaveis(cpf);
CREATE INDEX IF NOT EXISTS idx_responsaveis_nome ON responsaveis(nome);

CREATE INDEX IF NOT EXISTS idx_matriculas_aluno_id ON matriculas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_status ON matriculas(status);
CREATE INDEX IF NOT EXISTS idx_matriculas_ano_letivo ON matriculas(ano_letivo);

CREATE INDEX IF NOT EXISTS idx_documentos_matricula_id ON documentos(matricula_id);

CREATE INDEX IF NOT EXISTS idx_turmas_unidade_ano ON turmas(unidade_id, ano_letivo);

CREATE INDEX IF NOT EXISTS idx_eventos_agenda_unidade_periodo ON eventos_agenda(unidade_id, data_hora_inicio, data_hora_fim);
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_tipo ON eventos_agenda(tipo_evento);

CREATE INDEX IF NOT EXISTS idx_presencas_evento_aluno ON presencas(evento_agenda_id, aluno_id);

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_usuario ON logs_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_recurso ON logs_auditoria(recurso, recurso_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_criado_em ON logs_auditoria(criado_em);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expira_em TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

