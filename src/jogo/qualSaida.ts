// "Qual é a saída?" (ADR-0017): o programa de uma obra concluída até um comando (uma linha, ou um bloco if, for
// ou while inteiro), e a pessoa escolhe o que só esse comando põe na tela. As alternativas erradas são mutantes: o mesmo trecho com um detalhe trocado, rodado no
// Python de verdade. Regras puras: o Python chega pelo executor; o relógio, o som e o teclado ficam na tela.
import { MARCA_ENTRADA_INICIO, type Executor } from '../python/tipos';
import { embaralhar } from './embaralhar';
import { fecharBlocoAberto, linhasDaObraCompleta, textoDoPrograma } from './programa';
import { progressoDaObra, type Progresso } from './progresso';
import { tokenizar, tokensSignificativos, type Token } from './tokenizador';
import type { Linha, Obra } from './tipos';

export const PERGUNTAS_POR_RODADA = 10;
/** A certa e até três erradas; com menos de duas erradas a linha não vira pergunta. */
export const ERRADAS_POR_PERGUNTA = 3;
export const ERRADAS_MINIMAS = 2;
/** Teto de mutantes rodados por pergunta: cada um custa duas execuções no Python. */
const MUTANTES_POR_PERGUNTA = 24;

/** Um comando de nível 0 do programa da obra: a linha `inicio` e as de dentro do bloco dela, até `fim`. */
export interface Candidata {
  obra: Obra;
  inicio: number;
  fim: number;
}

export interface Alternativa {
  saida: string;
  certa: boolean;
  /** Na errada: a linha trocada que daria esta saída (índice no trecho e texto). */
  origem: { linha: number; texto: string } | null;
}

export interface Pergunta {
  obra: Obra;
  /** O programa da obra até o fim do comando em destaque. */
  trecho: Linha[];
  /** Onde o comando em destaque começa no trecho (ele vai até o fim). */
  destaque: number;
  /** O que foi digitado nos input() do trecho, na ordem. */
  entradas: string[];
  alternativas: Alternativa[];
}

const ehSoComentario = (texto: string) => {
  const tokens = tokensSignificativos(texto);
  return tokens.length > 0 && tokens.every((token) => token.categoria === 'comentario');
};

const pedeEntrada = (linha: Linha) => tokensSignificativos(linha.texto).some((token) => token.texto === 'input');

/**
 * Comandos que podem virar pergunta: cada comando de nível 0 (com o bloco dele, e o `elif`/`else` que o seguem),
 * sem comentário e sem input(). `def` e `class` entram e caem sozinhos: definir não mostra nada.
 */
export function candidatas(obras: readonly Obra[], progresso: Progresso): Candidata[] {
  return obras
    .filter((obra) => progresso.modoLivre || progressoDaObra(progresso, obra.id).concluida)
    .flatMap((obra) => {
      const linhas = linhasDaObraCompleta(obra);
      const lista: Candidata[] = [];
      for (let inicio = 0; inicio < linhas.length; inicio += 1) {
        const primeira = linhas[inicio];
        if (!primeira || primeira.recuo > 0 || ehSoComentario(primeira.texto)) continue;
        let fim = inicio;
        const continua = (linha: Linha | undefined) =>
          linha !== undefined && (linha.recuo > 0 || /^(elif|else)\b/.test(linha.texto.trim()));
        while (continua(linhas[fim + 1])) fim += 1;
        if (!linhas.slice(inicio, fim + 1).some(pedeEntrada)) lista.push({ obra, inicio, fim });
        inicio = fim;
      }
      return lista;
    });
}

// ── mutações ────────────────────────────────────────────────────────────────

/** Operador vizinho e, nas comparações, a condição lida ao contrário (que leva ao outro ramo do if). */
const OPERADORES_VIZINHOS: Record<string, string[]> = {
  '+': ['-'],
  '-': ['+'],
  '*': ['+'],
  '//': ['/'],
  '/': ['//'],
  '%': ['//'],
  '<': ['<=', '>='],
  '<=': ['<', '>'],
  '>': ['>=', '<='],
  '>=': ['>', '<'],
  '==': ['!='],
  '!=': ['=='],
};

const PALAVRAS_VIZINHAS: Record<string, string> = { True: 'False', False: 'True', and: 'or', or: 'and' };

const juntar = (tokens: readonly Token[]) => tokens.map((token) => token.texto).join('');

/** Índice do próximo/anterior token que não é espaço. */
function vizinho(tokens: readonly Token[], de: number, passo: 1 | -1): Token | undefined {
  for (let i = de + passo; i >= 0 && i < tokens.length; i += passo) {
    if (tokens[i]?.categoria !== 'espaco') return tokens[i];
  }
  return undefined;
}

/**
 * Versões da linha com um detalhe trocado, como quem lê depressa: número ±1, operador vizinho, condição ao
 * contrário, `True`/`False`, `and`/`or`, f-string sem `f`; no print, nome que vira texto, texto que aparece com
 * as aspas e vírgulas viradas em `+`.
 */
export function mutacoesDaLinha(texto: string): string[] {
  return mutacoesComEngano(texto).map((mutacao) => mutacao.texto);
}

/** Enganos que se repetem fácil numa linha só: no máximo uma alternativa errada de cada um por pergunta. */
type Engano = 'aspas' | 'nome-vira-texto' | 'outro';

function mutacoesComEngano(texto: string): Array<{ texto: string; engano: Engano }> {
  const tokens = tokenizar(texto);
  const resultados = new Map<string, Engano>();
  const trocar = (indice: number, novo: string, engano: Engano = 'outro') => {
    const mudada = juntar(tokens.map((token, posicao) => (posicao === indice ? { ...token, texto: novo } : token)));
    if (!resultados.has(mudada)) resultados.set(mudada, engano);
  };
  const noPrint = tokensSignificativos(texto)[0]?.texto === 'print';

  tokens.forEach((token, indice) => {
    if (token.categoria === 'numero' && /^\d+$/.test(token.texto)) {
      const numero = Number(token.texto);
      trocar(indice, String(numero + 1));
      if (numero > 0) trocar(indice, String(numero - 1));
    }
    if (token.categoria === 'operador') for (const outro of OPERADORES_VIZINHOS[token.texto] ?? []) trocar(indice, outro);
    if (token.categoria === 'palavra-chave' && PALAVRAS_VIZINHAS[token.texto]) trocar(indice, PALAVRAS_VIZINHAS[token.texto] ?? token.texto);
    if (token.categoria === 'texto' && /^[fF]["']/.test(token.texto)) trocar(indice, token.texto.slice(1));
    // As aspas aparecem na tela? Engano de quem está começando.
    if (noPrint && token.categoria === 'texto' && /^"[^"'\\]*"$/.test(token.texto)) trocar(indice, `'${token.texto}'`, 'aspas');
    if (noPrint && token.categoria === 'nome') {
      const antes = vizinho(tokens, indice, -1)?.texto;
      const depois = vizinho(tokens, indice, 1)?.texto;
      const ehValor = antes !== '.' && depois !== '(' && depois !== '.' && depois !== '[';
      if (ehValor) trocar(indice, `"${token.texto}"`, 'nome-vira-texto');
    }
  });

  // Vírgulas do print, no primeiro nível dos parênteses, viram `+`: o engano de achar que a vírgula cola os textos.
  if (noPrint) {
    let profundidade = 0;
    const virgulas: number[] = [];
    tokens.forEach((token, indice) => {
      if ('([{'.includes(token.texto)) profundidade += 1;
      else if (')]}'.includes(token.texto)) profundidade -= 1;
      else if (token.texto === ',' && profundidade === 1) virgulas.push(indice);
    });
    if (virgulas.length > 0) {
      const colada = juntar(tokens.map((token, posicao) => (virgulas.includes(posicao) ? { ...token, texto: ' +' } : token)));
      if (!resultados.has(colada)) resultados.set(colada, 'outro');
    }
  }

  resultados.delete(texto);
  return [...resultados].map(([mudada, engano]) => ({ texto: mudada, engano }));
}

// ── pergunta ────────────────────────────────────────────────────────────────

/**
 * O que só o comando em destaque (de `destaque` ao fim do trecho) põe na tela: a saída do trecho menos a do
 * trecho sem ele. Null se algum dos dois dá erro ou se a saída do comando ecoa um input(). Pode ser vazia: num
 * mutante, "nada na tela" é uma alternativa errada boa (a condição que não deixa o print rodar).
 */
async function saidaDoComando(executor: Executor, trecho: Linha[], destaque: number, entradas: string[]): Promise<string | null> {
  const antes = await executor.executar({ codigo: textoDoPrograma(fecharBlocoAberto(trecho.slice(0, destaque))), entradas });
  const depois = await executor.executar({ codigo: textoDoPrograma(trecho), entradas });
  if (antes.erro || depois.erro || !depois.saida.startsWith(antes.saida)) return null;
  const saida = depois.saida.slice(antes.saida.length);
  return saida.includes(MARCA_ENTRADA_INICIO) ? null : saida;
}

/** Mutantes do trecho: primeiro os do comando em destaque, depois os das linhas de cima, da mais perto à mais longe. */
function mutantesDoTrecho(trecho: Linha[], sorteio: () => number): Array<{ linha: number; texto: string; engano: Engano }> {
  const mutantes: Array<{ linha: number; texto: string; engano: Engano }> = [];
  for (let linha = trecho.length - 1; linha >= 0; linha -= 1) {
    const original = trecho[linha];
    if (!original || ehSoComentario(original.texto)) continue;
    mutantes.push(...embaralhar(mutacoesComEngano(original.texto), sorteio).map((mutacao) => ({ linha, ...mutacao })));
  }
  return mutantes.slice(0, MUTANTES_POR_PERGUNTA);
}

/** Monta a pergunta do comando, ou null se ele não rende resposta e alternativas erradas bastantes. */
export async function gerarPergunta(candidata: Candidata, executor: Executor, sorteio: () => number): Promise<Pergunta | null> {
  const { obra, inicio, fim } = candidata;
  const trecho = linhasDaObraCompleta(obra).slice(0, fim + 1);
  if (trecho.length !== fim + 1) return null;

  for (const entradas of embaralhar(obra.entradas, sorteio)) {
    const resposta = await saidaDoComando(executor, trecho, inicio, entradas);
    if (resposta === null || resposta.trim() === '') continue;

    const erradas: Alternativa[] = [];
    const enganosUsados = new Set<Engano>();
    for (const mutante of mutantesDoTrecho(trecho, sorteio)) {
      if (erradas.length >= ERRADAS_POR_PERGUNTA) break;
      if (mutante.engano !== 'outro' && enganosUsados.has(mutante.engano)) continue;
      const mudado = trecho.map((original, indice) => (indice === mutante.linha ? { ...original, texto: mutante.texto } : original));
      const saida = await saidaDoComando(executor, mudado, inicio, entradas);
      if (saida === null || saida === resposta || erradas.some((errada) => errada.saida === saida)) continue;
      enganosUsados.add(mutante.engano);
      erradas.push({ saida, certa: false, origem: { linha: mutante.linha, texto: mutante.texto } });
    }
    if (erradas.length < ERRADAS_MINIMAS) continue;

    // Só as entradas que o trecho chega a pedir.
    const pedidas = trecho.filter((item) => tokensSignificativos(item.texto).some((token) => token.texto === 'input')).length;
    return {
      obra,
      trecho,
      destaque: inicio,
      entradas: entradas.slice(0, pedidas),
      alternativas: embaralhar([{ saida: resposta, certa: true, origem: null }, ...erradas], sorteio),
    };
  }
  return null;
}

// ── rodada ──────────────────────────────────────────────────────────────────

/** Pontos de um acerto: 100, mais 20 por acerto seguido antes deste (até +100). */
export function pontosDoAcerto(sequencia: number): number {
  return 100 + 20 * Math.min(Math.max(sequencia - 1, 0), 5);
}

export interface PlacarDaRodada {
  respondidas: number;
  acertos: number;
  sequencia: number;
  maiorSequencia: number;
  pontos: number;
}

export const placarNovo = (): PlacarDaRodada => ({ respondidas: 0, acertos: 0, sequencia: 0, maiorSequencia: 0, pontos: 0 });

export function responder(placar: PlacarDaRodada, certa: boolean): PlacarDaRodada {
  if (!certa) return { ...placar, respondidas: placar.respondidas + 1, sequencia: 0 };
  const sequencia = placar.sequencia + 1;
  return {
    respondidas: placar.respondidas + 1,
    acertos: placar.acertos + 1,
    sequencia,
    maiorSequencia: Math.max(placar.maiorSequencia, sequencia),
    pontos: placar.pontos + pontosDoAcerto(sequencia),
  };
}

