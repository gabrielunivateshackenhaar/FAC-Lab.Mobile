# Plataforma de Gestão e Agenda - FAC Garibaldi (Backend API)

Projeto de extensão universitária em Engenharia de Software voltado ao desenvolvimento do backend da **Plataforma de Gestão de Atendimentos, Matrículas e Agenda** para a instituição filantrópica **Fraterno Auxílio Cristão (FAC)** de Garibaldi - RS.

---

## 1. Contexto Institucional e Propósito

- **Entidade Beneficiária**: Fraterno Auxílio Cristão (FAC), fundada em 1943 e declarada de Utilidade Pública Municipal (Lei nº 1145/1972).
- **Atuação**: Atendimento socioassistencial e pedagógico no turno inverso escolar a cerca de 150 crianças e adolescentes (5 a 14 anos) em situação de vulnerabilidade.
- **Unidades Físicas**: Unidade Glória, Unidade São Francisco e Unidade São Pedro.
- **Objetivo do Sistema**: Digitalizar fichas físicas de matrícula, controlar pré-inscrições e rematrículas anuais, gerenciar oficinas/atendimentos diários e garantir conformidade com a LGPD no tratamento de dados de menores.

---

## 2. Escopo e Responsabilidades

- **Responsabilidade Deste Repositório**: Desenvolvimento exclusivo do **Backend da Aplicação** (API RESTful HTTPS).
- **Consumidores da API**: Aplicativos mobile e painéis web desenvolvidos pelos demais membros da equipe.
- **Premissa de Infraestrutura**: **Custo zero de infraestrutura em nuvem**. A aplicação será executada em modelo *self-hosting* utilizando **Cloudflare Tunnel** para entrega segura via HTTPS, sem necessidade de IP público fixo ou custos recorrentes além do domínio institucional.

---

## 3. Stack Tecnológica

| Componente | Tecnologia | Justificativa |
| :--- | :--- | :--- |
| **Runtime** | Node.js (LTS) | Ecossistema maduro, assíncrono e leve |
| **Linguagem** | TypeScript | Tipagem estrita, contratos bem definidos e robustez |
| **Framework Web** | Express.js | Simplicidade, alta flexibilidade e baixo overhead |
| **Banco de Dados** | SQLite 3 (`better-sqlite3`) | Alta performance local, portabilidade e facilidade de backup (arquivo único) |
| **Túnel de Conexão** | Cloudflare Tunnel | Exposição segura da API local para HTTPS sem portas abertas |
| **Validação de Dados**| Zod | Validação de schemas e contratos em tempo de execução |

---

## 4. Diretrizes de Arquitetura e Código

### 4.1. Arquitetura em Camadas
O backend segue separação de responsabilidades (Clean Architecture / Ports & Adapters simplificado):
- **Domínio (`domain`)**: Entidades de negócio e contratos de repositório.
- **Casos de Uso (`usecases`)**: Lógica e regras de negócio da aplicação.
- **Repositórios (`repositories`)**: Acesso a dados via SQLite com queries otimizadas.
- **Controladores e Rotas (`controllers`, `routes`)**: Handlers HTTP e middlewares Express.

### 4.2. Padrões de Código e Clean Code
- **Zero Comentários Óbvios**: Código autoexplicativo por meio de nomenclatura semântica e funções puras e coesas.
- **Nomenclatura**:
  - Tabelas, colunas, enums e dados do banco: estritamente em **português** (`snake_case`).
  - Classes, Interfaces e Types: `PascalCase`.
  - Métodos, variáveis e propriedades: `camelCase`.
  - Constantes globais: `UPPER_SNAKE_CASE`.
- **Princípios SOLID, DRY e KISS**: Evitar complexidade acidental e abstrações prematuras.

### 4.3. Otimizações de Banco de Dados (SQLite)
A conexão com o banco opera no modo de desempenho máximo com os seguintes `PRAGMAs`:
- `PRAGMA journal_mode = WAL;` (Leituras concorrentes sem travamento de escrita)
- `PRAGMA synchronous = NORMAL;` (I/O seguro e balanceado)
- `PRAGMA foreign_keys = ON;` (Integridade referencial ativa)
- `PRAGMA busy_timeout = 5000;` (Prevenção de erros `SQLITE_BUSY`)
- `PRAGMA cache_size = -64000;` (Alocação de 64MB de cache em memória)
- `PRAGMA temp_store = MEMORY;` (Tabelas temporárias armazenadas em RAM)

### 4.4. Segurança e LGPD
- **Proteção de Dados Sensíveis**: Isolamento dos dados de crianças e adolescentes com controle de acesso baseado em papéis (`ADMINISTRADOR`, `COLABORADOR`, `RESPONSAVEL`).
- **Trilha de Auditoria**: Registro centralizado de operações em `logs_auditoria` (quem alterou, o que alterou e quando).

---

## 5. Estrutura do Backend (`api/`)

```
api/
├── AGENTS.md                  # Especificações técnicas e diretrizes do backend
├── contexto/                  # Documentos originais de domínio, fichas e escopo
├── database/
│   └── schema.sql             # Definição completa da DDL em SQLite
├── src/                       # Código-fonte da aplicação
├── tests/                     # Testes automatizados (unitários e integração)
└── package.json
```