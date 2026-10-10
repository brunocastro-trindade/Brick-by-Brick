// Estado da linha em construção, em funções puras: encaixar e devolver tijolos (montar),
// empilhar linhas e mudar o recuo (empilhar), digitar (digitar).
import type { Desafio, Linha, Tijolo } from './tipos';
import type { Tentativa } from './validacao';

export const RECUO_MAXIMO = 4;

export interface PecaNaPilha {
  tijoloId: string;
  recuo: number;
}

export interface Montagem {
  vagas: Array<string | null>;
  vagaAtiva: number;
  pilha: Array<PecaNaPilha | null>;
  linhaAtiva: number;
  texto: string;
}

export function montagemVazia(desafio: Desafio): Montagem {
  return {
    vagas: desafio.tipo === 'montar' ? desafio.resposta.map(() => null) : [],
    vagaAtiva: 0,
    pilha: desafio.tipo === 'empilhar' ? desafio.linhas.map(() => null) : [],
    linhaAtiva: 0,
    texto: '',
  };
}

function primeiraLivre<T>(itens: Array<T | null>, aPartirDe = 0): number {
  const depois = itens.findIndex((item, indice) => indice >= aPartirDe && item === null);
  return depois >= 0 ? depois : itens.findIndex((item) => item === null);
}

/** Tijolos que ainda estão na palete, na ordem embaralhada. */
export function tijolosNaPalete(montagem: Montagem, ordem: Tijolo[]): Tijolo[] {
  const usados = new Set([...montagem.vagas, ...montagem.pilha.map((peca) => peca?.tijoloId ?? null)]);
  return ordem.filter((tijolo) => !usados.has(tijolo.id));
}

// ── montar ──────────────────────────────────────────────────────────────────

/** Encaixa na vaga pedida (ou na ativa, ou na primeira livre). Quem estava lá volta para a palete. */
export function encaixar(montagem: Montagem, tijoloId: string, vagaPedida?: number): Montagem {
  const vagas = montagem.vagas.map((ocupante) => (ocupante === tijoloId ? null : ocupante));
  const alvo =
    vagaPedida ?? (vagas[montagem.vagaAtiva] === null ? montagem.vagaAtiva : primeiraLivre(vagas, montagem.vagaAtiva));
  if (alvo < 0 || alvo >= vagas.length) return montagem;
  vagas[alvo] = tijoloId;
  const proxima = primeiraLivre(vagas, alvo + 1);
  return { ...montagem, vagas, vagaAtiva: proxima >= 0 ? proxima : alvo };
}

export function devolverDaVaga(montagem: Montagem, vaga: number): Montagem {
  if (montagem.vagas[vaga] === null || montagem.vagas[vaga] === undefined) return montagem;
  const vagas = [...montagem.vagas];
  vagas[vaga] = null;
  return { ...montagem, vagas, vagaAtiva: vaga };
}

/** Devolve o último tijolo encaixado (tecla ⌫). */
export function devolverUltimo(montagem: Montagem): Montagem {
  if (montagem.vagas.length > 0) {
    const ultima = montagem.vagas.findLastIndex((ocupante) => ocupante !== null);
    return ultima >= 0 ? devolverDaVaga(montagem, ultima) : montagem;
  }
  const ativa = montagem.pilha[montagem.linhaAtiva] ? montagem.linhaAtiva : montagem.pilha.findLastIndex((peca) => peca !== null);
  return ativa >= 0 ? devolverDaPilha(montagem, ativa) : montagem;
}

export function selecionarVaga(montagem: Montagem, vaga: number): Montagem {
  if (vaga < 0 || vaga >= montagem.vagas.length) return montagem;
  return { ...montagem, vagaAtiva: vaga };
}

// ── empilhar ────────────────────────────────────────────────────────────────

/**
 * Coloca uma linha na pilha. Sem recuo pedido, ela herda o recuo da linha de cima,
 * como num editor — subir um nível depois de `if x:` é decisão de quem joga.
 */
export function empilhar(montagem: Montagem, tijoloId: string, recuoAnterior: number, linhaPedida?: number, recuoPedido?: number): Montagem {
  const pilha = montagem.pilha.map((peca) => (peca?.tijoloId === tijoloId ? null : peca));
  const alvo =
    linhaPedida ?? (pilha[montagem.linhaAtiva] === null ? montagem.linhaAtiva : primeiraLivre(pilha, montagem.linhaAtiva));
  if (alvo < 0 || alvo >= pilha.length) return montagem;
  const acima = pilha.slice(0, alvo).findLast((peca) => peca !== null);
  const recuo = Math.max(0, Math.min(RECUO_MAXIMO, recuoPedido ?? acima?.recuo ?? recuoAnterior));
  pilha[alvo] = { tijoloId, recuo };
  return { ...montagem, pilha, linhaAtiva: alvo };
}

export function devolverDaPilha(montagem: Montagem, linha: number): Montagem {
  if (!montagem.pilha[linha]) return montagem;
  const pilha = [...montagem.pilha];
  pilha[linha] = null;
  return { ...montagem, pilha, linhaAtiva: linha };
}

export function mudarRecuo(montagem: Montagem, linha: number, delta: number): Montagem {
  const peca = montagem.pilha[linha];
  if (!peca) return montagem;
  const recuo = Math.max(0, Math.min(RECUO_MAXIMO, peca.recuo + delta));
  if (recuo === peca.recuo) return montagem;
  const pilha = [...montagem.pilha];
  pilha[linha] = { ...peca, recuo };
  return { ...montagem, pilha };
}

export function selecionarLinha(montagem: Montagem, linha: number): Montagem {
  if (linha < 0 || linha >= montagem.pilha.length) return montagem;
  return { ...montagem, linhaAtiva: linha };
}

// ── tentativa ───────────────────────────────────────────────────────────────

/** A tentativa pronta para validar, ou null se ainda falta tijolo (ou texto). */
export function tentativaDaMontagem(desafio: Desafio, montagem: Montagem, tijolosPorId: Map<string, Tijolo>): Tentativa | null {
  if (desafio.tipo === 'montar') {
    const tijolos = montagem.vagas.map((id) => (id ? tijolosPorId.get(id) : undefined));
    if (tijolos.some((tijolo) => !tijolo)) return null;
    const vagas = (tijolos as Tijolo[]).map((tijolo) => tijolo.texto);
    const texto = desafio.partes.map((parte) => (parte.tipo === 'fixo' ? parte.texto : vagas[parte.indice])).join('');
    return { linhas: [{ recuo: desafio.recuo, texto: texto.trimEnd() }], tijolos: tijolos as Tijolo[], vagas };
  }
  if (desafio.tipo === 'empilhar') {
    const pecas = montagem.pilha.map((peca) => (peca ? { peca, tijolo: tijolosPorId.get(peca.tijoloId) } : null));
    if (pecas.some((item) => !item?.tijolo)) return null;
    const completas = pecas as Array<{ peca: PecaNaPilha; tijolo: Tijolo }>;
    const linhas: Linha[] = completas.map(({ peca, tijolo }) => ({ recuo: peca.recuo, texto: tijolo.texto }));
    return { linhas, tijolos: completas.map(({ tijolo }) => tijolo) };
  }
  const texto = montagem.texto.trim();
  if (texto === '') return null;
  return { linhas: [{ recuo: desafio.recuo, texto }], tijolos: [] };
}
