// Vistoria (ADR-0016): o programa da obra pronta é reescrito de memória, fiada por fiada. A planta dá o
// recuo e quantas linhas são; a pessoa digita o texto. Vale a validação do ADR-0004, no programa inteiro.
import { MARCA_COMENTARIO_FIM, MARCA_COMENTARIO_INICIO, MARCA_COMENTARIO_SEPARADOR, type ErroPython, type Executor } from '../python/tipos';
import { linhasDaObraCompleta, textoDaLinha, textoDoPrograma } from './programa';
import { linhasEquivalentes, tokensSignificativos } from './tokenizador';
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

/** Fiadas que são só comentário: não mostram nada na saída, então a saída esperada precisa mostrá-las. */
export function fiadasDeComentario(obra: Obra): number[] {
  return moldeDaVistoria(obra).flatMap((linha, indice) => {
    const tokens = tokensSignificativos(linha.texto);
    return tokens.length > 0 && tokens.every((token) => token.categoria === 'comentario') ? [indice] : [];
  });
}

const FUNCAO_DE_COMENTARIO = '__comentario_da_planta__';

/**
 * Programa que gera a saída esperada: a planta, com cada fiada de comentário trocada por uma chamada que imprime
 * uma marca com o número da fiada, uma vez só (dentro de laço, o comentário aparece na primeira passada).
 * O texto do comentário não entra no Python: quem o põe na saída é `saidaComComentarios`.
 */
export function programaDaSaidaEsperada(obra: Obra): string {
  const comentarios = new Set(fiadasDeComentario(obra));
  if (comentarios.size === 0) return textoDoPrograma(moldeDaVistoria(obra));
  const marca = (codigo: string) => `"\\x${codigo.charCodeAt(0).toString(16).padStart(2, '0')}"`;
  return [
    `def ${FUNCAO_DE_COMENTARIO}(fiada, vistas=set()):`,
    `    if fiada not in vistas: vistas.add(fiada); print(${marca(MARCA_COMENTARIO_INICIO)} + str(fiada) + ${marca(MARCA_COMENTARIO_FIM)})`,
    ...moldeDaVistoria(obra).map((linha, indice) =>
      comentarios.has(indice) ? textoDaLinha({ recuo: linha.recuo, texto: `${FUNCAO_DE_COMENTARIO}(${indice})` }) : textoDaLinha(linha),
    ),
  ].join('\n');
}

/**
 * Troca cada marca pelo comentário da planta (com o número da fiada, contado de 1). Comentário que o programa
 * não chegou a executar (num ramo que não rodou com estas entradas) vai para o fim: nenhum fica escondido.
 */
export function saidaComComentarios(obra: Obra, saida: string): string {
  const planta = moldeDaVistoria(obra);
  const comentario = (indice: number) =>
    `${MARCA_COMENTARIO_INICIO}${indice + 1}${MARCA_COMENTARIO_SEPARADOR}${planta[indice]?.texto ?? ''}${MARCA_COMENTARIO_FIM}`;
  const vistos = new Set<number>();
  const padrao = new RegExp(`${MARCA_COMENTARIO_INICIO}(\\d+)${MARCA_COMENTARIO_FIM}`, 'g');
  const trocada = saida.replace(padrao, (_, numero: string) => {
    vistos.add(Number(numero));
    return comentario(Number(numero));
  });
  const faltando = fiadasDeComentario(obra).filter((indice) => !vistos.has(indice));
  return faltando.length === 0 ? trocada : `${trocada}${faltando.map((indice) => `${comentario(indice)}\n`).join('')}`;
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
