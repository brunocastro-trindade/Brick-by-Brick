import { describe, expect, it } from 'vitest';
import { OBRAS } from './obras';
import { progressoNovo } from './progresso';
import { candidatas, mutacoesDaLinha, placarNovo, pontosDoAcerto, responder } from './qualSaida';

describe('mutações (ADR-0017)', () => {
  it('troca número por vizinho e operador por vizinho, um de cada vez', () => {
    expect(mutacoesDaLinha('caixas = 23 // 5').sort()).toEqual(['caixas = 22 // 5', 'caixas = 23 / 5', 'caixas = 23 // 4', 'caixas = 23 // 6', 'caixas = 24 // 5'].sort());
    expect(mutacoesDaLinha('while forno > 0:')).toEqual(['while forno >= 0:', 'while forno <= 0:', 'while forno > 1:']);
  });

  it('no print, nome vira texto e as vírgulas viram +', () => {
    expect(mutacoesDaLinha('print("Sobraram", quantidade)')).toEqual([
      `print('"Sobraram"', quantidade)`,
      'print("Sobraram", "quantidade")',
      'print("Sobraram" + quantidade)',
    ]);
    expect(mutacoesDaLinha('print("Olá, mundo!")')).toEqual([`print('"Olá, mundo!"')`]);
  });

  it('não transforma em texto o nome de função, de método nem o que vem antes de colchete', () => {
    expect(mutacoesDaLinha('print(len(livros))')).toEqual(['print(len("livros"))']);
    expect(mutacoesDaLinha('print(casa1.descrever())')).toEqual([]);
    expect(mutacoesDaLinha('print(livros[0])')).toEqual(['print(livros[1])']);
  });

  it('f-string sem f, True/False e and/or', () => {
    expect(mutacoesDaLinha('print(f"Oi, {nome}!")')).toEqual(['print("Oi, {nome}!")']);
    expect(mutacoesDaLinha('ok = True and pronto')).toEqual(['ok = False and pronto', 'ok = True or pronto']);
  });
});

describe('candidatas', () => {
  const comandos = (id: string) =>
    candidatas(OBRAS, { ...progressoNovo(), modoLivre: true })
      .filter(({ obra }) => obra.id === id)
      .map(({ inicio, fim }) => [inicio, fim]);

  it('só obras concluídas (todas no modo livre)', () => {
    expect(candidatas(OBRAS, progressoNovo())).toEqual([]);
    expect(candidatas(OBRAS, { ...progressoNovo(), modoLivre: true }).length).toBeGreaterThan(40);
  });

  it('cada comando de nível 0 com o bloco dele; sem comentário nem input()', () => {
    expect(comandos('correio')).toEqual([[0, 0], [1, 1], [3, 3], [4, 4]]);
    expect(comandos('prefeitura')).toEqual([[1, 1], [3, 3], [4, 4]]);
  });

  it('if com elif e else é um comando só; for e while levam o corpo', () => {
    expect(comandos('cinema')).toEqual([[1, 4], [5, 10], [11, 11]]);
    expect(comandos('fabrica')).toEqual([[0, 1], [2, 2], [3, 4], [5, 5], [6, 6], [7, 9], [10, 10]]);
  });
});

describe('placar da rodada', () => {
  it('acerto vale 100 mais 20 por acerto seguido antes dele, até +100; erro zera a sequência', () => {
    expect([1, 2, 3, 6, 9].map(pontosDoAcerto)).toEqual([100, 120, 140, 200, 200]);
    let placar = placarNovo();
    placar = responder(placar, true);
    placar = responder(placar, true);
    placar = responder(placar, false);
    placar = responder(placar, true);
    expect(placar).toEqual({ respondidas: 4, acertos: 3, sequencia: 1, maiorSequencia: 2, pontos: 320 });
  });
});
