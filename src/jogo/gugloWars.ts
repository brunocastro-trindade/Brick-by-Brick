// Guglo Wars (ADR-0007): linhas das obras concluídas caem num poço, como peças de Tetris, e a pessoa digita
// o código antes de a peça chegar ao fundo. Nos primeiros níveis copia a linha; depois, completa a lacuna.
// Regras puras: o tempo de verdade fica na tela, que só manda "tique".
import { criarSorteio, embaralhar } from './embaralhar';
import { linhasDaObraCompleta } from './programa';
import { progressoDaObra, type Progresso } from './progresso';
import { linhasEquivalentes, tokenizar } from './tokenizador';
import type { Obra } from './tipos';

/** Altura do poço, em fileiras. A peça nasce na fileira 0 e pousa logo acima do entulho. */
export const FILEIRAS = 10;
export const ACERTOS_POR_NIVEL = 6;
/** A cada tantos acertos seguidos, uma fileira de entulho some. */
export const COMBO_PARA_LIMPAR = 5;
/** A partir deste nível, a peça esconde um pedaço de sintaxe em vez de pedir a linha inteira. */
export const NIVEL_DA_LACUNA = 3;

export interface LinhaDoGugloWars {
  texto: string;
  /** Nome da obra de onde a linha veio, para a peça dizer "do Correio". */
  obra: string;
}

/** Linhas dos programas das obras concluídas (todas, no modo livre), sem comentário e sem repetir. */
export function linhasDoGugloWars(obras: readonly Obra[], progresso: Progresso): LinhaDoGugloWars[] {
  const vistas = new Set<string>();
  const linhas: LinhaDoGugloWars[] = [];
  for (const obra of obras) {
    if (!progresso.modoLivre && !progressoDaObra(progresso, obra.id).concluida) continue;
    for (const { texto } of linhasDaObraCompleta(obra)) {
      const limpo = texto.trim();
      if (limpo === '' || limpo.startsWith('#') || vistas.has(limpo)) continue;
      vistas.add(limpo);
      linhas.push({ texto: limpo, obra: obra.nome });
    }
  }
  return linhas;
}

export type ModoDaPeca = 'copiar' | 'lacuna';

export interface Peca {
  id: number;
  linha: LinhaDoGugloWars;
  modo: ModoDaPeca;
  /** A linha é `antes + resposta + depois`. Copiando, a resposta é a linha inteira. */
  antes: string;
  resposta: string;
  depois: string;
  fileira: number;
}

interface Trecho {
  inicio: number;
  texto: string;
}

/**
 * Pedaços de sintaxe que dá para lembrar sem contexto: palavra-chave, função embutida, operador, método
 * depois do ponto e o `:` que abre bloco. Texto, número e nome de variável ficam de fora (ADR-0007).
 */
export function trechosParaLacuna(texto: string): Trecho[] {
  const trechos: Trecho[] = [];
  const significativos: Array<Trecho & { categoria: string }> = [];
  let posicao = 0;
  for (const token of tokenizar(texto)) {
    if (token.categoria !== 'espaco') significativos.push({ inicio: posicao, texto: token.texto, categoria: token.categoria });
    posicao += token.texto.length;
  }
  const semComentario = significativos.filter((token) => token.categoria !== 'comentario');
  semComentario.forEach((token, indice) => {
    const anterior = semComentario[indice - 1];
    const ehUltimo = indice === semComentario.length - 1;
    if (
      token.categoria === 'palavra-chave' ||
      token.categoria === 'funcao' ||
      token.categoria === 'operador' ||
      (token.categoria === 'nome' && anterior?.texto === '.') ||
      (token.texto === ':' && ehUltimo)
    ) {
      trechos.push({ inicio: token.inicio, texto: token.texto });
    }
  });
  return trechos;
}

export function criarPeca(id: number, linha: LinhaDoGugloWars, nivel: number): Peca {
  const copiar: Peca = { id, linha, modo: 'copiar', antes: '', resposta: linha.texto, depois: '', fileira: 0 };
  if (nivel < NIVEL_DA_LACUNA) return copiar;
  const trechos = trechosParaLacuna(linha.texto);
  const escolhido = trechos[(id * 7 + linha.texto.length) % Math.max(1, trechos.length)];
  if (!escolhido) return copiar;
  return {
    ...copiar,
    modo: 'lacuna',
    antes: linha.texto.slice(0, escolhido.inicio),
    resposta: escolhido.texto,
    depois: linha.texto.slice(escolhido.inicio + escolhido.texto.length),
  };
}

export type Conferencia = 'vazio' | 'no-caminho' | 'desvio' | 'completo';

/** Aspas simples e duplas valem o mesmo enquanto a pessoa digita. */
const semEstiloDeAspas = (texto: string) => texto.replaceAll("'", '"');

/** Quantos caracteres da resposta o que foi digitado já cobre, na ordem. */
export function caracteresCertos(digitado: string, peca: Peca): number {
  const resposta = semEstiloDeAspas(peca.resposta);
  const escrito = semEstiloDeAspas(digitado);
  let certos = 0;
  while (certos < escrito.length && certos < resposta.length && escrito[certos] === resposta[certos]) certos += 1;
  return certos;
}

export function conferir(digitado: string, peca: Peca): Conferencia {
  if (digitado.trim() === '') return 'vazio';
  if (linhasEquivalentes(digitado, peca.resposta)) return 'completo';
  return caracteresCertos(digitado, peca) === digitado.length ? 'no-caminho' : 'desvio';
}

export function nivelPorAcertos(acertos: number): number {
  return 1 + Math.floor(acertos / ACERTOS_POR_NIVEL);
}

/** Nenhuma peça atravessa o poço vazio em menos que isto, nem no nível mais alto. */
export const DURACAO_MINIMA_MS = 6000;

/**
 * Tempo para a peça atravessar o poço vazio: ler, pensar (na lacuna) e digitar, com folga para quem está
 * aprendendo (0,9 s por caractere). Cada nível tira 6%. Uma linha de 20 caracteres leva uns 21 s no nível 1.
 */
export function duracaoDaPecaMs(peca: Peca, nivel: number): number {
  const digitar = peca.resposta.length * 900;
  const base = peca.modo === 'copiar' ? 3000 + digitar : 5000 + peca.linha.texto.length * 160 + digitar;
  return Math.max(DURACAO_MINIMA_MS, Math.round(base * 0.94 ** (nivel - 1)));
}

export function intervaloDaFileiraMs(peca: Peca, nivel: number): number {
  return Math.round(duracaoDaPecaMs(peca, nivel) / FILEIRAS);
}

/** Fileira onde a peça pousa: logo acima do entulho. */
export function fileiraDePouso(entulho: number): number {
  return FILEIRAS - 1 - entulho;
}

/** Lacuna vale mais que cópia; acertar cedo (com fileiras de sobra) e em sequência dá bônus. */
export function pontosDoAcerto(peca: Peca, nivel: number, fileirasDeSobra: number, combo: number): number {
  const base = peca.modo === 'copiar' ? 10 + peca.resposta.length : 40;
  return (base + fileirasDeSobra * 5) * nivel + combo * 10;
}

export type EventoDoGugloWars =
  | { tipo: 'acertou'; seq: number; pontos: number; fileira: number; limpouEntulho: boolean; subiuDeNivel: boolean }
  | { tipo: 'caiu'; seq: number }
  | { tipo: 'errou'; seq: number }
  | { tipo: 'fim'; seq: number };

export interface EstadoDoGugloWars {
  fase: 'jogando' | 'pausado' | 'fim';
  linhas: readonly LinhaDoGugloWars[];
  semente: number;
  rodada: number;
  fila: LinhaDoGugloWars[];
  proximoId: number;
  peca: Peca;
  /** Linha da próxima peça; o modo dela se decide quando ela entra, pelo nível da hora. */
  proxima: LinhaDoGugloWars;
  /** Entulho de baixo para cima: o índice 0 é a fileira do fundo. */
  entulho: LinhaDoGugloWars[];
  digitado: string;
  pontos: number;
  acertos: number;
  combo: number;
  maiorCombo: number;
  nivel: number;
  evento: EventoDoGugloWars | null;
}

export type AcaoDoGugloWars =
  | { tipo: 'tique' }
  | { tipo: 'digitar'; texto: string }
  | { tipo: 'enviar' }
  | { tipo: 'pausar' }
  | { tipo: 'continuar' };

/** Tira a próxima linha da fila; fila vazia é embaralhada de novo, numa rodada nova. */
function tirarDaFila(estado: Pick<EstadoDoGugloWars, 'fila' | 'linhas' | 'semente' | 'rodada'>) {
  let { fila, rodada } = estado;
  if (fila.length === 0) {
    rodada += 1;
    fila = embaralhar(estado.linhas, criarSorteio(estado.semente + rodada));
  }
  const [linha, ...resto] = fila;
  return { linha: linha as LinhaDoGugloWars, fila: resto, rodada };
}

export function novaPartida(linhas: readonly LinhaDoGugloWars[], semente: number): EstadoDoGugloWars {
  if (linhas.length === 0) throw new Error('O Guglo Wars precisa de ao menos uma linha de obra concluída.');
  const base = { linhas, semente, rodada: 0, fila: embaralhar(linhas, criarSorteio(semente)) };
  const primeira = tirarDaFila(base);
  const segunda = tirarDaFila({ ...base, fila: primeira.fila, rodada: primeira.rodada });
  return {
    ...base,
    fase: 'jogando',
    fila: segunda.fila,
    rodada: segunda.rodada,
    proximoId: 2,
    peca: criarPeca(1, primeira.linha, 1),
    proxima: segunda.linha,
    entulho: [],
    digitado: '',
    pontos: 0,
    acertos: 0,
    combo: 0,
    maiorCombo: 0,
    nivel: 1,
    evento: null,
  };
}

/** A próxima entra no poço e outra linha sai da fila para o lugar dela. */
function entrarProxima(estado: EstadoDoGugloWars): EstadoDoGugloWars {
  const seguinte = tirarDaFila(estado);
  return {
    ...estado,
    peca: criarPeca(estado.proximoId, estado.proxima, estado.nivel),
    proxima: seguinte.linha,
    fila: seguinte.fila,
    rodada: seguinte.rodada,
    proximoId: estado.proximoId + 1,
    digitado: '',
  };
}

const proximaSeq = (estado: EstadoDoGugloWars) => (estado.evento?.seq ?? 0) + 1;

/** A peça desce uma fileira; se já estava pousada, vira entulho. */
function descer(estado: EstadoDoGugloWars): EstadoDoGugloWars {
  if (estado.peca.fileira < fileiraDePouso(estado.entulho.length)) {
    return { ...estado, peca: { ...estado.peca, fileira: estado.peca.fileira + 1 } };
  }
  const entulho = [...estado.entulho, estado.peca.linha];
  if (fileiraDePouso(entulho.length) <= 0) {
    return { ...estado, entulho, combo: 0, digitado: '', fase: 'fim', evento: { tipo: 'fim', seq: proximaSeq(estado) } };
  }
  return entrarProxima({ ...estado, entulho, combo: 0, evento: { tipo: 'caiu', seq: proximaSeq(estado) } });
}

function acertar(estado: EstadoDoGugloWars): EstadoDoGugloWars {
  const { peca } = estado;
  const combo = estado.combo + 1;
  const acertos = estado.acertos + 1;
  const fileirasDeSobra = fileiraDePouso(estado.entulho.length) - peca.fileira;
  const pontos = pontosDoAcerto(peca, estado.nivel, fileirasDeSobra, combo - 1);
  const limpouEntulho = combo % COMBO_PARA_LIMPAR === 0 && estado.entulho.length > 0;
  const nivel = nivelPorAcertos(acertos);
  return entrarProxima({
    ...estado,
    entulho: limpouEntulho ? estado.entulho.slice(1) : estado.entulho,
    pontos: estado.pontos + pontos,
    acertos,
    combo,
    maiorCombo: Math.max(estado.maiorCombo, combo),
    nivel,
    evento: { tipo: 'acertou', seq: proximaSeq(estado), pontos, fileira: peca.fileira, limpouEntulho, subiuDeNivel: nivel > estado.nivel },
  });
}

export function passoDoGugloWars(estado: EstadoDoGugloWars, acao: AcaoDoGugloWars): EstadoDoGugloWars {
  if (estado.fase === 'fim') return estado;
  if (acao.tipo === 'pausar') return estado.fase === 'jogando' ? { ...estado, fase: 'pausado' } : estado;
  if (acao.tipo === 'continuar') return estado.fase === 'pausado' ? { ...estado, fase: 'jogando' } : estado;
  if (estado.fase !== 'jogando') return estado;
  switch (acao.tipo) {
    case 'tique':
      return descer(estado);
    case 'digitar': {
      const comTexto = { ...estado, digitado: acao.texto };
      return conferir(acao.texto, estado.peca) === 'completo' ? acertar(comTexto) : comTexto;
    }
    case 'enviar': {
      if (conferir(estado.digitado, estado.peca) === 'completo') return acertar(estado);
      // Enviar errado custa o combo e uma fileira: a peça desce na hora.
      const errou = { ...estado, combo: 0, evento: { tipo: 'errou', seq: proximaSeq(estado) } as const };
      return descer(errou);
    }
  }
}
