import Database from 'better-sqlite3';
import http from 'http';
import { app } from '../src/app';
import { getDatabase } from '../src/config/database';
import { env } from '../src/config/env';

interface RequestOptions {
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

interface TestResult {
  nome: string;
  esperado: number;
  recebido: number;
  sucesso: boolean;
  resposta?: unknown;
}

function makeRequest(port: number, options: RequestOptions): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : undefined;
    const reqHeaders: Record<string, string> = {
      ...options.headers
    };

    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: options.path,
        method: options.method,
        headers: reqHeaders
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsed: unknown;
          try {
            parsed = rawData ? JSON.parse(rawData) : null;
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests(): Promise<void> {
  console.log('--- INICIANDO BATERIA DE TESTES E2E DAS ROTAS DA API ---\n');

  getDatabase();

  const testPort = 3334;
  const server = app.listen(testPort);

  await new Promise((resolve) => setTimeout(resolve, 500));

  const results: TestResult[] = [];

  async function testar(
    nome: string,
    statusEsperado: number,
    requisicao: RequestOptions
  ): Promise<{ status: number; body: unknown }> {
    const res = await makeRequest(testPort, requisicao);
    const sucesso = res.status === statusEsperado;
    results.push({
      nome,
      esperado: statusEsperado,
      recebido: res.status,
      sucesso,
      resposta: res.body
    });

    const statusMark = sucesso ? '[PASSOU]' : '[FALHOU]';
    console.log(`${statusMark} ${nome} -> Status: ${res.status} (esperado: ${statusEsperado})`);
    return res;
  }

  try {
    // 1. Health check
    await testar('1. GET /health - Status da API e Conexao SQLite', 200, {
      method: 'GET',
      path: '/health'
    });

    // 2. Login com sucesso (Admin padrão)
    const loginAdminRes = await testar('2. POST /auth/login - Credenciais de Admin corretas', 200, {
      method: 'POST',
      path: '/auth/login',
      body: {
        email: env.ADMIN_DEFAULT_EMAIL,
        senha: env.ADMIN_DEFAULT_PASSWORD
      }
    });

    const adminBody = loginAdminRes.body as { accessToken: string; refreshToken: string };
    const adminToken = adminBody.accessToken;
    const adminRefreshToken = adminBody.refreshToken;

    // 3. Login com senha errada
    await testar('3. POST /auth/login - Senha incorreta (espera 401)', 401, {
      method: 'POST',
      path: '/auth/login',
      body: {
        email: env.ADMIN_DEFAULT_EMAIL,
        senha: 'senha_completamente_errada'
      }
    });

    // 4. Login com email em formato inválido
    await testar('4. POST /auth/login - Email invalido (espera 400 Zod)', 400, {
      method: 'POST',
      path: '/auth/login',
      body: {
        email: 'nao-e-um-email',
        senha: '123'
      }
    });

    // 5. GET /auth/me autenticado como Admin
    await testar('5. GET /auth/me - Perfil do admin autenticado com Bearer Token', 200, {
      method: 'GET',
      path: '/auth/me',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 6. GET /auth/me sem token
    await testar('6. GET /auth/me - Sem token de autorizacao (espera 401)', 401, {
      method: 'GET',
      path: '/auth/me'
    });

    // 7. GET /auth/me com token adulterado
    await testar('7. GET /auth/me - Token adulterado/invalido (espera 401)', 401, {
      method: 'GET',
      path: '/auth/me',
      headers: { Authorization: 'Bearer token_falso_invalido' }
    });

    // 8. Renovação de token (POST /auth/refresh)
    const refreshRes = await testar('8. POST /auth/refresh - Rotacao com token valido', 200, {
      method: 'POST',
      path: '/auth/refresh',
      body: { refreshToken: adminRefreshToken }
    });

    // 9. Tentativa de reuso do refresh token antigo (já rotacionado)
    await testar('9. POST /auth/refresh - Reuso do refresh token ja consumido (espera 401)', 401, {
      method: 'POST',
      path: '/auth/refresh',
      body: { refreshToken: adminRefreshToken }
    });

    // 10. Auto-cadastro de Responsável
    const timestampUnico = Date.now().toString().slice(-6);
    const emailResp = `responsavel_${timestampUnico}@teste.com`;
    const cpfResp = Math.floor(10000000000 + Math.random() * 90000000000).toString();

    const cadastroRes = await testar('10. POST /auth/registro-responsavel - Cadastro completo de responsavel', 201, {
      method: 'POST',
      path: '/auth/registro-responsavel',
      body: {
        nome: 'Responsavel Teste E2E',
        email: emailResp,
        senha: 'SenhaSegura@123',
        cpf: cpfResp,
        telefone: '54987654321',
        parentesco: 'Mae'
      }
    });

    const respBody = cadastroRes.body as { accessToken: string; refreshToken: string };
    const respToken = respBody.accessToken;

    // 11. Conflito por email duplicado
    await testar('11. POST /auth/registro-responsavel - Email duplicado (espera 409)', 409, {
      method: 'POST',
      path: '/auth/registro-responsavel',
      body: {
        nome: 'Outro Nome',
        email: emailResp,
        senha: 'OutraSenha@123',
        telefone: '54911112222',
        parentesco: 'Pai'
      }
    });

    // 12. GET /auth/me com token de Responsável
    await testar('12. GET /auth/me - Perfil do responsavel cadastrado', 200, {
      method: 'GET',
      path: '/auth/me',
      headers: { Authorization: `Bearer ${respToken}` }
    });

    // 13. MÓDULO UNIDADES: GET /unidades
    const unidadesRes = await testar('13. GET /unidades - Listagem de unidades semeadas', 200, {
      method: 'GET',
      path: '/unidades',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const unidades = unidadesRes.body as Array<{ id: string; nome: string }>;
    const unidadeGloriaId = unidades.find((u) => u.id === 'unidade-gloria')?.id ?? 'unidade-gloria';

    // 14. MÓDULO UNIDADES: GET /unidades/:id
    await testar('14. GET /unidades/:id - Detalhes da unidade Gloria', 200, {
      method: 'GET',
      path: `/unidades/${unidadeGloriaId}`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 15. MÓDULO ALUNOS: POST /alunos
    const alunoCpf = Math.floor(10000000000 + Math.random() * 90000000000).toString();
    const criarAlunoRes = await testar('15. POST /alunos - Cadastro de novo aluno pelo Admin', 201, {
      method: 'POST',
      path: '/alunos',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        nomeCompleto: 'Agatha Beatriz Teixeira',
        sexo: 'F',
        dataNascimento: '2019-03-30',
        naturalidade: 'Garibaldi',
        ufNaturalidade: 'RS',
        cpf: alunoCpf,
        enderecoLogradouro: 'Rua Augusto Pizatto',
        enderecoNumero: '11',
        enderecoBairro: 'Vale Verde',
        enderecoCidade: 'Garibaldi',
        escolaRegular: 'Pedro Rossi',
        serieEscolar: '1º ano',
        situacaoMoradia: 'PROPRIA',
        problemasSaude: 'Nenhum'
      }
    });
    const alunoCriado = criarAlunoRes.body as { id: string; nome_completo: string };
    const alunoId = alunoCriado.id;

    // 16. MÓDULO ALUNOS: GET /alunos (Listagem com filtros)
    await testar('16. GET /alunos - Listagem de alunos com filtro de status', 200, {
      method: 'GET',
      path: '/alunos?status=ATIVO',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 17. MÓDULO ALUNOS: GET /alunos/:id (Detalhes completos)
    await testar('17. GET /alunos/:id - Detalhes completos do aluno', 200, {
      method: 'GET',
      path: `/alunos/${alunoId}`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 18. MÓDULO ALUNOS: PUT /alunos/:id (Atualização cadastral)
    await testar('18. PUT /alunos/:id - Atualizacao cadastral de observacoes', 200, {
      method: 'PUT',
      path: `/alunos/${alunoId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        observacoes: 'Participante das oficinas de contraturno escolar'
      }
    });

    // 19. MÓDULO TURMAS: POST /turmas
    const turmaRes = await testar('19. POST /turmas - Criacao de turma no contraturno', 201, {
      method: 'POST',
      path: '/turmas',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        unidadeId: unidadeGloriaId,
        nome: 'Turma A - Tarde',
        turno: 'TARDE',
        anoLetivo: 2026
      }
    });
    const turmaCriada = turmaRes.body as { id: string };
    const turmaId = turmaCriada.id;

    // 20. MÓDULO TURMAS: GET /turmas
    await testar('20. GET /turmas - Listagem de turmas com contagem', 200, {
      method: 'GET',
      path: `/turmas?unidadeId=${unidadeGloriaId}`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 21. MÓDULO TURMAS: POST /turmas/:id/alunos (Enturmação)
    await testar('21. POST /turmas/:id/alunos - Alocacao de aluno na turma', 200, {
      method: 'POST',
      path: `/turmas/${turmaId}/alunos`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { alunoId }
    });

    // 22. MÓDULO TURMAS: GET /turmas/:id/alunos (Listagem nominal)
    await testar('22. GET /turmas/:id/alunos - Relacao nominal de alunos enturmados', 200, {
      method: 'GET',
      path: `/turmas/${turmaId}/alunos`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 23. MÓDULO MATRÍCULAS: POST /matriculas (Solicitação)
    const matriculaRes = await testar('23. POST /matriculas - Solicitacao de matricula nova', 201, {
      method: 'POST',
      path: '/matriculas',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        alunoId,
        unidadeId: unidadeGloriaId,
        anoLetivo: 2026,
        tipo: 'MATRICULA_NOVA',
        rendaFamiliar: 1700,
        numeroDependentes: 2
      }
    });
    const matriculaCriada = matriculaRes.body as { id: string };
    const matriculaId = matriculaCriada.id;

    // 24. MÓDULO MATRÍCULAS: GET /matriculas
    await testar('24. GET /matriculas - Listagem com filtros por status', 200, {
      method: 'GET',
      path: '/matriculas?status=PENDENTE_PRESENCIAL',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 25. MÓDULO MATRÍCULAS: PATCH /matriculas/:id/contribuicao (Confirmação da contribuição)
    await testar('25. PATCH /matriculas/:id/contribuicao - Confirmacao de recolhimento de contribuicao', 200, {
      method: 'PATCH',
      path: `/matriculas/${matriculaId}/contribuicao`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { contribuicaoPaga: true }
    });

    // 26. MÓDULO MATRÍCULAS: PATCH /matriculas/:id/homologar (Homologação da matrícula)
    await testar('26. PATCH /matriculas/:id/homologar - Aprovacao e homologacao formal', 200, {
      method: 'PATCH',
      path: `/matriculas/${matriculaId}/homologar`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'APROVADA' }
    });

    // 27. MÓDULO DOCUMENTOS: GET /documentos/matricula/:matriculaId
    await testar('27. GET /documentos/matricula/:id - Consulta de documentos vinculados', 200, {
      method: 'GET',
      path: `/documentos/matricula/${matriculaId}`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 28. MÓDULO AGENDA: POST /agenda/eventos (Criação de oficina)
    const eventoRes = await testar('28. POST /agenda/eventos - Criacao de oficina de reforco escolar', 201, {
      method: 'POST',
      path: '/agenda/eventos',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        unidadeId: unidadeGloriaId,
        turmaId,
        titulo: 'Oficina de Reforco Escolar',
        descricao: 'Atendimento e apoio pedagogico no contraturno',
        tipoEvento: 'OFICINA',
        dataHoraInicio: '2026-04-10T14:00:00',
        dataHoraFim: '2026-04-10T16:00:00'
      }
    });
    const eventoCriado = eventoRes.body as { id: string };
    const eventoId = eventoCriado.id;

    // 29. MÓDULO AGENDA: GET /agenda/eventos
    await testar('29. GET /agenda/eventos - Consulta de eventos com filtro de unidade', 200, {
      method: 'GET',
      path: `/agenda/eventos?unidadeId=${unidadeGloriaId}`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 30. MÓDULO PRESENÇAS: POST /presencas/evento/:eventoId (Lançamento de chamada nominal)
    await testar('30. POST /presencas/evento/:eventoId - Registro nominal de presenca na oficina', 200, {
      method: 'POST',
      path: `/presencas/evento/${eventoId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        presencas: [
          {
            alunoId,
            presente: true
          }
        ]
      }
    });

    // 31. MÓDULO PRESENÇAS: GET /presencas/evento/:eventoId
    await testar('31. GET /presencas/evento/:eventoId - Consulta de lista de chamada realizada', 200, {
      method: 'GET',
      path: `/presencas/evento/${eventoId}`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 32. MÓDULO PRESENÇAS: GET /presencas/aluno/:alunoId (Histórico e assiduidade)
    await testar('32. GET /presencas/aluno/:alunoId - Relatorio de frequencia e assiduidade', 200, {
      method: 'GET',
      path: `/presencas/aluno/${alunoId}`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 33. MÓDULO AUDITORIA: GET /auditoria (Exclusivo Administrador)
    await testar('33. GET /auditoria - Consulta da trilha de auditoria como Admin', 200, {
      method: 'GET',
      path: '/auditoria?limite=20',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 34. SEGURANÇA RBAC: GET /auditoria com token de Responsável (espera 403)
    await testar('34. GET /auditoria - Bloqueio RBAC para perfil Responsavel (espera 403)', 403, {
      method: 'GET',
      path: '/auditoria',
      headers: { Authorization: `Bearer ${respToken}` }
    });

    // 35. MÓDULO ALUNOS: DELETE /alunos/:id (Inativação lógica)
    await testar('35. DELETE /alunos/:id - Inativacao logica do aluno preservando historico', 204, {
      method: 'DELETE',
      path: `/alunos/${alunoId}`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 36. Rota não mapeada (404)
    await testar('36. GET /rota-inexistente - Rota inexistente (espera 404)', 404, {
      method: 'GET',
      path: '/rota-inexistente'
    });

    // 37. Verificação de Integridade dos Logs de Auditoria no SQLite
    const db = new Database(env.DATABASE_PATH);
    const totalLogs = db.prepare('SELECT count(*) as count FROM logs_auditoria').get() as { count: number };
    const logsOk = totalLogs.count >= 10;
    results.push({
      nome: '37. Verificacao de Auditoria no SQLite (Integridade e Rastreabilidade)',
      esperado: 1,
      recebido: logsOk ? 1 : 0,
      sucesso: logsOk,
      resposta: { totalLogsGravados: totalLogs.count }
    });
    console.log(`[PASSOU] 37. Verificacao de Auditoria no SQLite -> Total de logs gravados: ${totalLogs.count}`);

    console.log('\n--- RESUMO DA BATERIA DE TESTES ---');
    const todosPassaram = results.every((r) => r.sucesso);
    console.log(`Total de testes: ${results.length}`);
    console.log(`Aprovados: ${results.filter((r) => r.sucesso).length}`);
    console.log(`Reprovados: ${results.filter((r) => !r.sucesso).length}`);
    console.log(`Resultado Geral: ${todosPassaram ? 'TODOS OS TESTES PASSARAM COM SUCESSO!' : 'HOUVE FALHAS'}`);

    if (!todosPassaram) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Erro fatal durante execucao dos testes:', err);
  process.exit(1);
});
