interface TestResult {
  id: number;
  categoria: string;
  cenario: string;
  esperado: string;
  recebido: number;
  statusText: string;
  sucesso: boolean;
  detalhes?: unknown;
  bugDetectado?: string;
}

const BASE_URL = process.env.API_URL || 'https://fac.vitorzw.win';

async function request(
  path: string,
  method: string,
  body?: unknown,
  token?: string
): Promise<{ status: number; data: any; raw: string }> {
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const raw = await response.text();
  let data: any = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  return { status: response.status, data, raw };
}

async function runBugHuntingSuite() {
  console.log(`================================================================`);
  console.log(`  BATERIA EXPLORATÓRIA DE TESTES E BUSCA DE BUGS NA API`);
  console.log(`  Alvo: ${BASE_URL}`);
  console.log(`================================================================\n`);

  const results: TestResult[] = [];
  let testId = 1;

  function registrar(
    categoria: string,
    cenario: string,
    esperado: string,
    res: { status: number; data: any },
    validacao: (status: number, data: any) => { ok: boolean; bug?: string }
  ) {
    const { ok, bug } = validacao(res.status, res.data);
    const item: TestResult = {
      id: testId++,
      categoria,
      cenario,
      esperado,
      recebido: res.status,
      statusText: res.status >= 200 && res.status < 300 ? 'OK' : 'FAIL',
      sucesso: ok,
      detalhes: res.data,
      bugDetectado: bug
    };

    results.push(item);
    const prefix = ok ? '✓ [PASSOU]' : '✗ [BUG / FALHA]';
    console.log(`${prefix} #${item.id} [${categoria}] ${cenario}`);
    console.log(`   Esperado: ${esperado} | Recebido: ${res.status}`);
    if (bug) {
      console.log(`   ALERTA: ${bug}`);
    }
    console.log('');
  }

  // 1. Obter Token de Administrador
  console.log('--- ETAPA 1: AUTENTICAÇÃO E RBAC ---\n');

  const authAdmin = await request('/auth/login', 'POST', {
    email: 'admin@facgaribaldi.org.br',
    senha: 'Admin@123456'
  });

  if (authAdmin.status !== 200 || !authAdmin.data?.accessToken) {
    console.error('Falha crítica ao obter token de admin. Abortando bateria.');
    return;
  }

  const adminToken = authAdmin.data.accessToken;

  // Criar responsável comum para testar RBAC
  const emailResp = `resp.teste.${Date.now()}@teste.com`;
  const regResp = await request('/auth/registro-responsavel', 'POST', {
    nome: 'Responsavel Ficticio Para Teste',
    email: emailResp,
    senha: 'SenhaValida@123',
    parentesco: 'Mãe',
    telefone: '54999998888'
  });

  const authResp = await request('/auth/login', 'POST', {
    email: emailResp,
    senha: 'SenhaValida@123'
  });

  const respToken = authResp.data?.accessToken;

  // Teste 1: SQL Injection em Login
  const sqliLogin = await request('/auth/login', 'POST', {
    email: "' OR '1'='1' --",
    senha: 'qualquer_senha'
  });
  registrar(
    'Segurança / Autenticação',
    'Tentativa de SQL Injection no campo de email de login',
    '400 (Bad Request pelo Zod) ou 401 (Credenciais invalidas)',
    sqliLogin,
    (s) => ({ ok: s === 400 || s === 401, bug: s === 500 ? 'Erro 500 em SQL Injection no login' : undefined })
  );

  // Teste 2: Token JWT malformado
  const tokenInvalido = await request('/unidades', 'GET', undefined, 'Bearer token_totalmente_invalido_123');
  registrar(
    'Segurança / Autenticação',
    'Bearer token com assinatura forjada/adulterada',
    '401 (Nao autorizado)',
    tokenInvalido,
    (s) => ({ ok: s === 401, bug: s === 500 ? 'Exceção não tratada ao verificar token' : undefined })
  );

  // Teste 3: Cabeçalho Authorization malformado (sem "Bearer ")
  const authHeaderQuebrado = await request('/unidades', 'GET', undefined, 'TokenSemBearerXYZ');
  registrar(
    'Segurança / Autenticação',
    'Cabeçalho Authorization fora do padrão RFC 6750',
    '401 (Nao autorizado)',
    authHeaderQuebrado,
    (s) => ({ ok: s === 401, bug: s === 500 ? 'Erro 500 com header de autorização atípico' : undefined })
  );

  // Teste 4: RBAC - Responsável tentando acessar trilha de auditoria
  const auditResp = await request('/auditoria', 'GET', undefined, respToken);
  registrar(
    'Segurança / RBAC',
    'Responsável tentando acessar rota restrita de auditoria (/auditoria)',
    '403 (Proibido)',
    auditResp,
    (s) => ({ ok: s === 403, bug: s === 200 ? 'Falha grave de autorização (vazamento de auditoria para Responsavel)' : undefined })
  );

  console.log('--- ETAPA 2: CADASTRO E GESTÃO DE ALUNOS (VALIDAÇÕES E BOUNDARIES) ---\n');

  // Teste 5: CPF com tamanho inválido (10 dígitos)
  const cpfCurto = await request('/alunos', 'POST', {
    nomeCompleto: 'Aluno Teste CPF Curto',
    dataNascimento: '2015-05-10',
    cpf: '1234567890',
    enderecoLogradouro: 'Rua Teste',
    enderecoNumero: '100',
    enderecoBairro: 'Centro',
    enderecoCidade: 'Garibaldi'
  }, adminToken);
  registrar(
    'Alunos / Validação',
    'Cadastro com CPF de apenas 10 dígitos',
    '400 (DADOS_INVALIDOS)',
    cpfCurto,
    (s) => ({ ok: s === 400, bug: s === 201 ? 'Permitiu salvar CPF incompleto de 10 dígitos' : undefined })
  );

  // Teste 6: CPF com letras
  const cpfComLetras = await request('/alunos', 'POST', {
    nomeCompleto: 'Aluno Teste CPF Letras',
    dataNascimento: '2015-05-10',
    cpf: '1234567890A',
    enderecoLogradouro: 'Rua Teste',
    enderecoNumero: '100',
    enderecoBairro: 'Centro',
    enderecoCidade: 'Garibaldi'
  }, adminToken);
  registrar(
    'Alunos / Validação',
    'Cadastro com caracteres alfabéticos no CPF',
    '400 (DADOS_INVALIDOS)',
    cpfComLetras,
    (s) => ({ ok: s === 400, bug: s === 201 ? 'Permitiu salvar CPF contendo letras' : undefined })
  );

  // Teste 7: Inserção válida de aluno 1
  const cpfUnico1 = `${Math.floor(10000000000 + Math.random() * 89999999999)}`;
  const alunoValido1 = await request('/alunos', 'POST', {
    nomeCompleto: 'Maria Eduarda Silveira (Fictícia)',
    sexo: 'F',
    dataNascimento: '2016-08-20',
    cpf: cpfUnico1,
    enderecoLogradouro: 'Avenida Independência',
    enderecoNumero: '450',
    enderecoBairro: 'Glória',
    enderecoCidade: 'Garibaldi',
    telefoneRecado: '5499887766'
  }, adminToken);
  registrar(
    'Alunos / Fluxo Normal',
    'Criação de aluno com dados válidos',
    '201 (Created)',
    alunoValido1,
    (s) => ({ ok: s === 201, bug: s !== 201 ? 'Falha ao criar aluno válido' : undefined })
  );
  const alunoId1 = alunoValido1.data?.id;

  // Teste 8: CPF duplicado (Tentando cadastrar Aluno 2 com o mesmo CPF do Aluno 1)
  const cpfDuplicado = await request('/alunos', 'POST', {
    nomeCompleto: 'João Carlos Silveira (Fictício Duplicado)',
    dataNascimento: '2017-01-15',
    cpf: cpfUnico1,
    enderecoLogradouro: 'Avenida Independência',
    enderecoNumero: '450',
    enderecoBairro: 'Glória',
    enderecoCidade: 'Garibaldi'
  }, adminToken);
  registrar(
    'Alunos / Unicidade',
    'Tentativa de cadastrar segundo aluno com CPF já existente',
    '409 (Conflito) ou 400',
    cpfDuplicado,
    (s, d) => ({
      ok: s === 409 || s === 400,
      bug: s === 500 ? 'Erro 500 não tratado de violação de UNIQUE no SQLite' : s === 201 ? 'Permitiu CPF duplicado!' : undefined
    })
  );

  // Teste 9: SQL Injection em busca de alunos (Query Params)
  const sqliAlunos = await request("/alunos?nome=' OR '1'='1", 'GET', undefined, adminToken);
  registrar(
    'Alunos / Segurança',
    'SQL Injection na query string de busca (?nome=\' OR \'1\'=\'1)',
    '200 (busca literal limpa sem quebra de sintaxe)',
    sqliAlunos,
    (s) => ({ ok: s === 200, bug: s === 500 ? 'Query quebrou com SQL Injection' : undefined })
  );

  // Teste 10: Atualização com ID inexistente
  const alunoNaoExiste = await request('/alunos/00000000-0000-0000-0000-000000000000', 'PUT', {
    nomeCompleto: 'Nome Fantasma'
  }, adminToken);
  registrar(
    'Alunos / Resiliência',
    'Atualização cadastral de aluno com UUID inexistente',
    '404 (Nao encontrado)',
    alunoNaoExiste,
    (s) => ({ ok: s === 404, bug: s === 500 ? 'Erro 500 ao atualizar ID inexistente' : undefined })
  );

  console.log('--- ETAPA 3: TURMAS E ALOCAÇÃO DE VAGAS ---\n');

  // Obter unidade válida
  const unidades = await request('/unidades', 'GET', undefined, adminToken);
  const unidadeId = unidades.data?.[0]?.id || 'unidade-gloria';

  // Teste 11: Criar turma com turno inválido
  const turnoInvalido = await request('/turmas', 'POST', {
    unidadeId,
    nome: 'Turma Turno Inválido',
    turno: 'NOITE', // Enum só permite MANHA, TARDE, INTEGRAL
    anoLetivo: 2026
  }, adminToken);
  registrar(
    'Turmas / Validação',
    'Criar turma com turno fora do enum (ex: NOITE)',
    '400 (DADOS_INVALIDOS)',
    turnoInvalido,
    (s) => ({ ok: s === 400, bug: s === 201 ? 'Permitiu turno inválido' : undefined })
  );

  // Teste 12: Criar turma válida
  const turmaValida = await request('/turmas', 'POST', {
    unidadeId,
    nome: 'Oficina Robótica e Artes - Manhã',
    turno: 'MANHA',
    anoLetivo: 2026
  }, adminToken);
  registrar(
    'Turmas / Fluxo Normal',
    'Criação de turma com parâmetros válidos',
    '201 (Created)',
    turmaValida,
    (s) => ({ ok: s === 201, bug: s !== 201 ? 'Falha ao criar turma válida' : undefined })
  );
  const turmaId = turmaValida.data?.id;

  // Teste 13: Alocar aluno inexistente na turma
  const alocarInexistente = await request(`/turmas/${turmaId}/alunos`, 'POST', {
    alunoId: '00000000-0000-0000-0000-000000000000'
  }, adminToken);
  registrar(
    'Turmas / Integridade',
    'Tentativa de alocar aluno inexistente na turma',
    '404 (Aluno nao encontrado)',
    alocarInexistente,
    (s) => ({ ok: s === 404, bug: s === 500 ? 'Erro 500 de Foreign Key ao alocar aluno inexistente' : undefined })
  );

  // Teste 14: Alocação válida de aluno
  const alocarOk = await request(`/turmas/${turmaId}/alunos`, 'POST', {
    alunoId: alunoId1
  }, adminToken);
  registrar(
    'Turmas / Fluxo Normal',
    'Alocação de aluno válido na turma',
    '200 (OK)',
    alocarOk,
    (s) => ({ ok: s === 200, bug: s !== 200 ? 'Falha ao enturmar aluno' : undefined })
  );

  // Teste 15: Alocação duplicada do mesmo aluno na mesma turma (Idempotência)
  const alocarDuplicado = await request(`/turmas/${turmaId}/alunos`, 'POST', {
    alunoId: alunoId1
  }, adminToken);
  registrar(
    'Turmas / Idempotência',
    'Alocar novamente o mesmo aluno na mesma turma',
    '200 (Idempotente sem duplicar ou quebrar)',
    alocarDuplicado,
    (s) => ({ ok: s === 200, bug: s === 500 ? 'Erro 500 de chave primária composta duplicada' : undefined })
  );

  console.log('--- ETAPA 4: MATRÍCULAS E TRANSIÇÃO DE ESTADOS ---\n');

  // Teste 16: Matrícula com renda familiar negativa
  const matriculaRendaNegativa = await request('/matriculas', 'POST', {
    alunoId: alunoId1,
    unidadeId,
    anoLetivo: 2026,
    tipo: 'MATRICULA_NOVA',
    rendaFamiliar: -1500.00
  }, adminToken);
  registrar(
    'Matrículas / Validação',
    'Solicitação com renda familiar negativa (-1500.00)',
    '400 (DADOS_INVALIDOS)',
    matriculaRendaNegativa,
    (s) => ({ ok: s === 400, bug: s === 201 ? 'Permitiu renda familiar negativa' : undefined })
  );

  // Teste 17: Matrícula para unidade institucional inexistente
  const matriculaUnidadeInexistente = await request('/matriculas', 'POST', {
    alunoId: alunoId1,
    unidadeId: 'unidade-inexistente-123',
    anoLetivo: 2026,
    tipo: 'MATRICULA_NOVA'
  }, adminToken);
  registrar(
    'Matrículas / Integridade',
    'Solicitação de matrícula em unidade inexistente',
    '404 (Unidade nao encontrada)',
    matriculaUnidadeInexistente,
    (s) => ({ ok: s === 404, bug: s === 500 ? 'Erro 500 de Foreign Key na unidade' : undefined })
  );

  // Teste 18: Solicitação de matrícula válida
  const matriculaValida = await request('/matriculas', 'POST', {
    alunoId: alunoId1,
    unidadeId,
    anoLetivo: 2026,
    tipo: 'MATRICULA_NOVA',
    rendaFamiliar: 2400.00,
    numeroDependentes: 3
  }, adminToken);
  registrar(
    'Matrículas / Fluxo Normal',
    'Criação de matrícula com valores válidos',
    '201 (Created)',
    matriculaValida,
    (s) => ({ ok: s === 201, bug: s !== 201 ? 'Falha ao solicitar matrícula' : undefined })
  );
  const matriculaId = matriculaValida.data?.id;

  // Teste 19: Homologação REJEITADA sem motivo da rejeição
  const rejeicaoSemMotivo = await request(`/matriculas/${matriculaId}/homologar`, 'PATCH', {
    status: 'REJEITADA'
    // motivoRejeicao propositalmente omitido
  }, adminToken);
  registrar(
    'Matrículas / Regra de Negócio',
    'Homologar com status REJEITADA omitindo motivoRejeicao',
    '400 (Motivo obrigatorio na rejeição)',
    rejeicaoSemMotivo,
    (s) => ({ ok: s === 400, bug: s === 200 ? 'Permitiu rejeitar sem justificar o motivo' : undefined })
  );

  // Teste 20: Homologação APROVADA com sucesso
  const aprovacaoOk = await request(`/matriculas/${matriculaId}/homologar`, 'PATCH', {
    status: 'APROVADA'
  }, adminToken);
  registrar(
    'Matrículas / Transição de Estado',
    'Aprovação e homologação formal de matrícula',
    '200 (OK)',
    aprovacaoOk,
    (s) => ({ ok: s === 200, bug: s !== 200 ? 'Falha ao homologar matrícula' : undefined })
  );

  console.log('--- ETAPA 5: AGENDA, HORÁRIOS E CHAMADA DE PRESENÇAS ---\n');

  // Teste 21: Evento com dataHoraFim anterior a dataHoraInicio
  const eventoHorarioInvertido = await request('/agenda/eventos', 'POST', {
    unidadeId,
    turmaId,
    titulo: 'Oficina com Horário Invertido (Fim < Início)',
    tipoEvento: 'OFICINA',
    dataHoraInicio: '2026-10-15T16:00:00Z',
    dataHoraFim: '2026-10-15T14:00:00Z' // 2 horas ANTES do início
  }, adminToken);
  registrar(
    'Agenda / Consistência Temporal',
    'Criar evento onde dataHoraFim é anterior a dataHoraInicio',
    '400 (Erro de consistência temporal)',
    eventoHorarioInvertido,
    (s) => ({
      ok: s === 400,
      bug: s === 201 ? 'BUG DE NEGÓCIO: A API permitiu cadastrar evento com horário de fim anterior ao de início' : undefined
    })
  );

  // Teste 22: Criar evento de agenda válido
  const eventoValido = await request('/agenda/eventos', 'POST', {
    unidadeId,
    turmaId,
    titulo: 'Oficina de Teatro e Expressão',
    tipoEvento: 'OFICINA',
    dataHoraInicio: '2026-10-15T14:00:00Z',
    dataHoraFim: '2026-10-15T16:00:00Z'
  }, adminToken);
  registrar(
    'Agenda / Fluxo Normal',
    'Criação de evento com datas cronológicas corretas',
    '201 (Created)',
    eventoValido,
    (s) => ({ ok: s === 201, bug: s !== 201 ? 'Falha ao criar evento válido' : undefined })
  );
  const eventoId = eventoValido.data?.id;

  // Teste 23: Registro de presenças em lote com lista vazia
  const presencaVazia = await request(`/presencas/evento/${eventoId}`, 'POST', {
    presencas: []
  }, adminToken);
  registrar(
    'Presenças / Validação',
    'Chamada de presenças com array vazio (presencas: [])',
    '400 (DADOS_INVALIDOS)',
    presencaVazia,
    (s) => ({ ok: s === 400, bug: s === 200 ? 'Aceitou lista vazia de chamada' : undefined })
  );

  // Teste 24: Registro de presença para aluno inexistente
  const presencaAlunoInexistente = await request(`/presencas/evento/${eventoId}`, 'POST', {
    presencas: [
      { alunoId: '00000000-0000-0000-0000-000000000000', presente: true }
    ]
  }, adminToken);
  registrar(
    'Presenças / Integridade Referencial',
    'Registrar presença de aluno inexistente no evento',
    '404 (Aluno nao encontrado) ou 400',
    presencaAlunoInexistente,
    (s) => ({
      ok: s === 404 || s === 400,
      bug: s === 500 ? 'Erro 500 de Foreign Key ao registrar presença para aluno inexistente' : undefined
    })
  );

  // Teste 25: Registro de chamada válida (Aluno presente)
  const presencaValida = await request(`/presencas/evento/${eventoId}`, 'POST', {
    presencas: [
      { alunoId: alunoId1, presente: true, justificativa: 'Participação ativa na dinâmica' }
    ]
  }, adminToken);
  registrar(
    'Presenças / Fluxo Normal',
    'Registro nominal de presença de aluno participante',
    '200 (OK)',
    presencaValida,
    (s) => ({ ok: s === 200, bug: s !== 200 ? 'Falha ao registrar chamada' : undefined })
  );

  console.log('--- ETAPA 6: AUDITORIA E LOGS LGPD ---\n');

  // Teste 26: Consulta de auditoria para validar se as mutações foram gravadas
  const auditLogs = await request(`/auditoria?recurso=alunos&recursoId=${alunoId1}`, 'GET', undefined, adminToken);
  const totalLogsGravados = auditLogs.data?.length || 0;
  registrar(
    'Auditoria / LGPD',
    'Verificação da trilha de auditoria para o aluno criado',
    '200 com logs registrados >= 1',
    auditLogs,
    (s, d) => ({
      ok: s === 200 && Array.isArray(d) && d.length > 0,
      bug: s !== 200 ? 'Falha ao consultar auditoria' : (!Array.isArray(d) || d.length === 0) ? 'Mutação no aluno não gerou registro em logs_auditoria' : undefined
    })
  );

  // Resumo final
  console.log('================================================================');
  console.log('                  RELATÓRIO FINAL DA BATERIA');
  console.log('================================================================');
  const aprovados = results.filter(r => r.sucesso).length;
  const falhas = results.filter(r => !r.sucesso).length;
  const bugs = results.filter(r => r.bugDetectado);

  console.log(`Total de testes executados: ${results.length}`);
  console.log(`Aprovados: ${aprovados}`);
  console.log(`Falhas / Comportamentos Inesperados: ${falhas}\n`);

  if (bugs.length > 0) {
    console.log('⚠️ BUGS / ANOMALIAS IDENTIFICADAS:');
    bugs.forEach(b => {
      console.log(`  - Teste #${b.id} [${b.categoria}]: ${b.cenario}`);
      console.log(`    Status: Recebido ${b.recebido} (Esperava ${b.esperado})`);
      console.log(`    Diagnóstico: ${b.bugDetectado}\n`);
    });
  } else {
    console.log('Nenhum erro 500 ou bug grave de integridade detectado!');
  }
}

runBugHuntingSuite().catch(console.error);
