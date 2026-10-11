import { describe, expect, it } from 'vitest';
import { explicarErro } from './erros-python';

describe('explicarErro', () => {
  it('traduz um erro conhecido', () => {
    expect(explicarErro('SyntaxError').nome).toBe('Erro de sintaxe');
  });

  it('exceção com nome de propriedade do JavaScript cai na explicação genérica', () => {
    // O jogador pode criar `class constructor(Exception)`: o nome vem do Python, não da lista.
    for (const tipo of ['constructor', 'toString', 'valueOf', '__proto__', 'hasOwnProperty']) {
      expect(explicarErro(tipo)).toEqual({
        nome: 'Erro ao rodar',
        explicacao: expect.stringContaining('O Python encontrou um problema'),
      });
    }
  });
});
