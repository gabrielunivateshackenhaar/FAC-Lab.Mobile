import crypto from 'crypto';
import { getDatabase } from '../../config/database';
import { ForbiddenError, NotFoundError } from '../../core/errors/AppError';
import { UsuarioAutenticado } from '../../core/types/usuario';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { ItemPresencaInput } from './presencas.schemas';

export interface PresencaItemModel {
  id: string;
  evento_agenda_id: string;
  aluno_id: string;
  aluno_nome: string;
  presente: number;
  justificativa: string | null;
  registrado_em: string;
}

export interface FrequenciaAlunoRelatorio {
  alunoId: string;
  nomeCompleto: string;
  totalEventos: number;
  totalPresencas: number;
  totalFaltas: number;
  percentualPresenca: number;
  historico: Array<{
    eventoId: string;
    tituloEvento: string;
    dataHoraInicio: string;
    presente: boolean;
    justificativa: string | null;
  }>;
}

export class PresencasService {
  public static registrarLote(
    eventoId: string,
    itens: ItemPresencaInput[],
    usuarioId: string,
    ip?: string
  ): void {
    const db = getDatabase();

    const evento = db.prepare('SELECT id FROM eventos_agenda WHERE id = ?').get(eventoId);
    if (!evento) {
      throw new NotFoundError('Evento de agenda nao encontrado');
    }

    const stmtUpsert = db.prepare(
      `INSERT INTO presencas (id, evento_agenda_id, aluno_id, presente, justificativa)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(evento_agenda_id, aluno_id) DO UPDATE SET
         presente = excluded.presente,
         justificativa = excluded.justificativa,
         registrado_em = DATETIME('now')`
    );

    const loteTransaction = db.transaction((lista: ItemPresencaInput[]) => {
      for (const item of lista) {
        const id = crypto.randomUUID();
        stmtUpsert.run(id, eventoId, item.alunoId, item.presente ? 1 : 0, item.justificativa ?? null);
      }
    });

    loteTransaction(itens);

    AuditoriaService.registrar({
      usuarioId,
      acao: 'ATUALIZAR',
      recurso: 'presencas',
      recursoId: eventoId,
      detalhes: { eventoId, totalRegistros: itens.length },
      enderecoIp: ip
    });
  }

  public static listarPorEvento(eventoId: string): PresencaItemModel[] {
    const db = getDatabase();

    const evento = db.prepare('SELECT id FROM eventos_agenda WHERE id = ?').get(eventoId);
    if (!evento) {
      throw new NotFoundError('Evento de agenda nao encontrado');
    }

    return db.prepare(
      `SELECT p.*, a.nome_completo as aluno_nome
       FROM presencas p
       INNER JOIN alunos a ON a.id = p.aluno_id
       WHERE p.evento_agenda_id = ?
       ORDER BY a.nome_completo ASC`
    ).all(eventoId) as PresencaItemModel[];
  }

  public static obterFrequenciaAluno(
    alunoId: string,
    usuario: UsuarioAutenticado
  ): FrequenciaAlunoRelatorio {
    const db = getDatabase();

    const aluno = db.prepare('SELECT id, nome_completo FROM alunos WHERE id = ?').get(alunoId) as
      | { id: string; nome_completo: string }
      | undefined;

    if (!aluno) {
      throw new NotFoundError('Aluno nao encontrado');
    }

    if (usuario.papel === 'RESPONSAVEL') {
      const vinculo = db.prepare(
        `SELECT 1 FROM alunos_responsaveis ar
         INNER JOIN responsaveis r ON r.id = ar.responsavel_id
         WHERE ar.aluno_id = ? AND r.usuario_id = ?`
      ).get(alunoId, usuario.id);

      if (!vinculo) {
        throw new ForbiddenError('Acesso restrito apenas aos dependentes vinculados ao responsavel');
      }
    }

    const registros = db.prepare(
      `SELECT p.evento_agenda_id as eventoId, e.titulo as tituloEvento,
              e.data_hora_inicio as dataHoraInicio, p.presente, p.justificativa
       FROM presencas p
       INNER JOIN eventos_agenda e ON e.id = p.evento_agenda_id
       WHERE p.aluno_id = ?
       ORDER BY e.data_hora_inicio DESC`
    ).all(alunoId) as Array<{
      eventoId: string;
      tituloEvento: string;
      dataHoraInicio: string;
      presente: number;
      justificativa: string | null;
    }>;

    const totalEventos = registros.length;
    const totalPresencas = registros.filter((r) => r.presente === 1).length;
    const totalFaltas = totalEventos - totalPresencas;
    const percentualPresenca = totalEventos > 0 ? Math.round((totalPresencas / totalEventos) * 100) : 100;

    return {
      alunoId: aluno.id,
      nomeCompleto: aluno.nome_completo,
      totalEventos,
      totalPresencas,
      totalFaltas,
      percentualPresenca,
      historico: registros.map((r) => ({
        eventoId: r.eventoId,
        tituloEvento: r.tituloEvento,
        dataHoraInicio: r.dataHoraInicio,
        presente: r.presente === 1,
        justificativa: r.justificativa
      }))
    };
  }
}
