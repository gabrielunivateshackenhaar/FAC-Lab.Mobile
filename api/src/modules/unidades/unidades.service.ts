import { getDatabase } from '../../config/database';
import { NotFoundError } from '../../core/errors/AppError';

export interface UnidadeModel {
  id: string;
  nome: string;
  endereco: string | null;
  telefone: string | null;
  criado_em: string;
  atualizado_em: string;
}

export class UnidadesService {
  public static listar(): UnidadeModel[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM unidades ORDER BY nome ASC').all() as UnidadeModel[];
  }

  public static obterPorId(id: string): UnidadeModel {
    const db = getDatabase();
    const unidade = db.prepare('SELECT * FROM unidades WHERE id = ?').get(id) as UnidadeModel | undefined;

    if (!unidade) {
      throw new NotFoundError('Unidade nao encontrada');
    }

    return unidade;
  }
}
