// Montagem do programa da obra a partir das linhas já assentadas.
import { tokensSignificativos } from './tokenizador';
import type { Linha, Obra } from './tipos';

export const ESPACOS_POR_RECUO = 4;

export function textoDaLinha(linha: Linha): string {
  return ' '.repeat(ESPACOS_POR_RECUO * linha.recuo) + linha.texto;
}

export function textoDoPrograma(linhas: Linha[]): string {
  return linhas.map(textoDaLinha).join('\n');
}

/** Linhas prontas antes do desafio `passo`: alicerce + desafios já concluídos. */
export function linhasAntesDoPasso(obra: Obra, passo: number): Linha[] {
  return [...obra.inicial, ...obra.desafios.slice(0, passo).flatMap((desafio) => desafio.linhas)];
}

export function linhasDaObraCompleta(obra: Obra): Linha[] {
  return linhasAntesDoPasso(obra, obra.desafios.length);
}

/** A linha termina com dois-pontos (ignorando comentário), abrindo um bloco? */
export function abreBloco(linha: Linha): boolean {
  const tokens = tokensSignificativos(linha.texto).filter((token) => token.categoria !== 'comentario');
  return tokens.at(-1)?.texto === ':';
}

/**
 * Corpo provisório usado ao *comparar* programas: com `pass`, qualquer condição seria
 * "equivalente" (o bloco não faz nada). Com a sonda, dá para ver se e quantas vezes o bloco
 * roda — `if idade <= 12:` e `if idade < 12:` passam a se diferenciar com 12 anos.
 */
export const CORPO_DE_SONDAGEM = 'print("(o bloco rodou aqui)")';

/**
 * Um `if x:` recém-assentado ainda não tem corpo, e o Python recusaria o programa.
 * Para rodar a obra no meio da construção, o bloco aberto recebe um corpo provisório:
 * `pass` para mostrar no console, a sonda para validar.
 */
export function fecharBlocoAberto(linhas: Linha[], corpo = 'pass'): Linha[] {
  const ultima = linhas.at(-1);
  if (!ultima || !abreBloco(ultima)) return linhas;
  return [...linhas, { recuo: ultima.recuo + 1, texto: corpo }];
}
