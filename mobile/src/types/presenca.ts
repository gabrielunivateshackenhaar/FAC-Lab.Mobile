export interface PresencaEvento {
  id: string;
  evento_agenda_id: string;
  aluno_id: string;
  aluno_nome: string;
  presente: number | boolean;
  justificativa?: string | null;
  registrado_em: string;
}

export interface ItemHistoricoPresenca {
  eventoId: string;
  tituloEvento: string;
  dataHoraInicio: string;
  presente: boolean;
  justificativa?: string | null;
}

export interface RelatorioPresencaAluno {
  alunoId: string;
  nomeCompleto: string;
  totalEventos: number;
  totalPresencas: number;
  totalFaltas: number;
  percentualPresenca: number;
  historico: ItemHistoricoPresenca[];
}

export interface ItemPresencaRegistro {
  alunoId: string;
  presente: boolean;
  justificativa?: string;
}

export interface RequisicaoRegistrarPresencas {
  presencas: ItemPresencaRegistro[];
}
