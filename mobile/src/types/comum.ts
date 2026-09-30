export interface DetalheErro {
  campo: string;
  mensagem: string;
}

export interface RespostaErro {
  codigo: string;
  mensagem: string;
  detalhes?: DetalheErro[];
}

export interface PaginacaoConsulta {
  pagina?: number;
  limite?: number;
}
