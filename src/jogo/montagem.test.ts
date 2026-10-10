import { describe, expect, it } from 'vitest';
import { processarObra } from './conteudo';
import {
  devolverDaVaga,
  devolverUltimo,
  empilhar,
  encaixar,
  montagemVazia,
  mudarRecuo,
  RECUO_MAXIMO,
  tentativaDaMontagem,
  tijolosNaPalete,
} from './montagem';

const obra = processarObra(
  {
    id: 'teste',
    ordem: 1,
    nome: 'Teste',
    conceito: 'x',
    nivel: 'basico',
    modelo: 'casa',
    aula: { titulo: 'a', texto: 'b', exemplo: 'c' },
    desafios: [
      { tipo: 'montar', titulo: 't', contexto: 'c', linha: '`print(``"oi"``)`', explicacao: 'e', extras: [{ texto: 'Print(', porque: 'p' }] },
      { tipo: 'empilhar', titulo: 't', contexto: 'c', codigo: 'if True:\n    print(1)', explicacao: 'e' },
      { tipo: 'digitar', titulo: 't', contexto: 'c', codigo: 'print(2)', explicacao: 'e' },
    ],
  },
  'teste.yaml',
);
const [montar, pilha, digitar] = obra.desafios;
if (montar?.tipo !== 'montar' || pilha?.tipo !== 'empilhar' || !digitar) throw new Error('fixture');
const porId = new Map([...montar.tijolos, ...pilha.tijolos].map((tijolo) => [tijolo.id, tijolo]));
const [print, oi, fecha, extra] = montar.tijolos.map((tijolo) => tijolo.id) as [string, string, string, string];

describe('montar', () => {
  it('encaixa na vaga ativa e anda para a próxima livre', () => {
    let m = montagemVazia(montar);
    m = encaixar(m, print);
    expect(m.vagas).toEqual([print, null, null]);
    expect(m.vagaAtiva).toBe(1);
    m = encaixar(m, fecha, 2);
    m = encaixar(m, oi);
    expect(m.vagas).toEqual([print, oi, fecha]);
    expect(tentativaDaMontagem(montar, m, porId)?.linhas).toEqual([{ recuo: 0, texto: 'print("oi")' }]);
  });

  it('trocar o ocupante de uma vaga devolve o antigo à palete', () => {
    let m = encaixar(montagemVazia(montar), print, 0);
    m = encaixar(m, extra, 0);
    expect(m.vagas[0]).toBe(extra);
    expect(tijolosNaPalete(m, montar.tijolos).map((tijolo) => tijolo.id)).toContain(print);
  });

  it('mover um tijolo entre vagas não o duplica', () => {
    let m = encaixar(montagemVazia(montar), oi, 0);
    m = encaixar(m, oi, 1);
    expect(m.vagas).toEqual([null, oi, null]);
  });

  it('devolve pela vaga ou pelo último encaixado, e tentativa incompleta é null', () => {
    let m = encaixar(encaixar(montagemVazia(montar), print), oi);
    m = devolverUltimo(m);
    expect(m.vagas).toEqual([print, null, null]);
    m = devolverDaVaga(m, 0);
    expect(m.vagas).toEqual([null, null, null]);
    expect(tentativaDaMontagem(montar, m, porId)).toBeNull();
  });
});

describe('empilhar', () => {
  const [linhaIf, linhaPrint] = pilha.tijolos.map((tijolo) => tijolo.id) as [string, string];

  it('herda o recuo da linha de cima e muda o recuo dentro dos limites', () => {
    let m = empilhar(montagemVazia(pilha), linhaIf, 0);
    m = empilhar(m, linhaPrint, 0, 1);
    expect(m.pilha[1]).toEqual({ tijoloId: linhaPrint, recuo: 0 });
    m = mudarRecuo(m, 1, +1);
    expect(tentativaDaMontagem(pilha, m, porId)?.linhas).toEqual([
      { recuo: 0, texto: 'if True:' },
      { recuo: 1, texto: 'print(1)' },
    ]);
    for (let i = 0; i < 10; i += 1) m = mudarRecuo(m, 1, +1);
    expect(m.pilha[1]?.recuo).toBe(RECUO_MAXIMO);
    m = mudarRecuo(m, 0, -1);
    expect(m.pilha[0]?.recuo).toBe(0);
  });

  it('aceita recuo pedido ao soltar arrastando', () => {
    const m = empilhar(montagemVazia(pilha), linhaPrint, 0, 0, 2);
    expect(m.pilha[0]).toEqual({ tijoloId: linhaPrint, recuo: 2 });
  });
});

describe('digitar', () => {
  it('texto vazio não vira tentativa; espaços nas pontas somem', () => {
    expect(tentativaDaMontagem(digitar, { ...montagemVazia(digitar), texto: '   ' }, porId)).toBeNull();
    expect(tentativaDaMontagem(digitar, { ...montagemVazia(digitar), texto: ' print(2) ' }, porId)?.linhas).toEqual([
      { recuo: 0, texto: 'print(2)' },
    ]);
  });
});
