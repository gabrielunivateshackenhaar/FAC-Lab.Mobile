export type TipoDocumento =
  | 'DOC_ALUNO'
  | 'DOC_RESPONSAVEL'
  | 'COMPROVANTE_RESIDENCIA'
  | 'COMPROVANTE_RENDA'
  | 'TERMO_IMAGEM_VOZ'
  | 'FOTO_3X4'
  | 'OUTRO';

export interface Documento {
  id: string;
  matricula_id: string;
  tipo_documento: TipoDocumento;
  caminho_arquivo: string;
  nome_arquivo: string;
  tipo_mime: string;
  tamanho_bytes: number;
  enviado_em: string;
}
