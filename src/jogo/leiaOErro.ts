// "Leia o erro" (ADR-0019): o programa de uma obra concluída com um detalhe estragado, o erro que o Python dá de
// verdade, e quatro correções de uma linha para escolher. Regras puras: o Python chega pelo executor; o som, o
// teclado e o progresso ficam na tela.
import type { ErroPython, Executor } from '../python/tipos';
import { embaralhar } from './embaralhar';
import { abreBloco, linhasDaObraCompleta, textoDoPrograma } from './programa';
import { progressoDaObra, type Progresso } from './progresso';
import { tokenizar, tokensSignificativos, type Token } from './tokenizador';
import type { Linha, Obra } from './tipos';

export { PERGUNTAS_POR_RODADA, placarNovo, pontosDoAcerto, responder, type PlacarDaRodada } from './qualSaida';

/** A certa e até três erradas; com menos de duas erradas o estrago não vira pergunta. */
export const ERRADAS_POR_PERGUNTA = 3;
export const ERRADAS_MINIMAS = 2;

export type TipoDeEstrago =
  | 'nome'
  | 'funcao'
  | 'parentese'
  | 'aspas'
  | 'dois-pontos'
  | 'recuo'
  | 'igual'
  | 'conversao'
  | 'metodo'
  | 'indice'
  | 'chave';

/** Uma linha do programa trocada: `nova` null apaga a linha. */
export interface Troca {
  indice: number;
  nova: Linha | null;
}

export interface Estrago {
  tipo: TipoDeEstrago;
  /** A linha estragada, no lugar da original. */
  linha: Linha;
  /** Consertos do jeito errado, como quem leu o erro depressa. */
  consertosErrados: Troca[];
}

export interface CandidataDoErro {
  obra: Obra;
  indice: number;
  estrago: Estrago;
}

/** O que aconteceria com a correção: o erro de novo, ou o programa rodando com outra saída. */
export type Efeito = { tipo: 'erro'; erro: ErroPython } | { tipo: 'saida'; saida: string };

export interface Correcao extends Troca {
  certa: boolean;
  /** Na errada: o que o Python faria com ela. */
  efeito: Efeito | null;
}

export interface PerguntaDoErro {
  obra: Obra;
  tipo: TipoDeEstrago;
  /** O programa com o estrago. */
  programa: Linha[];
  /** Onde está o estrago (a linha do erro pode ser outra: `int()` esquecido estoura linhas depois). */
  indiceDoEstrago: number;
  erro: ErroPython;
  /** O que foi digitado nos input(), na ordem. */
  entradas: string[];
  correcoes: Correcao[];
}

// ── estragos ────────────────────────────────────────────────────────────────

const juntar = (tokens: readonly Token[]) => tokens.map((token) => token.texto).join('');

function trocarToken(tokens: readonly Token[], indice: number, novo: string): string {
  return juntar(tokens.map((token, posicao) => (posicao === indice ? { ...token, texto: novo } : token)));
}

/** Próximo/anterior token que não é espaço. */
function vizinho(tokens: readonly Token[], de: number, passo: 1 | -1): { token: Token; indice: number } | undefined {
  for (let i = de + passo; i >= 0 && i < tokens.length; i += passo) {
    const token = tokens[i];
    if (token && token.categoria !== 'espaco') return { token, indice: i };
  }
  return undefined;
}

/** O `)` que fecha o `(` em `abre`. */
function fechamento(tokens: readonly Token[], abre: number): number | null {
  let profundidade = 0;
  for (let i = abre; i < tokens.length; i += 1) {
    const texto = tokens[i]?.texto;
    if (texto === '(') profundidade += 1;
    if (texto === ')') {
      profundidade -= 1;
      if (profundidade === 0) return i;
    }
  }
  return null;
}

const maiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
const trocarCaixa = (texto: string) => {
  const primeira = texto.charAt(0);
  const trocada = primeira === primeira.toUpperCase() ? primeira.toLowerCase() : primeira.toUpperCase();
  return trocada + texto.slice(1);
};

/** Métodos que a pessoa traz de outra linguagem ou inventa: lista não tem `.add`, texto não tem `.uppercase`. */
const METODOS_DE_OUTRO_LUGAR: Record<string, string> = {
  append: 'add',
  upper: 'uppercase',
  lower: 'lowercase',
  remove: 'delete',
  items: 'pairs',
  keys: 'getKeys',
  pop: 'removeLast',
  split: 'divide',
  join: 'concat',
  strip: 'trim',
};

const CONVERSOES: Record<string, string> = { int: 'str', float: 'str', str: 'int' };

/** Palavras depois das quais o nome é criado, não lido: estragá-lo não dá erro. */
const CRIAM_NOME = new Set(['def', 'class', 'for', 'import', 'as', 'global', 'nonlocal']);

/**
 * Os estragos possíveis da linha `indice`, cada um com consertos do jeito errado. Quem decide se o estrago vale é
 * o Python: o que não der erro cai em `gerarPerguntaDoErro`.
 */
export function estragosDaLinha(linhas: readonly Linha[], indice: number): Estrago[] {
  const original = linhas[indice];
  if (!original) return [];
  const significativos = tokensSignificativos(original.texto);
  if (significativos.length === 0 || significativos.every((token) => token.categoria === 'comentario')) return [];

  const tokens = tokenizar(original.texto);
  const estragos: Estrago[] = [];
  const vistos = new Set<string>();
  const comRecuo = (texto: string): Linha => ({ recuo: original.recuo, texto });
  const naLinha = (texto: string): Troca => ({ indice, nova: comRecuo(texto) });
  const adicionar = (tipo: TipoDeEstrago, texto: string, errados: Troca[]) => {
    if (texto === original.texto || vistos.has(texto)) return;
    vistos.add(texto);
    estragos.push({ tipo, linha: comRecuo(texto), consertosErrados: errados });
  };

  // Nome com a primeira letra trocada de caixa: NameError (o Python ainda sugere o nome certo).
  const nomesUsados = new Set<string>();
  tokens.forEach((token, posicao) => {
    if (token.categoria !== 'nome' || nomesUsados.has(token.texto) || token.texto.length < 2) return;
    const antes = vizinho(tokens, posicao, -1)?.token.texto;
    const depois = vizinho(tokens, posicao, 1)?.token.texto;
    if (antes === '.' || depois === '=' || (antes && CRIAM_NOME.has(antes))) return;
    nomesUsados.add(token.texto);
    const estragado = trocarToken(tokens, posicao, trocarCaixa(token.texto));
    adicionar('nome', estragado, [
      naLinha(trocarToken(tokens, posicao, `"${trocarCaixa(token.texto)}"`)),
      naLinha(trocarToken(tokens, posicao, `${token.texto}s`)),
    ]);
  });

  tokens.forEach((token, posicao) => {
    const depois = vizinho(tokens, posicao, 1);
    // Função embutida com maiúscula: `Print(...)`.
    if (token.categoria === 'funcao' && depois?.token.texto === '(') {
      adicionar('funcao', trocarToken(tokens, posicao, maiuscula(token.texto)), [naLinha(trocarToken(tokens, posicao, token.texto.toUpperCase()))]);
    }
    // `int()` ou `str()` esquecido em volta do valor: o erro de tipo aparece onde o valor é usado.
    if (token.categoria === 'funcao' && CONVERSOES[token.texto] && depois?.token.texto === '(') {
      const fecha = fechamento(tokens, depois.indice);
      if (fecha !== null) {
        const sem = juntar(tokens.filter((_, i) => i !== posicao && i !== depois.indice && i !== fecha));
        adicionar('conversao', sem, [naLinha(trocarToken(tokens, posicao, CONVERSOES[token.texto] ?? token.texto))]);
      }
    }
    // Método de outra linguagem: `livros.add(...)`.
    const antes = vizinho(tokens, posicao, -1)?.token.texto;
    const outro = METODOS_DE_OUTRO_LUGAR[token.texto];
    if (antes === '.' && outro && depois?.token.texto === '(') {
      adicionar('metodo', trocarToken(tokens, posicao, outro), [naLinha(trocarToken(tokens, posicao, maiuscula(token.texto)))]);
    }
    // Índice e chave entre colchetes, depois de um nome.
    if (token.texto === '[' && vizinho(tokens, posicao, -1)?.token.categoria === 'nome') {
      const dentro = vizinho(tokens, posicao, 1);
      const fecha = dentro ? vizinho(tokens, dentro.indice, 1) : undefined;
      if (dentro && fecha?.token.texto === ']') {
        const nomeDaLista = vizinho(tokens, posicao, -1)?.token.texto ?? '';
        if (dentro.token.categoria === 'numero' && /^\d+$/.test(dentro.token.texto)) {
          adicionar('indice', trocarToken(tokens, dentro.indice, String(Number(dentro.token.texto) + 10)), [
            naLinha(trocarToken(tokens, dentro.indice, `len(${nomeDaLista})`)),
          ]);
        }
        const chave = /^(["'])([a-zà-ú][^"'\\]*)\1$/.exec(dentro.token.texto);
        if (chave?.[1] && chave[2]) {
          adicionar('chave', trocarToken(tokens, dentro.indice, `${chave[1]}${maiuscula(chave[2])}${chave[1]}`), [
            naLinha(trocarToken(tokens, dentro.indice, chave[2])),
          ]);
        }
      }
    }
  });

  // Parêntese sem fechar: some o último `)`; o conserto errado fecha com `]`.
  const ultimoFecha = tokens.map((token) => token.texto).lastIndexOf(')');
  if (ultimoFecha >= 0) {
    adicionar('parentese', juntar(tokens.filter((_, i) => i !== ultimoFecha)), [naLinha(trocarToken(tokens, ultimoFecha, ']'))]);
  }

  // Aspas sem fechar: o primeiro texto perde a aspa do fim; o conserto errado fecha com a outra aspa.
  const texto = tokens.findIndex((token) => token.categoria === 'texto' && /^[fF]?(["'])[^"'\\]*\1$/.test(token.texto));
  const literal = tokens[texto]?.texto;
  if (literal) {
    const aspa = literal.at(-1) ?? '"';
    const outra = aspa === '"' ? "'" : '"';
    adicionar('aspas', trocarToken(tokens, texto, literal.slice(0, -1)), [naLinha(trocarToken(tokens, texto, literal.slice(0, -1) + outra))]);
  }

  // Dois-pontos esquecido no fim da linha que abre bloco; o conserto errado põe `;`.
  if (abreBloco(original)) {
    const doisPontos = tokens.map((token) => token.texto).lastIndexOf(':');
    adicionar('dois-pontos', juntar(tokens.filter((_, i) => i !== doisPontos)), [naLinha(trocarToken(tokens, doisPontos, ';'))]);
  }

  // `=` no lugar de `==` na condição; o conserto errado põe `===`, como em outras linguagens.
  if (/^(if|elif|while)$/.test(significativos[0]?.texto ?? '')) {
    const igual = tokens.findIndex((token) => token.texto === '==');
    if (igual >= 0) adicionar('igual', trocarToken(tokens, igual, '='), [naLinha(trocarToken(tokens, igual, '==='))]);
  }

  // Recuo esquecido na primeira linha do bloco; o conserto errado tira os dois-pontos da linha de cima.
  const anterior = linhas[indice - 1];
  if (anterior && abreBloco(anterior) && original.recuo === anterior.recuo + 1) {
    const tokensDeCima = tokenizar(anterior.texto);
    const doisPontos = tokensDeCima.map((token) => token.texto).lastIndexOf(':');
    const chave = `recuo:${original.texto}`;
    if (!vistos.has(chave)) {
      vistos.add(chave);
      estragos.push({
        tipo: 'recuo',
        linha: { recuo: anterior.recuo, texto: original.texto },
        consertosErrados: [{ indice: indice - 1, nova: { recuo: anterior.recuo, texto: juntar(tokensDeCima.filter((_, i) => i !== doisPontos)) } }],
      });
    }
  }

  return estragos;
}

/** Todos os estragos das obras concluídas (todas no modo livre). */
export function candidatasDoErro(obras: readonly Obra[], progresso: Progresso): CandidataDoErro[] {
  return obras
    .filter((obra) => progresso.modoLivre || progressoDaObra(progresso, obra.id).concluida)
    .flatMap((obra) => {
      const linhas = linhasDaObraCompleta(obra);
      return linhas.flatMap((_, indice) => estragosDaLinha(linhas, indice).map((estrago) => ({ obra, indice, estrago })));
    });
}

/** Embaralha e intercala por tipo de estrago, para a rodada não repetir o mesmo engano em sequência. */
export function filaVariada(candidatas: readonly CandidataDoErro[], sorteio: () => number): CandidataDoErro[] {
  const porTipo = new Map<TipoDeEstrago, CandidataDoErro[]>();
  for (const candidata of embaralhar(candidatas, sorteio)) {
    porTipo.set(candidata.estrago.tipo, [...(porTipo.get(candidata.estrago.tipo) ?? []), candidata]);
  }
  const grupos = embaralhar([...porTipo.values()], sorteio);
  const fila: CandidataDoErro[] = [];
  for (let rodada = 0; fila.length < candidatas.length; rodada += 1) {
    for (const grupo of grupos) {
      const candidata = grupo[rodada];
      if (candidata) fila.push(candidata);
    }
  }
  return fila;
}

// ── pergunta ────────────────────────────────────────────────────────────────

export function aplicar(programa: readonly Linha[], troca: Troca): Linha[] {
  return programa.flatMap((linha, indice) => (indice !== troca.indice ? [linha] : troca.nova ? [troca.nova] : []));
}

const mesmaTroca = (a: Troca, b: Troca) => a.indice === b.indice && a.nova?.texto === b.nova?.texto && a.nova?.recuo === b.nova?.recuo;

/** Erros que não são de ler: o programa foi parado, não errou. */
const ERROS_DE_PARADA = new Set(['LimiteDePassos', 'TempoEsgotado']);

/** Monta a pergunta do estrago, ou null se ele não dá um erro legível ou não rende erradas bastantes. */
export async function gerarPerguntaDoErro(candidata: CandidataDoErro, executor: Executor, sorteio: () => number): Promise<PerguntaDoErro | null> {
  const { obra, indice, estrago } = candidata;
  const original = linhasDaObraCompleta(obra);
  const linhaOriginal = original[indice];
  if (!linhaOriginal) return null;
  const programa = aplicar(original, { indice, nova: estrago.linha });

  for (const entradas of embaralhar(obra.entradas, sorteio)) {
    const certo = await executor.executar({ codigo: textoDoPrograma(original), entradas });
    const quebrado = await executor.executar({ codigo: textoDoPrograma(programa), entradas });
    const erro = quebrado.erro;
    if (certo.erro || !erro || erro.fase !== 'programa' || ERROS_DE_PARADA.has(erro.tipo)) continue;
    if (erro.linha === null || erro.linha < 1 || erro.linha > programa.length) continue;

    const certa: Troca = { indice, nova: linhaOriginal };
    const linhaDoErro = erro.linha - 1;
    // Consertos errados: o jeito errado na linha certa, a linha certa no número errado e apagar a linha.
    const vizinhas = embaralhar([indice - 1, indice + 1], sorteio).filter((j) => {
      const linha = original[j];
      return linha !== undefined && linha.texto.trim() !== '' && linha.texto !== linhaOriginal.texto;
    });
    const tentativas: Troca[] = [
      ...estrago.consertosErrados,
      ...vizinhas.map((j) => ({ indice: j, nova: linhaOriginal })),
      { indice: linhaDoErro !== indice ? linhaDoErro : indice, nova: null },
    ];

    const erradas: Correcao[] = [];
    for (const tentativa of tentativas) {
      if (erradas.length >= ERRADAS_POR_PERGUNTA) break;
      if (mesmaTroca(tentativa, certa) || erradas.some((errada) => mesmaTroca(errada, tentativa))) continue;
      const rodado = await executor.executar({ codigo: textoDoPrograma(aplicar(programa, tentativa)), entradas });
      // Errada de verdade: ainda dá erro, ou roda e muda o que o programa faz. Igual à obra seria outro conserto certo.
      if (rodado.erro) erradas.push({ ...tentativa, certa: false, efeito: { tipo: 'erro', erro: rodado.erro } });
      else if (rodado.saida !== certo.saida) erradas.push({ ...tentativa, certa: false, efeito: { tipo: 'saida', saida: rodado.saida } });
    }
    if (erradas.length < ERRADAS_MINIMAS) continue;

    return {
      obra,
      tipo: estrago.tipo,
      programa,
      indiceDoEstrago: indice,
      erro,
      entradas,
      correcoes: embaralhar([{ ...certa, certa: true, efeito: null }, ...erradas], sorteio),
    };
  }
  return null;
}
