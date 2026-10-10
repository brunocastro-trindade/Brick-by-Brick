// Modelo de dados do jogo. O conteúdo bruto (YAML) vira estes tipos em conteudo.ts (ADR-0003).

export type Nivel = 'basico' | 'intermediario' | 'avancado';

export const MODELOS_DE_PREDIO = [
  'casa',
  'armazem',
  'mercado',
  'prefeitura',
  'cinema',
  'fabrica',
  'biblioteca',
  'oficina',
  'cofre',
  'torre',
] as const;
export type ModeloPredio = (typeof MODELOS_DE_PREDIO)[number];

export type TipoDesafio = 'montar' | 'empilhar' | 'digitar';

/** Classificação de um tijolo extra, herdada do método do documento do projeto. */
export type Classificacao = 'funciona_mas' | 'problema';

/** Uma linha de código. `recuo` conta níveis de 4 espaços. */
export interface Linha {
  recuo: number;
  texto: string;
}

export interface Tijolo {
  id: string;
  texto: string;
  /** Só tijolos extras (que não fazem parte da resposta) têm classificação e porquê. */
  classificacao?: Classificacao;
  porque?: string;
}

export type TijoloExtra = Tijolo & { classificacao: Classificacao; porque: string };

export type ParteDaLinha = { tipo: 'fixo'; texto: string } | { tipo: 'vaga'; indice: number };

interface DesafioBase {
  id: string;
  indice: number;
  titulo: string;
  contexto: string;
  dica?: string;
  explicacao: string;
  /** Código extra, invisível, rodado depois do programa para testar comportamento (ex.: chamar uma função). */
  verificar?: string;
  /** Linhas que o desafio acrescenta ao programa, na forma canônica. */
  linhas: Linha[];
}

export interface DesafioMontar extends DesafioBase {
  tipo: 'montar';
  recuo: number;
  partes: ParteDaLinha[];
  /** Texto do tijolo certo para cada vaga, na ordem. */
  resposta: string[];
  tijolos: Tijolo[];
}

export interface DesafioEmpilhar extends DesafioBase {
  tipo: 'empilhar';
  tijolos: Tijolo[];
}

export interface DesafioDigitar extends DesafioBase {
  tipo: 'digitar';
  recuo: number;
}

export type Desafio = DesafioMontar | DesafioEmpilhar | DesafioDigitar;

export interface Aula {
  titulo: string;
  texto: string;
  exemplo: string;
  saida?: string;
}

export interface Obra {
  id: string;
  ordem: number;
  nome: string;
  conceito: string;
  nivel: Nivel;
  modelo: ModeloPredio;
  /** Nome do arquivo exibido na planta, como "correio.py". */
  arquivo: string;
  aula: Aula;
  /** Conjuntos de entradas para input(). O primeiro aparece no console; todos validam comportamento. */
  entradas: string[][];
  /** Linhas prontas no começo da obra: o alicerce. */
  inicial: Linha[];
  desafios: Desafio[];
  totalLinhas: number;
}
