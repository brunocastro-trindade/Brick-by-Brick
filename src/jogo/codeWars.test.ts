import { describe, expect, it } from 'vitest';
import {
  ACERTOS_POR_NIVEL,
  COMBO_PARA_LIMPAR,
  conferir,
  criarPeca,
  duracaoDaPecaMs,
  FILEIRAS,
  fileiraDePouso,
  linhasDoCodeWars,
  NIVEL_DA_LACUNA,
  novaPartida,
  passoDoCodeWars,
  trechosParaLacuna,
  type EstadoDoCodeWars,
  type LinhaDoCodeWars,
} from './codeWars';
import { OBRAS } from './obras';
import { progressoDeObraNovo, progressoNovo, type Progresso } from './progresso';
import { tokensSignificativos } from './tokenizador';

const comConcluidas = (...ids: string[]): Progresso => ({
  ...progressoNovo(),
  obras: Object.fromEntries(ids.map((id) => [id, { ...progressoDeObraNovo(), concluida: true }])),
});

const LINHAS: LinhaDoCodeWars[] = [
  { texto: 'print("Olá")', obra: 'Correio' },
  { texto: 'for i in range(3):', obra: 'Fábrica' },
  { texto: 'total = preco * 2', obra: 'Mercado' },
];

/** Joga a ação várias vezes. */
function repetir(estado: EstadoDoCodeWars, vezes: number, acao: Parameters<typeof passoDoCodeWars>[1]) {
  let atual = estado;
  for (let i = 0; i < vezes; i += 1) atual = passoDoCodeWars(atual, acao);
  return atual;
}

/** Até a peça atual virar entulho. */
const deixarCair = (estado: EstadoDoCodeWars) => repetir(estado, fileiraDePouso(estado.entulho.length) - estado.peca.fileira + 1, { tipo: 'tique' });

/** Digita a resposta da peça atual. */
const acertarPeca = (estado: EstadoDoCodeWars) => passoDoCodeWars(estado, { tipo: 'digitar', texto: estado.peca.resposta });

describe('linhas do Code Wars', () => {
  it('fica vazio sem obra concluída', () => {
    expect(linhasDoCodeWars(OBRAS, progressoNovo())).toEqual([]);
  });

  it('usa só as obras concluídas, sem comentário e sem repetir', () => {
    const linhas = linhasDoCodeWars(OBRAS, comConcluidas('correio'));
    expect(linhas.length).toBeGreaterThan(0);
    expect(new Set(linhas.map((linha) => linha.obra))).toEqual(new Set(['Correio']));
    expect(linhas.some((linha) => linha.texto.startsWith('#'))).toBe(false);
    expect(new Set(linhas.map((linha) => linha.texto)).size).toBe(linhas.length);
  });

  it('no modo livre, usa todas as obras', () => {
    const linhas = linhasDoCodeWars(OBRAS, { ...progressoNovo(), modoLivre: true });
    expect(new Set(linhas.map((linha) => linha.obra)).size).toBe(OBRAS.length);
  });
});

describe('peças', () => {
  it('copia a linha inteira antes do nível da lacuna', () => {
    const peca = criarPeca(1, LINHAS[1] as LinhaDoCodeWars, NIVEL_DA_LACUNA - 1);
    expect(peca).toMatchObject({ modo: 'copiar', antes: '', resposta: 'for i in range(3):', depois: '' });
  });

  it('esconde só sintaxe: palavra-chave, função, operador, método ou o ":" do bloco', () => {
    expect(trechosParaLacuna('for i in range(3):').map((trecho) => trecho.texto)).toEqual(['for', 'in', 'range', ':']);
    expect(trechosParaLacuna('nomes.append("Ana")').map((trecho) => trecho.texto)).toEqual(['append']);
    expect(trechosParaLacuna('total = preco * 2').map((trecho) => trecho.texto)).toEqual(['=', '*']);
    expect(trechosParaLacuna('print("a: b")  # fim:').map((trecho) => trecho.texto)).toEqual(['print']);
  });

  it('em todas as linhas de todas as obras, a lacuna remonta a linha e nunca esconde texto, número ou nome', () => {
    const linhas = linhasDoCodeWars(OBRAS, { ...progressoNovo(), modoLivre: true });
    for (const [indice, linha] of linhas.entries()) {
      const peca = criarPeca(indice, linha, NIVEL_DA_LACUNA);
      expect(peca.antes + peca.resposta + peca.depois).toBe(linha.texto);
      if (peca.modo === 'copiar') continue;
      const [token, ...resto] = tokensSignificativos(peca.resposta);
      expect(resto).toEqual([]);
      expect(['texto', 'numero', 'comentario']).not.toContain(token?.categoria);
      if (token?.categoria === 'nome') expect(peca.antes.trimEnd().endsWith('.')).toBe(true);
    }
  });

  it('linha sem sintaxe para esconder continua sendo cópia', () => {
    expect(criarPeca(1, { texto: 'nome', obra: 'X' }, 5).modo).toBe('copiar');
  });

  it('lacuna e níveis altos caem mais rápido, com piso de 4 segundos', () => {
    const linha = LINHAS[1] as LinhaDoCodeWars;
    expect(duracaoDaPecaMs(criarPeca(1, linha, 1), 1)).toBeGreaterThan(duracaoDaPecaMs(criarPeca(1, linha, 1), 4));
    expect(duracaoDaPecaMs(criarPeca(1, linha, 30), 30)).toBe(4000);
  });
});

describe('conferir o que foi digitado', () => {
  const peca = criarPeca(1, LINHAS[0] as LinhaDoCodeWars, 1);

  it('acompanha o caminho e aponta o desvio', () => {
    expect(conferir('', peca)).toBe('vazio');
    expect(conferir('print("O', peca)).toBe('no-caminho');
    expect(conferir("print('O", peca)).toBe('no-caminho');
    expect(conferir('prnt', peca)).toBe('desvio');
  });

  it('aceita espaços a mais e aspas simples na linha completa', () => {
    expect(conferir('print("Olá")', peca)).toBe('completo');
    expect(conferir("print( 'Olá' )", peca)).toBe('completo');
    expect(conferir('print("Ola")', peca)).not.toBe('completo');
  });
});

describe('partida', () => {
  it('começa jogando, com a peça no topo e a próxima à vista', () => {
    const estado = novaPartida(LINHAS, 7);
    expect(estado).toMatchObject({ fase: 'jogando', nivel: 1, pontos: 0, entulho: [] });
    expect(estado.peca.fileira).toBe(0);
    expect(estado.peca.linha).not.toBe(estado.proxima);
  });

  it('a peça desce a cada tique e, no fundo, vira entulho e zera o combo', () => {
    let estado = acertarPeca(novaPartida(LINHAS, 7));
    expect(estado.combo).toBe(1);
    estado = passoDoCodeWars(estado, { tipo: 'tique' });
    expect(estado.peca.fileira).toBe(1);
    const caida = estado.peca.linha;
    estado = deixarCair(estado);
    expect(estado.entulho).toEqual([caida]);
    expect(estado.combo).toBe(0);
    expect(estado.evento?.tipo).toBe('caiu');
    expect(estado.peca.fileira).toBe(0);
  });

  it('acertar pontua, troca a peça e limpa o que foi digitado', () => {
    const inicio = novaPartida(LINHAS, 7);
    const estado = acertarPeca(passoDoCodeWars(inicio, { tipo: 'digitar', texto: 'p' }));
    expect(estado.pontos).toBeGreaterThan(0);
    expect(estado.acertos).toBe(1);
    expect(estado.digitado).toBe('');
    expect(estado.peca.linha).toBe(inicio.proxima);
    expect(estado.evento).toMatchObject({ tipo: 'acertou', limpouEntulho: false });
  });

  it('a pilha no topo encerra a partida', () => {
    let estado = novaPartida(LINHAS, 7);
    for (let vez = 0; vez < FILEIRAS && estado.fase === 'jogando'; vez += 1) estado = deixarCair(estado);
    expect(estado.fase).toBe('fim');
    expect(estado.entulho).toHaveLength(FILEIRAS - 1);
    expect(passoDoCodeWars(estado, { tipo: 'tique' })).toBe(estado);
  });

  it(`${COMBO_PARA_LIMPAR} acertos seguidos limpam uma fileira de entulho`, () => {
    let estado = deixarCair(deixarCair(novaPartida(LINHAS, 7)));
    expect(estado.entulho).toHaveLength(2);
    estado = repetir(estado, COMBO_PARA_LIMPAR, { tipo: 'tique' }); // só para mexer na peça
    for (let vez = 0; vez < COMBO_PARA_LIMPAR; vez += 1) estado = acertarPeca(estado);
    expect(estado.entulho).toHaveLength(1);
    expect(estado.evento).toMatchObject({ tipo: 'acertou', limpouEntulho: true });
  });

  it(`sobe de nível a cada ${ACERTOS_POR_NIVEL} acertos e passa a pedir lacunas`, () => {
    let estado = novaPartida(LINHAS, 7);
    for (let vez = 0; vez < ACERTOS_POR_NIVEL * (NIVEL_DA_LACUNA - 1); vez += 1) estado = acertarPeca(estado);
    expect(estado.nivel).toBe(NIVEL_DA_LACUNA);
    expect(estado.peca.modo).toBe('lacuna');
  });

  it('a fila é embaralhada de novo quando as linhas acabam', () => {
    let estado = novaPartida(LINHAS, 7);
    for (let vez = 0; vez < LINHAS.length * 3; vez += 1) estado = acertarPeca(estado);
    expect(estado.acertos).toBe(LINHAS.length * 3);
    expect(estado.fase).toBe('jogando');
  });

  it('enviar errado custa o combo e uma fileira', () => {
    let estado = acertarPeca(novaPartida(LINHAS, 7));
    estado = passoDoCodeWars(passoDoCodeWars(estado, { tipo: 'digitar', texto: 'xyz' }), { tipo: 'enviar' });
    expect(estado).toMatchObject({ combo: 0, evento: { tipo: 'errou' } });
    expect(estado.peca.fileira).toBe(1);
  });

  it('pausado, o tempo não passa e o teclado não conta', () => {
    const pausado = passoDoCodeWars(novaPartida(LINHAS, 7), { tipo: 'pausar' });
    expect(passoDoCodeWars(pausado, { tipo: 'tique' })).toBe(pausado);
    expect(passoDoCodeWars(pausado, { tipo: 'digitar', texto: 'a' })).toBe(pausado);
    expect(passoDoCodeWars(pausado, { tipo: 'continuar' }).fase).toBe('jogando');
  });
});
