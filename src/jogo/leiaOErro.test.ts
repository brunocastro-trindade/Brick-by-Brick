import { describe, expect, it } from 'vitest';
import { criarSorteio } from './embaralhar';
import { aplicar, candidatasDoErro, estragosDaLinha, filaVariada, type TipoDeEstrago } from './leiaOErro';
import { OBRAS } from './obras';
import { progressoNovo } from './progresso';
import type { Linha } from './tipos';

const L = (texto: string, recuo = 0): Linha => ({ recuo, texto });
const estragado = (linhas: Linha[], indice: number, tipo: TipoDeEstrago) =>
  estragosDaLinha(linhas, indice).filter((estrago) => estrago.tipo === tipo);

describe('estragos (ADR-0019)', () => {
  it('nome lido com a primeira letra trocada; o nome criado na linha fica como está', () => {
    const [estrago, ...resto] = estragado([L('fruta = "banana"'), L('print(fruta)')], 1, 'nome');
    expect(resto).toEqual([]);
    expect(estrago?.linha.texto).toBe('print(Fruta)');
    expect(estrago?.consertosErrados.map((troca) => troca.nova?.texto)).toEqual(['print("Fruta")', 'print(frutas)']);
    expect(estragado([L('fruta = "banana"')], 0, 'nome')).toEqual([]);
    expect(estragado([L('for livro in livros:')], 0, 'nome').map((estrago) => estrago.linha.texto)).toEqual(['for livro in Livros:']);
  });

  it('função embutida com maiúscula e conversão esquecida', () => {
    const linhas = [L('idade = int(input("Idade? "))')];
    expect(estragado(linhas, 0, 'funcao').map((estrago) => estrago.linha.texto)).toEqual(['idade = Int(input("Idade? "))', 'idade = int(Input("Idade? "))']);
    const [conversao] = estragado(linhas, 0, 'conversao');
    expect(conversao?.linha.texto).toBe('idade = input("Idade? ")');
    expect(conversao?.consertosErrados[0]?.nova?.texto).toBe('idade = str(input("Idade? "))');
  });

  it('parêntese e aspas sem fechar, com o conserto errado do lado', () => {
    const linhas = [L('print("Olá, mundo!")')];
    expect(estragado(linhas, 0, 'parentese')[0]?.linha.texto).toBe('print("Olá, mundo!"');
    expect(estragado(linhas, 0, 'parentese')[0]?.consertosErrados[0]?.nova?.texto).toBe('print("Olá, mundo!"]');
    expect(estragado(linhas, 0, 'aspas')[0]?.linha.texto).toBe('print("Olá, mundo!)');
    expect(estragado(linhas, 0, 'aspas')[0]?.consertosErrados[0]?.nova?.texto).toBe(`print("Olá, mundo!')`);
  });

  it('dois-pontos, = no lugar de == e recuo esquecido', () => {
    const linhas = [L('if idade == 12:'), L('print("Doze!")', 1)];
    expect(estragado(linhas, 0, 'dois-pontos')[0]?.linha.texto).toBe('if idade == 12');
    expect(estragado(linhas, 0, 'dois-pontos')[0]?.consertosErrados[0]?.nova?.texto).toBe('if idade == 12;');
    expect(estragado(linhas, 0, 'igual')[0]?.linha.texto).toBe('if idade = 12:');
    const [recuo] = estragado(linhas, 1, 'recuo');
    expect(recuo?.linha).toEqual(L('print("Doze!")', 0));
    expect(recuo?.consertosErrados).toEqual([{ indice: 0, nova: L('if idade == 12') }]);
  });

  it('método de outra linguagem, índice fora da lista e chave com maiúscula', () => {
    expect(estragado([L('livros.append("Duna")')], 0, 'metodo')[0]?.linha.texto).toBe('livros.add("Duna")');
    const [indice] = estragado([L('print(livros[0])')], 0, 'indice');
    expect(indice?.linha.texto).toBe('print(livros[10])');
    expect(indice?.consertosErrados[0]?.nova?.texto).toBe('print(livros[len(livros)])');
    const [chave] = estragado([L('print(cofre["rubi"])')], 0, 'chave');
    expect(chave?.linha.texto).toBe('print(cofre["Rubi"])');
    expect(chave?.consertosErrados[0]?.nova?.texto).toBe('print(cofre[rubi])');
  });

  it('comentário e linha vazia não viram estrago', () => {
    expect(estragosDaLinha([L('# só um comentário')], 0)).toEqual([]);
    expect(estragosDaLinha([L('')], 0)).toEqual([]);
  });
});

describe('rodada (ADR-0019)', () => {
  it('aplicar troca ou apaga uma linha', () => {
    const programa = [L('a = 1'), L('print(a)')];
    expect(aplicar(programa, { indice: 1, nova: L('print(b)') })).toEqual([L('a = 1'), L('print(b)')]);
    expect(aplicar(programa, { indice: 0, nova: null })).toEqual([L('print(a)')]);
  });

  it('só as obras concluídas viram candidatas; no modo livre, todas', () => {
    expect(candidatasDoErro(OBRAS, progressoNovo())).toEqual([]);
    const todas = candidatasDoErro(OBRAS, { ...progressoNovo(), modoLivre: true });
    expect(new Set(todas.map((candidata) => candidata.obra.id)).size).toBe(OBRAS.length);
  });

  it('a fila intercala os tipos de estrago', () => {
    const todas = candidatasDoErro(OBRAS, { ...progressoNovo(), modoLivre: true });
    const fila = filaVariada(todas, criarSorteio(7));
    expect(fila).toHaveLength(todas.length);
    const tipos = new Set(todas.map((candidata) => candidata.estrago.tipo)).size;
    expect(new Set(fila.slice(0, tipos).map((candidata) => candidata.estrago.tipo)).size).toBe(tipos);
  });
});
