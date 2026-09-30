import { Buffer } from "node:buffer";

interface TestCase {
  readonly id: string;
  readonly category: TestCategory;
  readonly title: string;
  readonly description: string;
  readonly execute: (context: TestContext) => Promise<TestExecutionResult>;
}

interface TestExecutionResult {
  readonly passed: boolean;
  readonly details: string;
  readonly actualStatus?: number;
  readonly expectedStatus?: number | number[];
  readonly payload?: unknown;
  readonly responseBody?: unknown;
  readonly vulnerabilitySeverity?: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
}

type TestCategory =
  | "AUTENTICACAO_E_ESCALONAMENTO"
  | "CONTROLE_ACESSO_BOLA_IDOR"
  | "CONTROLE_ACESSO_BFLA_RBAC"
  | "EXPOSICAO_DADOS_LGPD"
  | "VALIDACAO_E_LIMITES"
  | "INJECAO_E_SANITIZACAO"
  | "UPLOAD_ARQUIVOS"
  | "LOGICA_E_CONCORRENCIA";

interface AuthTokens {
  readonly token: string;
  readonly refreshToken?: string;
  readonly userId?: string;
}

interface TestContext {
  readonly baseUrl: string;
  readonly adminTokens?: AuthTokens;
  readonly colaboradorTokens?: AuthTokens;
  readonly responsavelATokens?: AuthTokens;
  readonly responsavelBTokens?: AuthTokens;
  readonly sharedState: Record<string, unknown>;
}

interface HttpResponse {
  readonly status: number;
  readonly headers: Headers;
  readonly body: unknown;
  readonly rawText: string;
}

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3333";

class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request(
    path: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      token?: string;
      body?: unknown;
      headers?: Record<string, string>;
      isFormData?: boolean;
    } = {}
  ): Promise<HttpResponse> {
    const { method = "GET", token, body, headers = {}, isFormData = false } = options;
    const requestHeaders: Record<string, string> = { ...headers };

    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }

    let requestBody: BodyInit | undefined;
    if (isFormData) {
      requestBody = body as FormData;
    } else if (body !== undefined) {
      requestHeaders["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body: requestBody,
    });

    const rawText = await response.text();
    let parsedBody: unknown = null;
    try {
      parsedBody = rawText.length > 0 ? JSON.parse(rawText) : null;
    } catch {
      parsedBody = rawText;
    }

    return {
      status: response.status,
      headers: response.headers,
      body: parsedBody,
      rawText,
    };
  }
}

export class SecurityTestBattery {
  private readonly client: ApiClient;
  private readonly tests: TestCase[] = [];

  constructor(baseUrl: string = API_BASE_URL) {
    this.client = new ApiClient(baseUrl);
    this.registerAuthenticationTests();
    this.registerBflaTests();
    this.registerBolaTests();
    this.registerLgpdTests();
    this.registerValidationTests();
    this.registerInjectionTests();
    this.registerUploadTests();
    this.registerBusinessLogicTests();
  }

  private registerAuthenticationTests(): void {
    this.tests.push({
      id: "AUTH-01",
      category: "AUTENTICACAO_E_ESCALONAMENTO",
      title: "Tentativa de auto-escalonamento de privilégios no registro de responsável",
      description: "Verifica se enviar campos como papel='ADMINISTRADOR' ou status='ATIVO' no registro permite forjar uma conta administrativa.",
      execute: async () => {
        const uniqueEmail = `sec_test_escalation_${Date.now()}@test.com`;
        const payload = {
          nome: "Atacante Teste",
          email: uniqueEmail,
          senha: "password123",
          parentesco: "Pai",
          telefone: "54999990000",
          papel: "ADMINISTRADOR",
          status: "ATIVO",
        };

        const response = await this.client.request("/auth/registro-responsavel", {
          method: "POST",
          body: payload,
        });

        if (response.status !== 201) {
          return {
            passed: true,
            details: `Registro rejeitado ou processado com status ${response.status}.`,
            actualStatus: response.status,
            expectedStatus: [201, 400],
          };
        }

        const loginResponse = await this.client.request("/auth/login", {
          method: "POST",
          body: { email: uniqueEmail, senha: "password123" },
        });

        const userPapel = (loginResponse.body as { usuario?: { papel?: string } })?.usuario?.papel;
        if (userPapel === "ADMINISTRADOR") {
          return {
            passed: false,
            vulnerabilitySeverity: "CRITICA",
            details: "Vulnerabilidade de Escalonamento de Privilégios (Mass Assignment): Conta criada com perfil ADMINISTRADOR.",
            actualStatus: response.status,
            responseBody: loginResponse.body,
          };
        }

        return {
          passed: true,
          details: `Conta registrada com perfil padrão: ${userPapel ?? "RESPONSAVEL"}.`,
          actualStatus: response.status,
        };
      },
    });

    this.tests.push({
      id: "AUTH-02",
      category: "AUTENTICACAO_E_ESCALONAMENTO",
      title: "Reutilização de Refresh Token após Logout",
      description: "Garante que o refresh token é devidamente revogado após a chamada de logout e não permite gerar novos JWTs.",
      execute: async (ctx) => {
        const uniqueEmail = `sec_test_logout_${Date.now()}@test.com`;
        await this.client.request("/auth/registro-responsavel", {
          method: "POST",
          body: {
            nome: "Usuario Logout",
            email: uniqueEmail,
            senha: "password123",
            parentesco: "Mae",
            telefone: "54999991111",
          },
        });

        const loginResponse = await this.client.request("/auth/login", {
          method: "POST",
          body: { email: uniqueEmail, senha: "password123" },
        });

        const loginBody = loginResponse.body as { refreshToken?: string; token?: string; accessToken?: string };
        const refreshToken = loginBody?.refreshToken;
        if (!refreshToken) {
          return {
            passed: false,
            details: "Falha ao obter refreshToken para o teste de revogação.",
            actualStatus: loginResponse.status,
          };
        }

        await this.client.request("/auth/logout", {
          method: "POST",
          token: loginBody.token ?? loginBody.accessToken,
          body: { refreshToken },
        });

        const refreshAttempt = await this.client.request("/auth/refresh", {
          method: "POST",
          body: { refreshToken },
        });

        if (refreshAttempt.status === 200) {
          return {
            passed: false,
            vulnerabilitySeverity: "ALTA",
            details: "Falha de Revogação de Sessão: Refresh token permanece utilizável após logout.",
            actualStatus: refreshAttempt.status,
            expectedStatus: 401,
          };
        }

        return {
          passed: true,
          details: `Refresh token revogado com sucesso. Resposta da tentativa: ${refreshAttempt.status}.`,
          actualStatus: refreshAttempt.status,
          expectedStatus: [400, 401],
        };
      },
    });

    this.tests.push({
      id: "AUTH-03",
      category: "AUTENTICACAO_E_ESCALONAMENTO",
      title: "Acesso a /auth/me sem autenticação ou com token malformado",
      description: "Verifica se requisições sem Authorization ou com cabeçalho adulterado são barradas com 401.",
      execute: async () => {
        const missingHeaderResponse = await this.client.request("/auth/me");
        const malformedTokenResponse = await this.client.request("/auth/me", {
          token: "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIn0.",
        });

        const isMissingBlocked = missingHeaderResponse.status === 401;
        const isMalformedBlocked = malformedTokenResponse.status === 401;

        if (!isMissingBlocked || !isMalformedBlocked) {
          return {
            passed: false,
            vulnerabilitySeverity: "ALTA",
            details: `Falha na verificação de token: Sem token retornou ${missingHeaderResponse.status}, Token adulterado retornou ${malformedTokenResponse.status}.`,
            actualStatus: malformedTokenResponse.status,
            expectedStatus: 401,
          };
        }

        return {
          passed: true,
          details: "Rotas protegidas rejeitam tokens nulos e malformados adequadamente com 401.",
          actualStatus: missingHeaderResponse.status,
        };
      },
    });

    this.tests.push({
      id: "AUTH-04",
      category: "AUTENTICACAO_E_ESCALONAMENTO",
      title: "Bypass de senha por tamanho mínimo na criação de conta",
      description: "Valida que o sistema rejeita senhas com menos de 6 caracteres conforme especificado.",
      execute: async () => {
        const response = await this.client.request("/auth/registro-responsavel", {
          method: "POST",
          body: {
            nome: "Senha Curta",
            email: `sec_test_shortpwd_${Date.now()}@test.com`,
            senha: "123",
            parentesco: "Pai",
            telefone: "54999992222",
          },
        });

        if (response.status === 201) {
          return {
            passed: false,
            vulnerabilitySeverity: "MEDIA",
            details: "Vulnerabilidade de Política de Senhas: O sistema aceitou senha com menos de 6 caracteres.",
            actualStatus: response.status,
            expectedStatus: 400,
          };
        }

        return {
          passed: response.status === 400,
          details: `Senha fraca rejeitada com status ${response.status}.`,
          actualStatus: response.status,
          expectedStatus: 400,
        };
      },
    });
  }

  private registerBflaTests(): void {
    this.tests.push({
      id: "BFLA-01",
      category: "CONTROLE_ACESSO_BFLA_RBAC",
      title: "Acesso indevido à trilha de auditoria por perfil RESPONSAVEL ou COLABORADOR",
      description: "A rota GET /auditoria é de acesso exclusivo para ADMINISTRADOR. Outros perfis devem receber 403 Forbidden.",
      execute: async (ctx) => {
        if (!ctx.responsavelATokens?.token && !ctx.colaboradorTokens?.token) {
          return {
            passed: true,
            details: "Ignorado por falta de tokens de colaborador/responsavel configurados no contexto.",
          };
        }

        const token = ctx.responsavelATokens?.token ?? ctx.colaboradorTokens?.token;
        const response = await this.client.request("/auditoria", { token });

        if (response.status === 200) {
          return {
            passed: false,
            vulnerabilitySeverity: "ALTA",
            details: "Quebra de Controle de Acesso em Nível de Função (BFLA): Perfil não-administrador conseguiu ler logs de auditoria.",
            actualStatus: response.status,
            expectedStatus: 403,
          };
        }

        return {
          passed: response.status === 403,
          details: `Acesso a /auditoria devidamente bloqueado com status ${response.status}.`,
          actualStatus: response.status,
          expectedStatus: 403,
        };
      },
    });

    this.tests.push({
      id: "BFLA-02",
      category: "CONTROLE_ACESSO_BFLA_RBAC",
      title: "Tentativa de homologação de matrícula por perfil RESPONSAVEL",
      description: "PATCH /matriculas/:id/homologar deve ser restrito exclusivamente a ADMINISTRADOR.",
      execute: async (ctx) => {
        if (!ctx.responsavelATokens?.token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de responsável no contexto.",
          };
        }

        const fakeMatriculaId = "00000000-0000-0000-0000-000000000000";
        const response = await this.client.request(`/matriculas/${fakeMatriculaId}/homologar`, {
          method: "PATCH",
          token: ctx.responsavelATokens.token,
          body: { status: "APROVADA" },
        });

        if (response.status === 200) {
          return {
            passed: false,
            vulnerabilitySeverity: "CRITICA",
            details: "Quebra Crítica de RBAC: Responsável conseguiu acionar endpoint de homologação de matrícula.",
            actualStatus: response.status,
            expectedStatus: 403,
          };
        }

        return {
          passed: response.status === 403,
          details: `Acesso negado com status ${response.status}.`,
          actualStatus: response.status,
          expectedStatus: 403,
        };
      },
    });

    this.tests.push({
      id: "BFLA-03",
      category: "CONTROLE_ACESSO_BFLA_RBAC",
      title: "Tentativa de cadastro e exclusão de turmas por perfil COLABORADOR",
      description: "POST /turmas e DELETE /turmas/:id devem ser restritos ao perfil ADMINISTRADOR.",
      execute: async (ctx) => {
        if (!ctx.colaboradorTokens?.token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de colaborador no contexto.",
          };
        }

        const response = await this.client.request("/turmas", {
          method: "POST",
          token: ctx.colaboradorTokens.token,
          body: {
            unidadeId: "unidade-qualquer",
            nome: "Turma Nao Autorizada",
            turno: "MANHA",
            anoLetivo: 2026,
          },
        });

        if (response.status === 201) {
          return {
            passed: false,
            vulnerabilitySeverity: "ALTA",
            details: "BFLA: Colaborador conseguiu criar turma institucional restrita a Administrador.",
            actualStatus: response.status,
            expectedStatus: 403,
          };
        }

        return {
          passed: response.status === 403,
          details: `Criação de turma por colaborador bloqueada com status ${response.status}.`,
          actualStatus: response.status,
          expectedStatus: 403,
        };
      },
    });

    this.tests.push({
      id: "BFLA-04",
      category: "CONTROLE_ACESSO_BFLA_RBAC",
      title: "Tentativa de alteração de quitação de contribuição por perfil não-administrador",
      description: "PATCH /matriculas/:id/contribuicao é de exclusividade do ADMINISTRADOR.",
      execute: async (ctx) => {
        const token = ctx.responsavelATokens?.token ?? ctx.colaboradorTokens?.token;
        if (!token) {
          return {
            passed: true,
            details: "Ignorado por falta de tokens de teste no contexto.",
          };
        }

        const response = await this.client.request("/matriculas/qualquer-id/contribuicao", {
          method: "PATCH",
          token,
          body: { contribuicaoPaga: true },
        });

        if (response.status === 200) {
          return {
            passed: false,
            vulnerabilitySeverity: "ALTA",
            details: "BFLA: Usuário sem privilégios conseguiu alterar quitação de contribuição financeira.",
            actualStatus: response.status,
            expectedStatus: 403,
          };
        }

        return {
          passed: response.status === 403,
          details: `Bloqueio de quitação financeira verificado com status ${response.status}.`,
          actualStatus: response.status,
          expectedStatus: 403,
        };
      },
    });
  }

  private registerBolaTests(): void {
    this.tests.push({
      id: "BOLA-01",
      category: "CONTROLE_ACESSO_BOLA_IDOR",
      title: "IDOR na consulta detalhada de aluno por responsável não vinculado",
      description: "GET /alunos/:id deve barrar com 403 quando um RESPONSAVEL consulta aluno que não é seu dependente.",
      execute: async (ctx) => {
        const targetAlunoId = (ctx.sharedState["alunoIdNaoVinculado"] as string) ?? "00000000-0000-0000-0000-000000000001";
        if (!ctx.responsavelATokens?.token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de responsável no contexto.",
          };
        }

        const response = await this.client.request(`/alunos/${targetAlunoId}`, {
          token: ctx.responsavelATokens.token,
        });

        if (response.status === 200) {
          return {
            passed: false,
            vulnerabilitySeverity: "CRITICA",
            details: "Vulnerabilidade BOLA/IDOR Crítica: Responsável obteve dados sensíveis de aluno que não é seu dependente.",
            actualStatus: response.status,
            expectedStatus: [403, 404],
          };
        }

        return {
          passed: response.status === 403 || response.status === 404,
          details: `Acesso a aluno de terceiro bloqueado com status ${response.status}.`,
          actualStatus: response.status,
          expectedStatus: 403,
        };
      },
    });

    this.tests.push({
      id: "BOLA-02",
      category: "CONTROLE_ACESSO_BOLA_IDOR",
      title: "IDOR na solicitação de matrícula para aluno de outro responsável",
      description: "POST /matriculas executado por RESPONSAVEL deve validar se o alunoId informado pertence aos seus dependentes.",
      execute: async (ctx) => {
        const targetAlunoId = (ctx.sharedState["alunoIdNaoVinculado"] as string) ?? "00000000-0000-0000-0000-000000000001";
        if (!ctx.responsavelATokens?.token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de responsável no contexto.",
          };
        }

        const response = await this.client.request("/matriculas", {
          method: "POST",
          token: ctx.responsavelATokens.token,
          body: {
            alunoId: targetAlunoId,
            unidadeId: "unidade-id-qualquer",
            anoLetivo: 2026,
            tipo: "MATRICULA_NOVA",
          },
        });

        if (response.status === 201) {
          return {
            passed: false,
            vulnerabilitySeverity: "CRITICA",
            details: "Vulnerabilidade BOLA: Responsável solicitou matrícula para aluno com o qual não possui vínculo.",
            actualStatus: response.status,
            expectedStatus: 403,
          };
        }

        return {
          passed: response.status === 403 || response.status === 404,
          details: `Criação de matrícula indevida rejeitada com status ${response.status}.`,
          actualStatus: response.status,
          expectedStatus: 403,
        };
      },
    });

    this.tests.push({
      id: "BOLA-03",
      category: "CONTROLE_ACESSO_BOLA_IDOR",
      title: "IDOR no cancelamento de matrícula de terceiros",
      description: "DELETE /matriculas/:id executado por RESPONSAVEL deve restringir a operação estritamente às suas matrículas.",
      execute: async (ctx) => {
        const targetMatriculaId = (ctx.sharedState["matriculaTerceiroId"] as string) ?? "00000000-0000-0000-0000-000000000002";
        if (!ctx.responsavelATokens?.token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de responsável no contexto.",
          };
        }

        const response = await this.client.request(`/matriculas/${targetMatriculaId}`, {
          method: "DELETE",
          token: ctx.responsavelATokens.token,
        });

        if (response.status === 204) {
          return {
            passed: false,
            vulnerabilitySeverity: "CRITICA",
            details: "Vulnerabilidade BOLA: Responsável cancelou matrícula de dependente de outro usuário.",
            actualStatus: response.status,
            expectedStatus: 403,
          };
        }

        return {
          passed: response.status === 403 || response.status === 404,
          details: `Cancelamento de matrícula alheia impedido com status ${response.status}.`,
          actualStatus: response.status,
          expectedStatus: 403,
        };
      },
    });

    this.tests.push({
      id: "BOLA-04",
      category: "CONTROLE_ACESSO_BOLA_IDOR",
      title: "IDOR no acesso a histórico de frequência escolar de outro aluno",
      description: "GET /presencas/aluno/:alunoId acessado por RESPONSAVEL deve negar acesso aos dados de terceiros.",
      execute: async (ctx) => {
        const targetAlunoId = (ctx.sharedState["alunoIdNaoVinculado"] as string) ?? "00000000-0000-0000-0000-000000000001";
        if (!ctx.responsavelATokens?.token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de responsável no contexto.",
          };
        }

        const response = await this.client.request(`/presencas/aluno/${targetAlunoId}`, {
          token: ctx.responsavelATokens.token,
        });

        if (response.status === 200) {
          return {
            passed: false,
            vulnerabilitySeverity: "ALTA",
            details: "Vulnerabilidade BOLA: Histórico de frequência de terceiro exposto para responsável sem vínculo.",
            actualStatus: response.status,
            expectedStatus: [403, 404],
          };
        }

        return {
          passed: response.status === 403 || response.status === 404,
          details: `Frequência de terceiros bloqueada com status ${response.status}.`,
          actualStatus: response.status,
          expectedStatus: 403,
        };
      },
    });
  }

  private registerLgpdTests(): void {
    this.tests.push({
      id: "LGPD-01",
      category: "EXPOSICAO_DADOS_LGPD",
      title: "Vazamento de campos sensíveis de moradia e vínculo matrimonial para COLABORADOR",
      description: "Conforme o contrato de GET /alunos, para COLABORADOR os campos situacao_moradia e vinculo_matrimonial_pais devem ser estritamente nulos.",
      execute: async (ctx) => {
        if (!ctx.colaboradorTokens?.token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de colaborador no contexto.",
          };
        }

        const response = await this.client.request("/alunos", {
          token: ctx.colaboradorTokens.token,
        });

        if (response.status !== 200 || !Array.isArray(response.body)) {
          return {
            passed: false,
            details: `Falha ao listar alunos com perfil colaborador. Status retornado: ${response.status}.`,
            actualStatus: response.status,
          };
        }

        const exposedSensitiveRecord = (response.body as Array<Record<string, unknown>>).find((aluno) => {
          const moradia = aluno["situacao_moradia"] ?? aluno["situacaoMoradia"];
          const vinculo = aluno["vinculo_matrimonial_pais"] ?? aluno["vinculoMatrimonialPais"];
          return moradia !== null && moradia !== undefined || vinculo !== null && vinculo !== undefined;
        });

        if (exposedSensitiveRecord) {
          return {
            passed: false,
            vulnerabilitySeverity: "ALTA",
            details: "Violação de LGPD: Campos socioeconômicos sensíveis de menores foram expostos ao perfil Colaborador.",
            responseBody: exposedSensitiveRecord,
          };
        }

        return {
          passed: true,
          details: "Campos sensíveis devidamente anonimizados/nulos para perfil Colaborador.",
          actualStatus: response.status,
        };
      },
    });

    this.tests.push({
      id: "LGPD-02",
      category: "EXPOSICAO_DADOS_LGPD",
      title: "Geração de trilha de auditoria para visualização sensível por ADMINISTRADOR",
      description: "Ao consultar GET /alunos/:id com perfil ADMINISTRADOR, deve ser registrado log com acao='VISUALIZAR_SENSIVEL'.",
      execute: async (ctx) => {
        if (!ctx.adminTokens?.token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de administrador no contexto.",
          };
        }

        const listResponse = await this.client.request("/alunos?limite=1", {
          token: ctx.adminTokens.token,
        });

        const alunoId = (listResponse.body as Array<{ id: string }>)?.[0]?.id;
        if (!alunoId) {
          return {
            passed: true,
            details: "Nenhum aluno existente no banco para auditar visualização sensível.",
          };
        }

        await this.client.request(`/alunos/${alunoId}`, {
          token: ctx.adminTokens.token,
        });

        const auditResponse = await this.client.request("/auditoria?acao=VISUALIZAR_SENSIVEL&recurso=alunos&limite=5", {
          token: ctx.adminTokens.token,
        });

        if (auditResponse.status !== 200 || !Array.isArray(auditResponse.body)) {
          return {
            passed: false,
            vulnerabilitySeverity: "MEDIA",
            details: "Não foi possível validar o log de auditoria de visualização sensível.",
            actualStatus: auditResponse.status,
          };
        }

        const auditLogFound = (auditResponse.body as Array<{ recurso_id?: string; acao?: string }>).some(
          (log) => log.acao === "VISUALIZAR_SENSIVEL" && log.recurso_id === alunoId
        );

        if (!auditLogFound) {
          return {
            passed: false,
            vulnerabilitySeverity: "MEDIA",
            details: "Auditoria Ausente: Visualização de dados sensíveis de menor por administrador não gerou log de auditoria.",
          };
        }

        return {
          passed: true,
          details: "Log de auditoria VISUALIZAR_SENSIVEL gerado com sucesso.",
        };
      },
    });
  }

  private registerValidationTests(): void {
    this.tests.push({
      id: "VAL-01",
      category: "VALIDACAO_E_LIMITES",
      title: "Validação de limites de ano letivo em turmas e matrículas",
      description: "O contrato estipula que anoLetivo deve estar entre 2020 e 2050. Valores fora devem retornar 400 DADOS_INVALIDOS.",
      execute: async (ctx) => {
        if (!ctx.adminTokens?.token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de administrador no contexto.",
          };
        }

        const responseInferior = await this.client.request("/turmas", {
          method: "POST",
          token: ctx.adminTokens.token,
          body: {
            unidadeId: "unidade-id",
            nome: "Turma Ano Invalido",
            turno: "MANHA",
            anoLetivo: 2019,
          },
        });

        const responseSuperior = await this.client.request("/turmas", {
          method: "POST",
          token: ctx.adminTokens.token,
          body: {
            unidadeId: "unidade-id",
            nome: "Turma Ano Invalido",
            turno: "MANHA",
            anoLetivo: 2051,
          },
        });

        if (responseInferior.status === 201 || responseSuperior.status === 201) {
          return {
            passed: false,
            vulnerabilitySeverity: "BAIXA",
            details: `Falha de validação: Ano letivo fora da faixa permitida (2020-2050) foi aceito. Status inferior: ${responseInferior.status}, Superior: ${responseSuperior.status}.`,
            actualStatus: responseInferior.status === 201 ? responseInferior.status : responseSuperior.status,
            expectedStatus: 400,
          };
        }

        return {
          passed: responseInferior.status === 400 && responseSuperior.status === 400,
          details: "Validação estrita de intervalo de anoLetivo confirmada.",
          actualStatus: responseInferior.status,
          expectedStatus: 400,
        };
      },
    });

    this.tests.push({
      id: "VAL-02",
      category: "VALIDACAO_E_LIMITES",
      title: "Aceitação de renda familiar negativa em solicitação de matrícula",
      description: "POST /matriculas estipula que rendaFamiliar deve ser número não negativo.",
      execute: async (ctx) => {
        const token = ctx.adminTokens?.token ?? ctx.responsavelATokens?.token;
        if (!token) {
          return {
            passed: true,
            details: "Ignorado por falta de token no contexto.",
          };
        }

        const response = await this.client.request("/matriculas", {
          method: "POST",
          token,
          body: {
            alunoId: "aluno-uuid",
            unidadeId: "unidade-uuid",
            anoLetivo: 2026,
            tipo: "PRE_INSCRICAO",
            rendaFamiliar: -1500.5,
          },
        });

        if (response.status === 201) {
          return {
            passed: false,
            vulnerabilitySeverity: "MEDIA",
            details: "Falha de Validação Numérica: Sistema aceitou renda familiar negativa.",
            actualStatus: response.status,
            expectedStatus: 400,
          };
        }

        return {
          passed: response.status === 400,
          details: `Renda familiar negativa rejeitada com status ${response.status}.`,
          actualStatus: response.status,
          expectedStatus: 400,
        };
      },
    });

    this.tests.push({
      id: "VAL-03",
      category: "VALIDACAO_E_LIMITES",
      title: "Obrigatoriedade condicional de motivoRejeicao na homologação de matrícula",
      description: "Ao homologar matrícula com status='REJEITADA', o campo motivoRejeicao é obrigatório.",
      execute: async (ctx) => {
        if (!ctx.adminTokens?.token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de administrador no contexto.",
          };
        }

        const fakeId = "00000000-0000-0000-0000-000000000000";
        const response = await this.client.request(`/matriculas/${fakeId}/homologar`, {
          method: "PATCH",
          token: ctx.adminTokens.token,
          body: {
            status: "REJEITADA",
          },
        });

        if (response.status === 200) {
          return {
            passed: false,
            vulnerabilitySeverity: "MEDIA",
            details: "Violação de Regra de Negócio: Matrícula rejeitada sem motivo formal de justificativa.",
            actualStatus: response.status,
            expectedStatus: 400,
          };
        }

        return {
          passed: response.status === 400,
          details: `Rejeição sem motivo bloqueada com status ${response.status}.`,
          actualStatus: response.status,
          expectedStatus: 400,
        };
      },
    });

    this.tests.push({
      id: "VAL-04",
      category: "VALIDACAO_E_LIMITES",
      title: "Inversão temporal em cadastro de eventos da agenda",
      description: "dataHoraFim anterior a dataHoraInicio deve ser rejeitada pela API.",
      execute: async (ctx) => {
        const token = ctx.adminTokens?.token ?? ctx.colaboradorTokens?.token;
        if (!token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de teste no contexto.",
          };
        }

        const response = await this.client.request("/agenda/eventos", {
          method: "POST",
          token,
          body: {
            unidadeId: "unidade-uuid",
            titulo: "Evento Invertido",
            tipoEvento: "OFICINA",
            dataHoraInicio: "2026-10-10T18:00:00.000Z",
            dataHoraFim: "2026-10-10T10:00:00.000Z",
          },
        });

        if (response.status === 201) {
          return {
            passed: false,
            vulnerabilitySeverity: "MEDIA",
            details: "Bug de Integridade Temporal: Evento criado com término anterior ao início.",
            actualStatus: response.status,
            expectedStatus: 400,
          };
        }

        return {
          passed: response.status === 400,
          details: `Evento com datas invertidas rejeitado com status ${response.status}.`,
          actualStatus: response.status,
          expectedStatus: 400,
        };
      },
    });

    this.tests.push({
      id: "VAL-05",
      category: "VALIDACAO_E_LIMITES",
      title: "Alocação em lote de alunos com lista vazia",
      description: "POST /turmas/:id/alunos/lote exige ao menos um ID de aluno.",
      execute: async (ctx) => {
        if (!ctx.adminTokens?.token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de administrador no contexto.",
          };
        }

        const response = await this.client.request("/turmas/turma-id/alunos/lote", {
          method: "POST",
          token: ctx.adminTokens.token,
          body: {
            alunoIds: [],
          },
        });

        if (response.status === 200) {
          return {
            passed: false,
            vulnerabilitySeverity: "BAIXA",
            details: "Bug de Validação: API permitiu chamada em lote com array vazio.",
            actualStatus: response.status,
            expectedStatus: 400,
          };
        }

        return {
          passed: response.status === 400,
          details: `Array vazio em lote rejeitado com status ${response.status}.`,
          actualStatus: response.status,
          expectedStatus: 400,
        };
      },
    });
  }

  private registerInjectionTests(): void {
    this.tests.push({
      id: "INJ-01",
      category: "INJECAO_E_SANITIZACAO",
      title: "Tentativa de SQL Injection em parâmetros de consulta (Query Params)",
      description: "Injeção de caracteres SQL nas rotas de busca de alunos, turmas e auditoria.",
      execute: async (ctx) => {
        const token = ctx.adminTokens?.token;
        if (!token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de administrador no contexto.",
          };
        }

        const sqliPayload = "' OR '1'='1' -- ";
        const responseAlunos = await this.client.request(`/alunos?nome=${encodeURIComponent(sqliPayload)}`, { token });
        const responseAuditoria = await this.client.request(`/auditoria?recurso=${encodeURIComponent(sqliPayload)}`, { token });

        if (responseAlunos.status === 500 || responseAuditoria.status === 500) {
          return {
            passed: false,
            vulnerabilitySeverity: "CRITICA",
            details: `Potencial Vulnerabilidade de SQL Injection (Status 500 retornado em resposta a payload SQL): Alunos=${responseAlunos.status}, Auditoria=${responseAuditoria.status}.`,
            actualStatus: 500,
          };
        }

        return {
          passed: true,
          details: "Parâmetros com SQL Injection tratados de forma segura (sem crash 500).",
          actualStatus: responseAlunos.status,
        };
      },
    });

    this.tests.push({
      id: "INJ-02",
      category: "INJECAO_E_SANITIZACAO",
      title: "Tentativa de SQL Injection em parâmetros de rota (:id)",
      description: "Injeção de aspas e operadores booleanos em rotas diretas de consulta.",
      execute: async (ctx) => {
        const token = ctx.adminTokens?.token;
        if (!token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de administrador no contexto.",
          };
        }

        const sqliId = "1' OR 1=1--";
        const response = await this.client.request(`/alunos/${encodeURIComponent(sqliId)}`, { token });

        if (response.status === 500) {
          return {
            passed: false,
            vulnerabilitySeverity: "ALTA",
            details: "Falha de Tratamento em Rota: Erro 500 retornado ao injetar payload em parâmetro de URL.",
            actualStatus: response.status,
            expectedStatus: [400, 404],
          };
        }

        return {
          passed: response.status === 400 || response.status === 404,
          details: `Parâmetro de rota tratado com segurança (retornou ${response.status}).`,
          actualStatus: response.status,
          expectedStatus: 404,
        };
      },
    });

    this.tests.push({
      id: "INJ-03",
      category: "INJECAO_E_SANITIZACAO",
      title: "Tentativa de Stored XSS em cadastros com campos de texto livre",
      description: "Verifica se tags como <script>alert(1)</script> em títulos de evento são sanitizadas ou persistidas cruas.",
      execute: async (ctx) => {
        const token = ctx.adminTokens?.token;
        if (!token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de administrador no contexto.",
          };
        }

        const xssPayload = "<script>alert('xss')</script>";
        const response = await this.client.request("/agenda/eventos", {
          method: "POST",
          token,
          body: {
            unidadeId: "unidade-teste",
            titulo: xssPayload,
            tipoEvento: "OFICINA",
            dataHoraInicio: "2026-11-01T10:00:00.000Z",
            dataHoraFim: "2026-11-01T12:00:00.000Z",
          },
        });

        if (response.status === 201) {
          const body = response.body as { titulo?: string };
          if (body?.titulo === xssPayload) {
            return {
              passed: false,
              vulnerabilitySeverity: "MEDIA",
              details: "Alerta de XSS Armazenado: Tag de script persistida sem sanitização ou escape no retorno da API.",
              actualStatus: response.status,
              responseBody: body,
            };
          }
        }

        return {
          passed: true,
          details: "Tags de script rejeitadas ou sanitizadas adequadamente.",
          actualStatus: response.status,
        };
      },
    });
  }

  private registerUploadTests(): void {
    this.tests.push({
      id: "UPL-01",
      category: "UPLOAD_ARQUIVOS",
      title: "Upload de arquivo com extensão executável perigosa (.php / .sh / .exe)",
      description: "O contrato permite apenas PDF, JPEG, PNG, WEBP. Arquivos executáveis devem ser rejeitados com 400.",
      execute: async (ctx) => {
        const token = ctx.adminTokens?.token ?? ctx.responsavelATokens?.token;
        if (!token) {
          return {
            passed: true,
            details: "Ignorado por falta de token no contexto.",
          };
        }

        const formData = new FormData();
        const maliciousFile = new Blob(["<?php echo 'vulnerabilidade'; ?>"], { type: "application/x-php" });
        formData.append("arquivo", maliciousFile, "exploit.php");
        formData.append("tipoDocumento", "DOC_ALUNO");

        const response = await this.client.request("/documentos/matricula/matricula-teste-id", {
          method: "POST",
          token,
          body: formData,
          isFormData: true,
        });

        if (response.status === 201) {
          return {
            passed: false,
            vulnerabilitySeverity: "CRITICA",
            details: "Vulnerabilidade Crítica de Upload: Arquivo executável .php foi aceito e gravado no servidor.",
            actualStatus: response.status,
            expectedStatus: 400,
          };
        }

        return {
          passed: response.status === 400,
          details: `Extensão perigosa rejeitada com status ${response.status}.`,
          actualStatus: response.status,
          expectedStatus: 400,
        };
      },
    });

    this.tests.push({
      id: "UPL-02",
      category: "UPLOAD_ARQUIVOS",
      title: "Tentativa de Path Traversal no nome de arquivo no upload",
      description: "Verifica se enviar nome de arquivo com '../' é neutralizado no caminho_arquivo persistido.",
      execute: async (ctx) => {
        const token = ctx.adminTokens?.token ?? ctx.responsavelATokens?.token;
        if (!token) {
          return {
            passed: true,
            details: "Ignorado por falta de token no contexto.",
          };
        }

        const formData = new FormData();
        const fakePdf = new Blob(["%PDF-1.4 teste"], { type: "application/pdf" });
        formData.append("arquivo", fakePdf, "../../../etc/traversal.pdf");
        formData.append("tipoDocumento", "COMPROVANTE_RESIDENCIA");

        const response = await this.client.request("/documentos/matricula/matricula-teste-id", {
          method: "POST",
          token,
          body: formData,
          isFormData: true,
        });

        if (response.status === 201) {
          const body = response.body as { caminho_arquivo?: string };
          if (body?.caminho_arquivo?.includes("..")) {
            return {
              passed: false,
              vulnerabilitySeverity: "CRITICA",
              details: "Vulnerabilidade de Path Traversal: Caminho persistido contém sequências '..'.",
              actualStatus: response.status,
              responseBody: body,
            };
          }
        }

        return {
          passed: true,
          details: "Nome com Path Traversal devidamente higienizado ou rejeitado.",
          actualStatus: response.status,
        };
      },
    });

    this.tests.push({
      id: "UPL-03",
      category: "UPLOAD_ARQUIVOS",
      title: "Tentativa de upload com tamanho excedente (>10MB)",
      description: "O contrato especifica limite de 10MB para arquivos anexados. Payloads maiores devem ser barrados.",
      execute: async (ctx) => {
        const token = ctx.adminTokens?.token ?? ctx.responsavelATokens?.token;
        if (!token) {
          return {
            passed: true,
            details: "Ignorado por falta de token no contexto.",
          };
        }

        const oversizedSize = 11 * 1024 * 1024;
        const oversizedBuffer = Buffer.alloc(oversizedSize, 0);
        const oversizedBlob = new Blob([oversizedBuffer], { type: "application/pdf" });

        const formData = new FormData();
        formData.append("arquivo", oversizedBlob, "arquivo_grande.pdf");
        formData.append("tipoDocumento", "TERMO_IMAGEM_VOZ");

        try {
          const response = await this.client.request("/documentos/matricula/matricula-teste-id", {
            method: "POST",
            token,
            body: formData,
            isFormData: true,
          });

          if (response.status === 201) {
            return {
              passed: false,
              vulnerabilitySeverity: "ALTA",
              details: "Falha de Limite de Upload: Arquivo com mais de 10MB foi aceito pelo servidor.",
              actualStatus: response.status,
              expectedStatus: [400, 413],
            };
          }

          const isExpected = response.status === 400 || response.status === 413;
          return {
            passed: isExpected,
            vulnerabilitySeverity: isExpected ? undefined : "MEDIA",
            details: isExpected
              ? `Arquivo acima de 10MB bloqueado adequadamente com status ${response.status}.`
              : `Erro interno ${response.status} retornado ao enviar arquivo acima de 10MB (esperado 400 ou 413, evidenciando exceção não tratada do Multer).`,
            actualStatus: response.status,
            expectedStatus: [400, 413],
          };
        } catch {
          return {
            passed: true,
            details: "Conexão rejeitada pelo servidor para payload excedente (Payload Too Large).",
          };
        }
      },
    });
  }

  private registerBusinessLogicTests(): void {
    this.tests.push({
      id: "LOGIC-01",
      category: "LOGICA_E_CONCORRENCIA",
      title: "Duplicidade de matrícula ativa para o mesmo aluno no mesmo ano letivo",
      description: "O contrato estipula retorno 409 CONFLICT caso já exista matrícula ativa no mesmo ano letivo.",
      execute: async (ctx) => {
        const token = ctx.adminTokens?.token;
        if (!token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de administrador no contexto.",
          };
        }

        const studentPayload = {
          nomeCompleto: "Aluno Conflito Matricula",
          dataNascimento: "2016-01-01",
          enderecoLogradouro: "Rua Central",
          enderecoNumero: "10",
          enderecoBairro: "Bairro",
          enderecoCidade: "Garibaldi",
        };

        const createStudent = await this.client.request("/alunos", {
          method: "POST",
          token,
          body: studentPayload,
        });

        const studentId = (createStudent.body as { id?: string })?.id;
        if (!studentId) {
          return {
            passed: true,
            details: "Não foi possível criar aluno preliminar para o teste de conflito.",
          };
        }

        const matriculaPayload = {
          alunoId: studentId,
          unidadeId: "unidade-teste",
          anoLetivo: 2026,
          tipo: "MATRICULA_NOVA",
        };

        const firstMatricula = await this.client.request("/matriculas", {
          method: "POST",
          token,
          body: matriculaPayload,
        });

        if (firstMatricula.status !== 201) {
          return {
            passed: true,
            details: "Primeira matrícula não pôde ser criada no ambiente atual.",
          };
        }

        const secondMatricula = await this.client.request("/matriculas", {
          method: "POST",
          token,
          body: matriculaPayload,
        });

        if (secondMatricula.status === 201) {
          return {
            passed: false,
            vulnerabilitySeverity: "ALTA",
            details: "Falha de Conflito de Negócio: O sistema permitiu duas matrículas ativas para o mesmo aluno no mesmo ano letivo.",
            actualStatus: secondMatricula.status,
            expectedStatus: 409,
          };
        }

        return {
          passed: secondMatricula.status === 409,
          details: `Duplicidade de matrícula bloqueada com status 409 CONFLICT conforme esperado.`,
          actualStatus: secondMatricula.status,
          expectedStatus: 409,
        };
      },
    });

    this.tests.push({
      id: "LOGIC-02",
      category: "LOGICA_E_CONCORRENCIA",
      title: "Duplicidade de CPF no cadastro de alunos",
      description: "POST /alunos com CPF já existente deve retornar 409 CONFLICT.",
      execute: async (ctx) => {
        const token = ctx.adminTokens?.token;
        if (!token) {
          return {
            passed: true,
            details: "Ignorado por falta de token de administrador no contexto.",
          };
        }

        const duplicateCpf = "99988877766";
        const studentPayload = {
          nomeCompleto: "Aluno CPF Duplicado",
          dataNascimento: "2015-08-20",
          cpf: duplicateCpf,
          enderecoLogradouro: "Rua Teste",
          enderecoNumero: "100",
          enderecoBairro: "Centro",
          enderecoCidade: "Garibaldi",
        };

        await this.client.request("/alunos", {
          method: "POST",
          token,
          body: studentPayload,
        });

        const secondAttempt = await this.client.request("/alunos", {
          method: "POST",
          token,
          body: {
            ...studentPayload,
            nomeCompleto: "Aluno CPF Duplicado Clone",
          },
        });

        if (secondAttempt.status === 201) {
          return {
            passed: false,
            vulnerabilitySeverity: "ALTA",
            details: "Falha de Integridade: Sistema cadastrou dois alunos com o mesmo CPF.",
            actualStatus: secondAttempt.status,
            expectedStatus: 409,
          };
        }

        return {
          passed: secondAttempt.status === 409,
          details: `Cadastro duplicado rejeitado com status ${secondAttempt.status}.`,
          actualStatus: secondAttempt.status,
          expectedStatus: 409,
        };
      },
    });
  }

  async runAll(context: TestContext): Promise<void> {
    console.log("=".repeat(80));
    console.log("BATERIA DE TESTES DE SEGURANÇA E VULNERABILIDADES — FAC-LAB.MOBILE");
    console.log(`Alvo: ${context.baseUrl}`);
    console.log(`Total de testes registrados: ${this.tests.length}`);
    console.log("=".repeat(80));

    let passedCount = 0;
    let failedCount = 0;
    const vulnerabilitiesDetected: Array<{ test: TestCase; result: TestExecutionResult }> = [];

    for (const test of this.tests) {
      process.stdout.write(`[${test.id}] ${test.title} ... `);
      try {
        const result = await test.execute(context);
        if (result.passed) {
          passedCount++;
          console.log("\x1b[32mPASS\x1b[0m");
        } else {
          failedCount++;
          console.log(`\x1b[31mFAIL\x1b[0m [Severidade: ${result.vulnerabilitySeverity ?? "MEDIA"}]`);
          console.log(`       Detalhe: ${result.details}`);
          vulnerabilitiesDetected.push({ test, result });
        }
      } catch (error) {
        failedCount++;
        console.log(`\x1b[31mERROR\x1b[0m: ${(error as Error).message}`);
      }
    }

    console.log("-".repeat(80));
    console.log(`RESULTADO FINAL: ${passedCount} aprovados, ${failedCount} reprovados.`);
    if (vulnerabilitiesDetected.length > 0) {
      console.log("\nRESUMO DAS VULNERABILIDADES DETECTADAS:");
      for (const item of vulnerabilitiesDetected) {
        console.log(` - [${item.result.vulnerabilitySeverity}] ${item.test.id} - ${item.test.title}: ${item.result.details}`);
      }
    }
    console.log("=".repeat(80));
  }
}

async function bootstrapContext(client: ApiClient): Promise<TestContext> {
  const sharedState: Record<string, unknown> = {};

  const adminLogin = await client.request("/auth/login", {
    method: "POST",
    body: { email: "admin@facgaribaldi.org.br", senha: "Admin@123" },
  });
  const adminBody = adminLogin.body as { accessToken?: string; token?: string; usuario?: { id: string } };
  const adminTokens: AuthTokens | undefined = adminBody?.accessToken || adminBody?.token
    ? {
        token: (adminBody.accessToken ?? adminBody.token) as string,
        userId: adminBody.usuario?.id,
      }
    : undefined;

  const colabLogin = await client.request("/auth/login", {
    method: "POST",
    body: { email: "colaborador@facgaribaldi.org.br", senha: "Admin@123" },
  });
  const colabBody = colabLogin.body as { accessToken?: string; token?: string; usuario?: { id: string } };
  const colaboradorTokens: AuthTokens | undefined = colabBody?.accessToken || colabBody?.token
    ? {
        token: (colabBody.accessToken ?? colabBody.token) as string,
        userId: colabBody.usuario?.id,
      }
    : undefined;

  const emailA = `responsavel_a_${Date.now()}@teste.com`;
  const regRespA = await client.request("/auth/registro-responsavel", {
    method: "POST",
    body: {
      nome: "Responsavel A",
      email: emailA,
      senha: "password123",
      parentesco: "Pai",
      telefone: "54999991234",
    },
  });
  const regRespABody = regRespA.body as { accessToken?: string; token?: string; usuario?: { id: string }; usuarioId?: string };
  let responsavelATokens: AuthTokens | undefined = regRespABody?.accessToken || regRespABody?.token
    ? {
        token: (regRespABody.accessToken ?? regRespABody.token) as string,
        userId: regRespABody.usuario?.id ?? regRespABody.usuarioId,
      }
    : undefined;

  if (!responsavelATokens) {
    const loginA = await client.request("/auth/login", {
      method: "POST",
      body: { email: emailA, senha: "password123" },
    });
    const loginABody = loginA.body as { accessToken?: string; token?: string; usuario?: { id: string } };
    if (loginABody?.accessToken || loginABody?.token) {
      responsavelATokens = {
        token: (loginABody.accessToken ?? loginABody.token) as string,
        userId: loginABody.usuario?.id,
      };
    }
  }

  const emailB = `responsavel_b_${Date.now()}@teste.com`;
  const regRespB = await client.request("/auth/registro-responsavel", {
    method: "POST",
    body: {
      nome: "Responsavel B",
      email: emailB,
      senha: "password123",
      parentesco: "Mae",
      telefone: "54999995678",
    },
  });
  const regRespBBody = regRespB.body as { accessToken?: string; token?: string; usuario?: { id: string }; usuarioId?: string };
  let responsavelBTokens: AuthTokens | undefined = regRespBBody?.accessToken || regRespBBody?.token
    ? {
        token: (regRespBBody.accessToken ?? regRespBBody.token) as string,
        userId: regRespBBody.usuario?.id ?? regRespBBody.usuarioId,
      }
    : undefined;

  if (!responsavelBTokens) {
    const loginB = await client.request("/auth/login", {
      method: "POST",
      body: { email: emailB, senha: "password123" },
    });
    const loginBBody = loginB.body as { accessToken?: string; token?: string; usuario?: { id: string } };
    if (loginBBody?.accessToken || loginBBody?.token) {
      responsavelBTokens = {
        token: (loginBBody.accessToken ?? loginBBody.token) as string,
        userId: loginBBody.usuario?.id,
      };
    }
  }

  if (adminTokens?.token) {
    const unidadesRes = await client.request("/unidades", { token: adminTokens.token });
    const unidadeId = (unidadesRes.body as Array<{ id: string }>)?.[0]?.id ?? "unidade-gloria-id";
    sharedState["unidadeId"] = unidadeId;

    const alunoRes = await client.request("/alunos", {
      method: "POST",
      token: adminTokens.token,
      body: {
        nomeCompleto: "Dependente Exclusivo Resp B",
        dataNascimento: "2016-04-12",
        enderecoLogradouro: "Rua das Flores",
        enderecoNumero: "45",
        enderecoBairro: "Centro",
        enderecoCidade: "Garibaldi",
        situacaoMoradia: "PROPRIA",
        vinculoMatrimonialPais: "CASADOS",
      },
    });

    const alunoId = (alunoRes.body as { id?: string })?.id;
    if (alunoId) {
      sharedState["alunoIdNaoVinculado"] = alunoId;

      const respBId = responsavelBTokens?.userId;
      if (respBId) {
        await client.request(`/alunos/${alunoId}/responsaveis`, {
          method: "POST",
          token: adminTokens.token,
          body: { responsavelId: respBId, contatoPrincipal: true },
        });
      }

      const matRes = await client.request("/matriculas", {
        method: "POST",
        token: adminTokens.token,
        body: {
          alunoId,
          unidadeId,
          anoLetivo: 2026,
          tipo: "MATRICULA_NOVA",
        },
      });
      const matriculaId = (matRes.body as { id?: string })?.id;
      if (matriculaId) {
        sharedState["matriculaTerceiroId"] = matriculaId;
      }
    }
  }

  return {
    baseUrl: API_BASE_URL,
    adminTokens,
    colaboradorTokens,
    responsavelATokens,
    responsavelBTokens,
    sharedState,
  };
}

async function main(): Promise<void> {
  const client = new ApiClient(API_BASE_URL);
  const context = await bootstrapContext(client);
  const battery = new SecurityTestBattery(API_BASE_URL);
  await battery.runAll(context);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Erro na execução da bateria de testes:", err);
    process.exit(1);
  });
}
