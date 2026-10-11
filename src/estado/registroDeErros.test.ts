import { beforeEach, describe, expect, it } from 'vitest';
import { anotarErro, errosRecentes, esquecerErros } from './registroDeErros';

describe('registro de erros', () => {
  beforeEach(() => esquecerErros());

  it('guarda nome e mensagem, só os 5 últimos', () => {
    for (let i = 1; i <= 7; i += 1) anotarErro(new RangeError(`erro ${i}`));
    expect(errosRecentes()).toEqual(['RangeError: erro 3', 'RangeError: erro 4', 'RangeError: erro 5', 'RangeError: erro 6', 'RangeError: erro 7']);
  });

  it('aceita o que não é Error e corta mensagem comprida', () => {
    anotarErro('falhou o worker');
    anotarErro(undefined);
    anotarErro(new Error('y'.repeat(500)));
    const [texto, indefinido, longo] = errosRecentes();
    expect(texto).toBe('falhou o worker');
    expect(indefinido).toBe('undefined');
    expect(longo?.length).toBe(200);
  });
});
