import { describe, expect, it } from 'vitest';
import { categoriaDoTijolo, linhasEquivalentes, realceSemantico, tokenizar, tokensSignificativos } from './tokenizador';

describe('tokenizar', () => {
  it('reconstrói a linha exata, espaços incluídos', () => {
    const linha = 'nome = input("Qual é o seu nome? ")  # pergunta';
    expect(tokenizar(linha).map((token) => token.texto).join('')).toBe(linha);
  });

  it('classifica palavras-chave, funções embutidas, nomes, textos e números', () => {
    const tokens = tokensSignificativos('for i in range(3): print(f"x{i}", 2.5)');
    expect(tokens.map((token) => [token.categoria, token.texto])).toEqual([
      ['palavra-chave', 'for'],
      ['nome', 'i'],
      ['palavra-chave', 'in'],
      ['funcao', 'range'],
      ['pontuacao', '('],
      ['numero', '3'],
      ['pontuacao', ')'],
      ['pontuacao', ':'],
      ['funcao', 'print'],
      ['pontuacao', '('],
      ['texto', 'f"x{i}"'],
      ['pontuacao', ','],
      ['numero', '2.5'],
      ['pontuacao', ')'],
    ]);
  });

  it('reconhece operadores de mais de um caractere', () => {
    expect(tokensSignificativos('a //= b ** 2 >= c').map((token) => token.texto)).toEqual(['a', '//=', 'b', '**', '2', '>=', 'c']);
  });

  it('aceita nomes com acento e não confunde prefixo de string com nome', () => {
    expect(tokensSignificativos('preço = f"oi"').map((token) => token.categoria)).toEqual(['nome', 'operador', 'texto']);
    expect(tokensSignificativos('fruta = 1')[0]?.categoria).toBe('nome');
  });

  it('marca caracteres que o Python não conhece', () => {
    expect(tokensSignificativos('3 × 4').map((token) => token.categoria)).toEqual(['numero', 'desconhecido', 'numero']);
  });
});

describe('linhasEquivalentes', () => {
  it('ignora espaços e estilo de aspas', () => {
    expect(linhasEquivalentes('print( "Olá" )', "print('Olá')")).toBe(true);
    expect(linhasEquivalentes('x=1', 'x = 1')).toBe(true);
  });

  it('diferencia conteúdo, prefixo e ordem', () => {
    expect(linhasEquivalentes('print("Olá")', 'print("Ola")')).toBe(false);
    expect(linhasEquivalentes('print(f"{a}")', 'print("{a}")')).toBe(false);
    expect(linhasEquivalentes('a - b', 'b - a')).toBe(false);
  });
});

describe('categoriaDoTijolo', () => {
  it('usa o token principal do tijolo', () => {
    expect(categoriaDoTijolo('input(')).toBe('funcao');
    expect(categoriaDoTijolo('"Olá"')).toBe('texto');
    expect(categoriaDoTijolo('))')).toBe('pontuacao');
    expect(categoriaDoTijolo('>=')).toBe('operador');
    expect(categoriaDoTijolo('if')).toBe('palavra-chave');
    expect(categoriaDoTijolo('#')).toBe('comentario');
  });
});

describe('realceSemantico', () => {
  const categorias = (linha: string) =>
    realceSemantico(tokenizar(linha))
      .filter((token) => token.categoria !== 'espaco')
      .map((token) => [token.categoria, token.texto]);

  it('trata nome seguido de ( como chamada de função, inclusive método depois do ponto', () => {
    expect(categorias('total = somar (a, b) + itens.count(1)')).toEqual([
      ['nome', 'total'],
      ['operador', '='],
      ['funcao', 'somar'],
      ['pontuacao', '('],
      ['nome', 'a'],
      ['pontuacao', ','],
      ['nome', 'b'],
      ['pontuacao', ')'],
      ['operador', '+'],
      ['nome', 'itens'],
      ['pontuacao', '.'],
      ['funcao', 'count'],
      ['pontuacao', '('],
      ['numero', '1'],
      ['pontuacao', ')'],
    ]);
  });

  it('marca o nome definido por def e class', () => {
    expect(categorias('class Casa:')[1]).toEqual(['funcao', 'Casa']);
    expect(categorias('def area(self):').slice(1, 4)).toEqual([
      ['funcao', 'area'],
      ['pontuacao', '('],
      ['nome', 'self'],
    ]);
  });

  it('não muda o texto nem a categoria do que já tinha', () => {
    const linha = 'print(nome)  # oi';
    const realcados = realceSemantico(tokenizar(linha));
    expect(realcados.map((token) => token.texto).join('')).toBe(linha);
    expect(realcados.find((token) => token.texto === 'nome')?.categoria).toBe('nome');
  });
});
