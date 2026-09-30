# FAC-Lab.Mobile — Plataforma de Gestão e Agenda (FAC Garibaldi)

Projeto de extensão universitária em Engenharia de Software voltado à concepção e ao desenvolvimento da **Plataforma de Gestão de Atendimentos, Matrículas e Agenda** para o **Fraterno Auxílio Cristão (FAC)** de Garibaldi - RS.

---

## 1. Sobre a Instituição

O **Fraterno Auxílio Cristão (FAC)** é uma entidade filantrópica fundada em 1943 (declarada de Utilidade Pública Municipal pela Lei nº 1145/1972) que presta atendimento socioassistencial e pedagógico no turno inverso escolar a cerca de 150 crianças e adolescentes (5 a 14 anos) em situação de vulnerabilidade social nas unidades Glória, São Francisco e São Pedro.

---

## 2. Objetivos da Solução

- **Digitalização de Matrículas e Rematrículas**: Transição das fichas físicas para fluxo digital estruturado, com controle de pré-inscrições, prazos e validação documental.
- **Gestão de Atendimentos e Presença**: Registro de frequência e acompanhamento diário nas oficinas socioeducativas e pedagógicas.
- **Agenda e Comunicação**: Calendário institucional com agendamento de eventos, oficinas e atividades com responsáveis.
- **Segurança e LGPD**: Conformidade rigorosa com a LGPD para tratamento e sigilo de dados sensíveis de menores de idade, acompanhado por trilha de auditoria.

---

## 3. Estrutura do Repositório

```
FAC-Lab.Mobile/
├── api/                       # Backend RESTful (Node.js, TypeScript, SQLite)
│   ├── AGENTS.md              # Diretrizes técnicas detalhadas do backend
│   ├── API_ROUTES.md          # Documentação completa dos contratos e rotas da API
│   ├── contexto/              # Documentos originais de domínio, fichas e escopo
│   └── database/              # DDL e esquemas do banco de dados (schema.sql)
└── README.md                  # Visão geral do projeto e diretrizes globais
```

---

## 4. Backend (`api/`)

O módulo de backend é projetado com a premissa de **custo zero de infraestrutura em nuvem**, operando em regime de *self-hosting* com exposição segura via **Cloudflare Tunnel**.

### Stack Tecnológica
- **Runtime**: Node.js (LTS)
- **Linguagem**: TypeScript
- **Framework HTTP**: Express.js
- **Banco de Dados**: SQLite 3 (`better-sqlite3`) operando em modo WAL
- **Validação de Contratos**: Zod

Para consultar a especificação completa dos endpoints, contratos e permissões, veja [`api/API_ROUTES.md`](./api/API_ROUTES.md).
Para orientações sobre a arquitetura em camadas, otimizações de banco de dados e padrões de desenvolvimento do backend, consulte [`api/AGENTS.md`](./api/AGENTS.md).

---

## 5. Ambiente de Desenvolvimento e CD

A API de desenvolvimento está implantada e sincronizada continuamente em servidor dedicado (*self-hosted*):

- **URL Pública (HTTPS)**: [`https://fac.vitorzw.win`](https://fac.vitorzw.win)
- **Healthcheck Público**: `GET https://fac.vitorzw.win/health`
- **Acesso Interno (Tailscale)**: `http://100.91.34.80:3333`
- **Deploy Contínuo**: Atualização automática a cada push na branch `main` com verificação a cada 15 segundos e reload via PM2 (`fac-api-dev`).
