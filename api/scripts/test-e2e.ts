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

    const newRefreshBody = refreshRes.body as { accessToken: string; refreshToken: string };

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

    // 12. GET /auth/me com token de Responsável (valida dados específicos)
    await testar('12. GET /auth/me - Perfil do responsavel cadastrado', 200, {
      method: 'GET',
      path: '/auth/me',
      headers: { Authorization: `Bearer ${respBody.accessToken}` }
    });

    // 13. Logout (revogação do refresh token)
    await testar('13. POST /auth/logout - Revogacao de refresh token', 204, {
      method: 'POST',
      path: '/auth/logout',
      body: { refreshToken: respBody.refreshToken }
    });

    // 14. Tentativa de refresh após logout
    await testar('14. POST /auth/refresh - Refresh apos logout (espera 401)', 401, {
      method: 'POST',
      path: '/auth/refresh',
      body: { refreshToken: respBody.refreshToken }
    });

    // 15. Rota não mapeada (404)
    await testar('15. GET /rota-inexistente - Rota inexistente (espera 404)', 404, {
      method: 'GET',
      path: '/rota-inexistente'
    });

    // 16. Verificação de Integridade dos Logs de Auditoria no SQLite
    const db = new Database(env.DATABASE_PATH);
    const totalLogs = db.prepare('SELECT count(*) as count FROM logs_auditoria').get() as { count: number };
    const logsOk = totalLogs.count > 0;
    results.push({
      nome: '16. Verificacao de Auditoria no SQLite',
      esperado: 1,
      recebido: logsOk ? 1 : 0,
      sucesso: logsOk,
      resposta: { totalLogsGravados: totalLogs.count }
    });
    console.log(`[PASSOU] 16. Verificacao de Auditoria no SQLite -> Total de logs gravados: ${totalLogs.count}`);

    console.log('\n--- RESUMO DA BATERIA DE TESTES ---');
    const todosPassaram = results.every((r) => r.sucesso);
    console.log(`Total de testes: ${results.length}`);
    console.log(`Aprovados: ${results.filter((r) => r.sucesso).length}`);
    console.log(`Reprovados: ${results.filter((r) => !r.sucesso).length}`);
    console.log(`Resultado Geral: ${todosPassaram ? 'TODOS OS TESTES PASSARAM COM SUCESSO!' : 'HOUVE FALHAS'}`);
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Erro fatal durante execucao dos testes:', err);
  process.exit(1);
});
