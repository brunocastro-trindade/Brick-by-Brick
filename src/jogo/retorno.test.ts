import { describe, expect, it } from 'vitest';
import { enderecoDeRetorno, type Diagnostico } from './retorno';

const diagnostico: Diagnostico = {
  versao: '0.1.0+abc1234',
  tela: '#/obra/correio',
  navegador: 'Mozilla/5.0 (iPhone) Safari/605.1',
  python: 'falhou',
  erros: ['TypeError: x is undefined'],
};

function abrir(endereco: string) {
  const [destino, consulta] = endereco.split('?');
  const campos = new URLSearchParams((consulta ?? '').replace(/\+/g, '%2B'));
  return { destino, assunto: campos.get('subject') ?? '', corpo: campos.get('body') ?? '' };
}

describe('enderecoDeRetorno', () => {
  it('abre um e-mail para o contato com assunto pronto e o diagnóstico no corpo', () => {
    const { destino, assunto, corpo } = abrir(enderecoDeRetorno('equipe@exemplo.org', diagnostico));
    expect(destino).toBe('mailto:equipe@exemplo.org');
    expect(assunto).toBe('Retorno do beta do Brick by Brick');
    expect(corpo).toContain('O que aconteceu');
    for (const valor of ['0.1.0+abc1234', '#/obra/correio', 'iPhone', 'falhou', 'TypeError: x is undefined']) {
      expect(corpo).toContain(valor);
    }
  });

  it('escapa o que quebraria o endereço (& # ? e quebra de linha)', () => {
    const endereco = enderecoDeRetorno('equipe@exemplo.org', { ...diagnostico, erros: ['a & b # c ? d'] });
    expect(endereco.split('?')).toHaveLength(2);
    expect(endereco).not.toContain('#');
    expect(abrir(endereco).corpo).toContain('a & b # c ? d');
  });

  it('sem erros recentes, diz que não houve', () => {
    expect(abrir(enderecoDeRetorno('e@x.org', { ...diagnostico, erros: [] })).corpo).toContain('Erros recentes: nenhum');
  });

  it('corta o corpo longo, porque programa de e-mail corta mailto grande', () => {
    const erros = Array.from({ length: 5 }, (_, i) => `Erro ${i} ${'x'.repeat(400)}`);
    const { corpo } = abrir(enderecoDeRetorno('e@x.org', { ...diagnostico, erros }));
    expect(corpo.length).toBeLessThanOrEqual(1500);
    expect(corpo.endsWith('…')).toBe(true);
  });
});
