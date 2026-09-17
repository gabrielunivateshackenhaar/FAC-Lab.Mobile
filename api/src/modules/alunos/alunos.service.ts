import crypto from 'crypto';
import { getDatabase } from '../../config/database';
import { ConflictError, ForbiddenError, NotFoundError } from '../../core/errors/AppError';
import { UsuarioAutenticado } from '../../core/types/usuario';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { AtualizarAlunoInput, CriarAlunoInput, ListarAlunosQuery } from './alunos.schemas';

export interface AlunoModel {
  id: string;
  nome_completo: string;
  sexo: string | null;
  data_nascimento: string;
  naturalidade: string | null;
  uf_naturalidade: string | null;
  cpf: string | null;
  rg: string | null;
  religiao: string | null;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_bairro: string;
  endereco_cidade: string;
  telefone_recado: string | null;
  problemas_saude: string | null;
  escola_regular: string | null;
  serie_escolar: string | null;
  situacao_moradia: string | null;
  vinculo_matrimonial_pais: string | null;
  foto_url: string | null;
  status: 'ATIVO' | 'INATIVO' | 'LISTA_ESPERA';
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface ResponsavelVinculado {
  id: string;
  nome: string;
  parentesco: string;
  telefone: string;
  contato_principal: number;
}

export interface AlunoDetalhado extends Omit<AlunoModel, 'situacao_moradia' | 'vinculo_matrimonial_pais'> {
  situacao_moradia?: string | null;
  vinculo_matrimonial_pais?: string | null;
  responsaveis: ResponsavelVinculado[];
}

export class AlunosService {
  private static buscarResponsavelPorUsuarioId(usuarioId: string): { id: string } | undefined {
    const db = getDatabase();
    return db.prepare('SELECT id FROM responsaveis WHERE usuario_id = ?').get(usuarioId) as { id: string } | undefined;
  }

  public static criar(input: CriarAlunoInput, usuarioId: string, ip?: string): AlunoModel {
    const db = getDatabase();

    if (input.cpf) {
      const alunoExistente = db.prepare('SELECT id FROM alunos WHERE cpf = ?').get(input.cpf);
      if (alunoExistente) {
        throw new ConflictError('CPF ja cadastrado para outro aluno');
      }
    }

    const alunoId = crypto.randomUUID();

    const insertSql = `
      INSERT INTO alunos (
        id, nome_completo, sexo, data_nascimento, naturalidade, uf_naturalidade,
        cpf, rg, religiao, endereco_logradouro, endereco_numero, endereco_bairro,
        endereco_cidade, telefone_recado, problemas_saude, escola_regular,
        serie_escolar, situacao_moradia, vinculo_matrimonial_pais, foto_url,
        status, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.prepare(insertSql).run(
      alunoId,
      input.nomeCompleto,
      input.sexo ?? null,
      input.dataNascimento,
      input.naturalidade ?? null,
      input.ufNaturalidade ?? null,
      input.cpf ?? null,
      input.rg ?? null,
      input.religiao ?? null,
      input.enderecoLogradouro,
      input.enderecoNumero,
      input.enderecoBairro,
      input.enderecoCidade,
      input.telefoneRecado ?? null,
      input.problemasSaude ?? null,
      input.escolaRegular ?? null,
      input.serieEscolar ?? null,
      input.situacaoMoradia ?? null,
      input.vinculoMatrimonialPais ?? null,
      input.fotoUrl ?? null,
      input.status ?? 'ATIVO',
      input.observacoes ?? null
    );

    if (input.responsavelId) {
      const responsavelExiste = db.prepare('SELECT id FROM responsaveis WHERE id = ?').get(input.responsavelId);
      if (responsavelExiste) {
        db.prepare(
          `INSERT INTO alunos_responsaveis (aluno_id, responsavel_id, contato_principal)
           VALUES (?, ?, ?)`
        ).run(alunoId, input.responsavelId, input.contatoPrincipal ? 1 : 0);
      }
    }

    AuditoriaService.registrar({
      usuarioId,
      acao: 'CRIAR',
      recurso: 'alunos',
      recursoId: alunoId,
      detalhes: { nomeCompleto: input.nomeCompleto, status: input.status },
      enderecoIp: ip
    });

    return db.prepare('SELECT * FROM alunos WHERE id = ?').get(alunoId) as AlunoModel;
  }

  public static listar(query: ListarAlunosQuery, usuarioAutenticado: UsuarioAutenticado): AlunoModel[] {
    const db = getDatabase();

    if (usuarioAutenticado.papel === 'RESPONSAVEL') {
      const responsavel = this.buscarResponsavelPorUsuarioId(usuarioAutenticado.id);
      if (!responsavel) {
        return [];
      }

      return db.prepare(
        `SELECT a.* FROM alunos a
         INNER JOIN alunos_responsaveis ar ON ar.aluno_id = a.id
         WHERE ar.responsavel_id = ?
         ORDER BY a.nome_completo ASC`
      ).all(responsavel.id) as AlunoModel[];
    }

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (query.nome) {
      whereClauses.push('a.nome_completo LIKE ?');
      params.push(`%${query.nome}%`);
    }

    if (query.status) {
      whereClauses.push('a.status = ?');
      params.push(query.status);
    }

    if (query.turmaId) {
      whereClauses.push('EXISTS (SELECT 1 FROM turmas_alunos ta WHERE ta.aluno_id = a.id AND ta.turma_id = ?)');
      params.push(query.turmaId);
    }

    if (query.unidadeId) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM matriculas m
        WHERE m.aluno_id = a.id AND m.unidade_id = ?
      )`);
      params.push(query.unidadeId);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (query.pagina - 1) * query.limite;

    const sql = `
      SELECT a.* FROM alunos a
      ${whereSql}
      ORDER BY a.nome_completo ASC
      LIMIT ? OFFSET ?
    `;

    params.push(query.limite, offset);

    const alunos = db.prepare(sql).all(...params) as AlunoModel[];

    if (usuarioAutenticado.papel === 'COLABORADOR') {
      return alunos.map((aluno) => ({
        ...aluno,
        situacao_moradia: null,
        vinculo_matrimonial_pais: null
      }));
    }

    return alunos;
  }

  public static obterPorId(alunoId: string, usuarioAutenticado: UsuarioAutenticado, ip?: string): AlunoDetalhado {
    const db = getDatabase();
    const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(alunoId) as AlunoModel | undefined;

    if (!aluno) {
      throw new NotFoundError('Aluno nao encontrado');
    }

    if (usuarioAutenticado.papel === 'RESPONSAVEL') {
      const responsavel = this.buscarResponsavelPorUsuarioId(usuarioAutenticado.id);
      if (!responsavel) {
        throw new ForbiddenError('Perfil de responsavel nao configurado');
      }

      const vinculo = db.prepare(
        'SELECT 1 FROM alunos_responsaveis WHERE aluno_id = ? AND responsavel_id = ?'
      ).get(alunoId, responsavel.id);

      if (!vinculo) {
        throw new ForbiddenError('Acesso restrito aos dependentes vinculados ao responsavel');
      }
    }

    AuditoriaService.registrar({
      usuarioId: usuarioAutenticado.id,
      acao: 'VISUALIZAR_SENSIVEL',
      recurso: 'alunos',
      recursoId: alunoId,
      enderecoIp: ip
    });

    const responsaveis = db.prepare(
      `SELECT r.id, r.nome, r.parentesco, r.telefone, ar.contato_principal
       FROM responsaveis r
       INNER JOIN alunos_responsaveis ar ON ar.responsavel_id = r.id
       WHERE ar.aluno_id = ?
       ORDER BY ar.contato_principal DESC, r.nome ASC`
    ).all(alunoId) as ResponsavelVinculado[];

    if (usuarioAutenticado.papel === 'COLABORADOR') {
      const { situacao_moradia, vinculo_matrimonial_pais, ...dadosPermitidos } = aluno;
      return {
        ...dadosPermitidos,
        responsaveis
      };
    }

    return {
      ...aluno,
      responsaveis
    };
  }

  public static atualizar(alunoId: string, input: AtualizarAlunoInput, usuarioId: string, ip?: string): AlunoModel {
    const db = getDatabase();
    const alunoExistente = db.prepare('SELECT id FROM alunos WHERE id = ?').get(alunoId);

    if (!alunoExistente) {
      throw new NotFoundError('Aluno nao encontrado');
    }

    if (input.cpf) {
      const conflitoCpf = db.prepare('SELECT id FROM alunos WHERE cpf = ? AND id != ?').get(input.cpf, alunoId);
      if (conflitoCpf) {
        throw new ConflictError('CPF ja cadastrado para outro aluno');
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    const camposMapeados: Record<string, string> = {
      nomeCompleto: 'nome_completo',
      sexo: 'sexo',
      dataNascimento: 'data_nascimento',
      naturalidade: 'naturalidade',
      ufNaturalidade: 'uf_naturalidade',
      cpf: 'cpf',
      rg: 'rg',
      religiao: 'religiao',
      enderecoLogradouro: 'endereco_logradouro',
      enderecoNumero: 'endereco_numero',
      enderecoBairro: 'endereco_bairro',
      enderecoCidade: 'endereco_cidade',
      telefoneRecado: 'telefone_recado',
      problemasSaude: 'problemas_saude',
      escolaRegular: 'escola_regular',
      serieEscolar: 'serie_escolar',
      situacaoMoradia: 'situacao_moradia',
      vinculoMatrimonialPais: 'vinculo_matrimonial_pais',
      fotoUrl: 'foto_url',
      status: 'status',
      observacoes: 'observacoes'
    };

    for (const [chaveInput, colunaDb] of Object.entries(camposMapeados)) {
      if ((input as Record<string, unknown>)[chaveInput] !== undefined) {
        updates.push(`${colunaDb} = ?`);
        values.push((input as Record<string, unknown>)[chaveInput]);
      }
    }

    if (updates.length > 0) {
      updates.push("atualizado_em = DATETIME('now')");
      values.push(alunoId);

      db.prepare(`UPDATE alunos SET ${updates.join(', ')} WHERE id = ?`).run(...values);

      AuditoriaService.registrar({
        usuarioId,
        acao: 'ATUALIZAR',
        recurso: 'alunos',
        recursoId: alunoId,
        detalhes: { alteracoes: updates },
        enderecoIp: ip
      });
    }

    return db.prepare('SELECT * FROM alunos WHERE id = ?').get(alunoId) as AlunoModel;
  }

  public static inativar(alunoId: string, usuarioId: string, ip?: string): void {
    const db = getDatabase();
    const aluno = db.prepare('SELECT id FROM alunos WHERE id = ?').get(alunoId);

    if (!aluno) {
      throw new NotFoundError('Aluno nao encontrado');
    }

    db.prepare("UPDATE alunos SET status = 'INATIVO', atualizado_em = DATETIME('now') WHERE id = ?").run(alunoId);

    AuditoriaService.registrar({
      usuarioId,
      acao: 'EXCLUIR',
      recurso: 'alunos',
      recursoId: alunoId,
      detalhes: { acao: 'INATIVACAO_LOGICA' },
      enderecoIp: ip
    });
  }

  public static vincularResponsavel(
    alunoId: string,
    responsavelId: string,
    contatoPrincipal: boolean,
    usuarioId: string
  ): void {
    const db = getDatabase();

    const aluno = db.prepare('SELECT id FROM alunos WHERE id = ?').get(alunoId);
    if (!aluno) {
      throw new NotFoundError('Aluno nao encontrado');
    }

    const responsavel = db.prepare('SELECT id FROM responsaveis WHERE id = ?').get(responsavelId);
    if (!responsavel) {
      throw new NotFoundError('Responsavel nao encontrado');
    }

    db.prepare(
      `INSERT INTO alunos_responsaveis (aluno_id, responsavel_id, contato_principal)
       VALUES (?, ?, ?)
       ON CONFLICT(aluno_id, responsavel_id) DO UPDATE SET
         contato_principal = excluded.contato_principal`
    ).run(alunoId, responsavelId, contatoPrincipal ? 1 : 0);

    AuditoriaService.registrar({
      usuarioId,
      acao: 'ATUALIZAR',
      recurso: 'alunos_responsaveis',
      recursoId: `${alunoId}:${responsavelId}`,
      detalhes: { alunoId, responsavelId, contatoPrincipal }
    });
  }

  public static desvincularResponsavel(alunoId: string, responsavelId: string, usuarioId: string): void {
    const db = getDatabase();

    const vinculo = db.prepare(
      'SELECT 1 FROM alunos_responsaveis WHERE aluno_id = ? AND responsavel_id = ?'
    ).get(alunoId, responsavelId);

    if (!vinculo) {
      throw new NotFoundError('Vinculo entre aluno e responsavel nao encontrado');
    }

    db.prepare('DELETE FROM alunos_responsaveis WHERE aluno_id = ? AND responsavel_id = ?').run(
      alunoId,
      responsavelId
    );

    AuditoriaService.registrar({
      usuarioId,
      acao: 'EXCLUIR',
      recurso: 'alunos_responsaveis',
      recursoId: `${alunoId}:${responsavelId}`,
      detalhes: { alunoId, responsavelId }
    });
  }
}
