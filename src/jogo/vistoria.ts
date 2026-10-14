// Vistoria (ADR-0016): o programa da obra pronta é reescrito de memória, fiada por fiada. A planta dá o
// recuo e quantas linhas são; a pessoa digita o texto. Vale a validação do ADR-0004, no programa inteiro.
import type { ErroPython, Executor } from '../python/tipos';
import { linhasDaObraCompleta, textoDoPrograma } from './programa';
import { linhasEquivalentes } from './tokenizador';
import type { Linha, Obra } from './tipos';
import { compararComportamento, linhasIguais, type MotivoDiferenca } from './validacao';

export type VereditoDaVistoria =
  | { tipo: 'incompleta'; vazias: number[] }
  | { tipo: 'certo'; via: 'planta' | 'comportamento' }
  /** `linha`: índice da fiada onde o Python parou, quando ele aponta uma. */
  | { tipo: 'erro-python'; erro: ErroPython; linha: number | null }
  /** `linha`: primeira fiada que não confere com a planta (pode não ser a culpada, se a pessoa fez do seu jeito). */
  | { tipo: 'resultado-diferente'; motivo: MotivoDiferenca; linha: number | null }
  | { tipo: 'sem-python'; linha: number | null };

/** As linhas da planta, que a Vistoria esconde: o molde é o recuo e a quantidade. */
export function moldeDaVistoria(obra: Obra): Linha[] {
  return linhasDaObraCompleta(obra);
}

/** Os testes ocultos de todas as etapas, rodados juntos depois do programa inteiro. */
export function verificacaoDaObra(obra: Obra): string | undefined {
  const testes = obra.desafios.flatMap((desafio) => (desafio.verificar ? [desafio.verificar.trimEnd()] : []));
  return testes.length > 0 ? testes.join('\n') : undefined;
}

/** O que a pessoa digitou, com o recuo da planta (o recuo não é cobrado: a caixa já está no lugar). */
export function linhasDaVistoria(obra: Obra, textos: readonly string[]): Linha[] {
  return moldeDaVistoria(obra).map((linha, indice) => ({ recuo: linha.recuo, texto: (textos[indice] ?? '').trim() }));
}

export function primeiraLinhaDiferente(obra: Obra, textos: readonly string[]): number | null {
  const digitadas = linhasDaVistoria(obra, textos);
  const indice = moldeDaVistoria(obra).findIndex((linha, posicao) => !linhasEquivalentes(linha.texto, digitadas[posicao]?.texto ?? ''));
  return indice >= 0 ? indice : null;
}

export async function avaliarVistoria(parametros: { obra: Obra; textos: readonly string[]; executor: Executor | null }): Promise<VereditoDaVistoria> {
  const { obra, textos, executor } = parametros;
  const planta = moldeDaVistoria(obra);
  const digitadas = linhasDaVistoria(obra, textos);
  const vazias = digitadas.flatMap((linha, indice) => (linha.texto === '' ? [indice] : []));
  if (vazias.length > 0) return { tipo: 'incompleta', vazias };
  if (linhasIguais(digitadas, planta)) return { tipo: 'certo', via: 'planta' };

  const linha = primeiraLinhaDiferente(obra, textos);
  if (!executor?.pronto()) return { tipo: 'sem-python', linha };

  const diferenca = await compararComportamento({
    executor,
    codigoPlanta: textoDoPrograma(planta),
    codigoJogador: textoDoPrograma(digitadas),
    verificacao: verificacaoDaObra(obra),
    entradas: obra.entradas,
  });
  if (!diferenca) return { tipo: 'certo', via: 'comportamento' };
  if (diferenca.tipo === 'resultado-diferente') return { ...diferenca, linha };
  const apontada = diferenca.erro.linha;
  return {
    tipo: 'erro-python',
    erro: diferenca.erro,
    linha: apontada !== null && apontada >= 1 && apontada <= digitadas.length ? apontada - 1 : linha,
  };
}
