# Apresentação da Sprint 1 — Arquitetura, Segurança e Modelagem do Backend

Síntese executiva das decisões de arquitetura, estratégia de hospedagem, segurança e modelagem de dados da plataforma para a instituição filantrópica **Fraterno Auxílio Cristão (FAC)** de Garibaldi - RS.

---

## 1. Propósito e Papel do Backend

- **Centralização da Regra de Negócio**:
  - Servir como o núcleo seguro de dados e lógica operacional para alimentar os aplicativos mobile e painéis web.
  - Digitalizar processos operacionais manuais (fichas físicas de papel, controle manual de presença em oficinas e pré-inscrições anuais).
- **Atendimento Institucional**:
  - Plataforma projetada para atender cerca de 150 crianças e adolescentes (5 a 14 anos) em situação de vulnerabilidade nas unidades Glória, São Francisco e São Pedro.

---

## 2. Estratégia de Hospedagem e Infraestrutura (Custo Zero)

- **Viabilidade para o Terceiro Setor**:
  - A premissa central de infraestrutura é a **isenção total de custos recorrentes em nuvem** (como servidores AWS, Azure ou bancos gerenciados), tornando a solução sustentável para a instituição a longo prazo.
- **Modelo de Operação Local (*Self-Hosting*)**:
  - Execução da aplicação e do banco de dados em hardware local próprio disponibilizado pela entidade.
- **Exposição Segura via Cloudflare Tunnel**:
  - **Túnel Criptografado de Saída**: Conecta o servidor local diretamente à rede da Cloudflare sem necessidade de abrir portas no roteador (NAT) e sem IP público estático.
  - **HTTPS de Ponta a Ponta**: Certificados SSL/TLS geridos automaticamente com proteção contra ataques de negação de serviço (DDoS).
  - **Consumo Mobile Transparente**: Os aplicativos dos usuários e colaboradores comunicam-se de forma segura via HTTPS institucional sob um domínio padronizado.

---

## 3. Arquitetura de Segurança e Privacidade (Conformidade LGPD)

- **Proteção Rigorosa de Dados de Menores**:
  - Por envolver dados altamente sensíveis de crianças e adolescentes (saúde, moradia, vulnerabilidade sociofamiliar e registros civis), a arquitetura prioriza o princípio de privilégio mínimo e isolamento de acessos.
- **Autenticação em Dois Níveis (Stateless JWT + Refresh Token)**:
  - **Access Token de Curta Duração (15 minutos)**: Minimiza a janela de vulnerabilidade em caso de interceptação de tráfego.
  - **Refresh Token Seguro com Rotação**: Permite que o aplicativo mobile renove automaticamente a sessão em segundo plano, garantindo usabilidade contínua aos pais sem abrir mão da segurança.
  - **Revogação Instantânea**: Mecanismo que invalida sessões imediatamente em caso de logout ou detecção de anomalias.
- **Controle de Acesso Baseado em Papéis (RBAC)**:
  - **Administrador**: Gestão de colaboradores, aprovação formal de matrículas, controle de vagas e acesso a auditorias.
  - **Colaborador (Educadores/Pedagogos)**: Consulta operacional de turmas, planejamento de oficinas e registro diário de presenças.
  - **Responsável (Pais/Tutores)**: Acesso estritamente restrito aos seus próprios dependentes (solicitação de matrícula, rematrícula, upload de comprovantes e acompanhamento de agenda).
- **Trilha de Auditoria Obrigatória**:
  - Registro sistemático e imutável de qualquer ação de criação, edição, exclusão ou visualização de dados sensíveis na tabela de auditoria, registrando o autor, o recurso afetado, o endereço IP e a data/hora exata do evento.
- **Criptografia de Credenciais**:
  - Armazenamento de senhas protegido por hashing irreversível com algoritmo `bcrypt` e salt dinâmico.

---

## 4. Modelagem de Dados e Modelo de Objetos

O domínio da plataforma foi modelado de forma relacional para garantir consistência cadastral e integridade referencial:

- **Módulo Institucional e Acessos**:
  - **Unidades**: Mapeamento das unidades físicas da FAC (Glória, São Francisco e São Pedro) para segmentação territorial das vagas e atendimentos.
  - **Usuários e Responsáveis**: Separação clara entre a credencial de acesso ao sistema (email/senha) e os atributos civis/profissionais do responsável familiar (CPF, RG, locais de trabalho e telefones de emergência).
- **Módulo de Alunos e Família**:
  - **Alunos**: Registro detalhado da criança/adolescente, compreendendo dados de identificação, histórico de saúde, escola regular de origem, situação de moradia e dados socioeconômicos.
  - **Alunos_Responsáveis (Vínculo Familiar)**: Associação flexível de múltiplos responsáveis por aluno, com indicação explícita do contato familiar prioritário.
- **Módulo de Matrículas e Documentos**:
  - **Matrículas**: Ciclo de vida da vaga dividido por ano letivo e estados bem definidos (`Pré-inscrição`, `Pendente Presencial`, `Aprovada`, `Cancelada`).
  - **Documentos**: Repositório de arquivos comprobatórios exigidos no processo (certidão de nascimento, comprovante de residência, holerite e termo de autorização de imagem e voz).
- **Módulo Pedagógico e Atendimentos**:
  - **Turmas e Enturmação**: Agrupamento por ano letivo e turnos de atendimento (manhã, tarde ou integral) no contraturno escolar.
  - **Eventos de Agenda**: Planejamento de oficinas socioeducativas, reuniões de pais e atendimentos individuais multidisciplinares, com suporte a atividades recorrentes.
  - **Presenças**: Registro nominal diário de frequência com histórico de presenças e justificativas de faltas.

---

## 5. Engenharia do Banco de Dados (SQLite Otimizado)

- **Portabilidade e Facilidade Operacional**:
  - Banco de dados relacional embarcado em arquivo único local, sem a sobrecarga de gerenciar processos complexos de bancos de dados externos.
  - Facilidade de rotinas de backup instantâneo e recuperação de desastres (cópia íntegra de arquivo).
- **Concorrência com Modo WAL (Write-Ahead Logging)**:
  - Permite que múltiplos usuários realizem leituras simultâneas no aplicativo sem serem bloqueados por operações de escrita no banco de dados.
- **Integridade e Desempenho**:
  - Ativação obrigatória de integridade referencial em nível de motor (`foreign_keys = ON`), impedindo dados órfãos ou inconsistências entre alunos e matrículas.
  - Alocação dedicada de memória RAM para cache e processamento de tabelas temporárias, garantindo respostas em milissegundos mesmo em hardware modesto.
