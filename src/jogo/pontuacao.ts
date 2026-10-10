// Placar de uma obra. Acerto de primeira é o centro do método: dica não conta como erro,
// mas tira o acerto de primeira (documento do projeto, "Método pedagógico").

export interface ResultadoDesafio {
  desafioId: string;
  linhas: number;
  errosAntes: number;
  usouDica: boolean;
  dePrimeira: boolean;
  pontos: number;
}

export const PONTOS_POR_LINHA = 100;
export const BONUS_DE_PRIMEIRA = 0.5;
export const COMBO_MAXIMO = 2;

export function pontuarDesafio(parametros: {
  desafioId: string;
  linhas: number;
  errosAntes: number;
  usouDica: boolean;
  comboAtual: number;
}): { resultado: ResultadoDesafio; combo: number } {
  const { desafioId, linhas, errosAntes, usouDica, comboAtual } = parametros;
  const dePrimeira = errosAntes === 0 && !usouDica;
  const combo = dePrimeira ? comboAtual + 1 : 0;
  const base = PONTOS_POR_LINHA * linhas;
  const multiplicador = dePrimeira ? Math.min(1 + 0.25 * (combo - 1), COMBO_MAXIMO) : 1;
  const pontos = Math.round(base * (dePrimeira ? 1 + BONUS_DE_PRIMEIRA : 1) * multiplicador);
  return { resultado: { desafioId, linhas, errosAntes, usouDica, dePrimeira, pontos }, combo };
}

export type Estrelas = 1 | 2 | 3;

export function estrelasDaObra(resultados: ResultadoDesafio[]): Estrelas {
  if (resultados.length === 0) return 1;
  const taxa = resultados.filter((resultado) => resultado.dePrimeira).length / resultados.length;
  if (taxa >= 0.8) return 3;
  if (taxa >= 0.5) return 2;
  return 1;
}

export function totalDePontos(resultados: ResultadoDesafio[]): number {
  return resultados.reduce((soma, resultado) => soma + resultado.pontos, 0);
}
