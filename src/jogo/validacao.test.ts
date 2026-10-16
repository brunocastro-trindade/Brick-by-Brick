import { describe, expect, it } from 'vitest';
import type { Executor, ResultadoExecucao } from '../python/tipos';
import { processarObra } from './conteudo';
import { falaDoVeredito } from './falas';
import { avaliarTentativa, diagnosticar, linhasIguais } from './validacao';

const obra = processarObra(
  {
    id: 'teste',
    ordem: 1,
    nome: 'Teste',
    conceito: 'if',
    nivel: 'basico',
    modelo: 'casa',
    aula: { titulo: 'Aula', texto: 'Texto', exemplo: 'x = 1' },
    inicial: 'x = 1',
    desafios: [
      {
        tipo: 'montar',
        titulo: 'Mostre x',
        contexto: 'Mostre.',
        linha: '`print(``x``)`',
        extras: [{ texto: '"x"', porque: 'Com aspas é texto.' }],
        explicacao: 'Assim.',
      },
      {
        tipo: 'empilhar',
        titulo: 'Decida',
        contexto: 'Decida.',
        codigo: 'if x > 0:\n    print("positivo")\nelse:\n    print("zero")',
        explicacao: 'Assim.',
      },
    ],
  },
  'teste.yaml',
);

const resultadoVazio: ResultadoExecucao = { saida: '', saidaVerificacao: '', erro: null, variaveis: {} };
const executorQueFalha: Executor = {
  pronto: () => true,
  executar: async () => ({ ...resultadoVazio, erro: { tipo: 'NameError', mensagem: 'x', linha: 4, fase: 'programa' } }),
};

describe('avaliarTentativa sem Python', () => {
  const montar = obra.desafios[0];
  if (montar?.tipo !== 'montar') throw new Error('fixture');
  // linha '`print(``x``)`': três vagas (print(, x, )) e um extra ("x")
  const [print, x, fecha, aspas] = montar.tijolos;

  it('tijolo extra vence qualquer outra checagem', async () => {
    const veredito = await avaliarTentativa({
      obra,
      passo: 0,
      tentativa: { linhas: [{ recuo: 0, texto: 'print("x")' }], tijolos: [print!, aspas!, fecha!] },
      executor: null,
    });
    expect(veredito).toMatchObject({ tipo: 'tijolo-extra', tijolo: { texto: '"x"', classificacao: 'problema' } });
  });

  it('aceita a planta ignorando espaços', async () => {
    const veredito = await avaliarTentativa({
      obra,
      passo: 0,
      tentativa: { linhas: [{ recuo: 0, texto: 'print( x )' }], tijolos: [print!, x!, fecha!] },
      executor: null,
    });
    expect(veredito).toEqual({ tipo: 'certo', via: 'planta' });
  });

  it('sem Python, aponta a primeira vaga errada', async () => {
    const veredito = await avaliarTentativa({
      obra,
      passo: 0,
      tentativa: { linhas: [{ recuo: 0, texto: 'xprint()' }], tijolos: [x!, print!, fecha!], vagas: ['x', 'print(', ')'] },
      executor: null,
    });
    expect(veredito).toEqual({ tipo: 'sem-python', diagnostico: { tipo: 'vaga', indice: 0 } });
  });

  it('traduz a linha do erro para a posição dentro da tentativa', async () => {
    const veredito = await avaliarTentativa({
      obra,
      passo: 1,
      tentativa: {
        linhas: [
          { recuo: 0, texto: 'if x > 0:' },
          { recuo: 0, texto: 'print("positivo")' },
          { recuo: 0, texto: 'else:' },
          { recuo: 1, texto: 'print("zero")' },
        ],
        tijolos: [],
      },
      executor: executorQueFalha,
    });
    // linha 4 do programa = alicerce (1) + print(x) (2) + bloco: if (3), print (4)
    expect(veredito).toMatchObject({ tipo: 'erro-python', linhaNaTentativa: 1, diagnostico: { tipo: 'recuo', indice: 1 } });
  });
});

describe('diagnosticar e linhasIguais', () => {
  const empilhar = obra.desafios[1]!;

  it('separa erro de ordem de erro de recuo', () => {
    const trocadas = [empilhar.linhas[1]!, empilhar.linhas[0]!, ...empilhar.linhas.slice(2)];
    expect(diagnosticar(empilhar, { linhas: trocadas, tijolos: [] })).toEqual({ tipo: 'ordem', indice: 0 });
    const semRecuo = empilhar.linhas.map((linha) => ({ ...linha, recuo: 0 }));
    expect(diagnosticar(empilhar, { linhas: semRecuo, tijolos: [] })).toEqual({ tipo: 'recuo', indice: 1 });
  });

  it('compara recuo e tokens', () => {
    expect(linhasIguais([{ recuo: 1, texto: "print('a')" }], [{ recuo: 1, texto: 'print("a")' }])).toBe(true);
    expect(linhasIguais([{ recuo: 0, texto: 'print("a")' }], [{ recuo: 1, texto: 'print("a")' }])).toBe(false);
  });
});

describe('falaDoVeredito', () => {
  const desafio = obra.desafios[0]!;

  it('só mostra o diagnóstico de posição a partir do segundo erro', () => {
    const veredito = { tipo: 'sem-python', diagnostico: { tipo: 'vaga', indice: 2 } } as const;
    expect(falaDoVeredito(veredito, desafio, 0).texto).not.toMatch(/espaço 3/);
    expect(falaDoVeredito(veredito, desafio, 1).texto).toMatch(/espaço 3/);
  });

  it('no acerto, explica e lista os outros tijolos', () => {
    const fala = falaDoVeredito({ tipo: 'certo', via: 'planta' }, desafio, 0, () => 0);
    expect(fala).toMatchObject({ selo: 'melhor', titulo: 'Encaixou certinho!', texto: 'Assim.' });
    expect(fala.outros).toEqual([{ texto: '"x"', porque: 'Com aspas é texto.', classificacao: 'problema' }]);
  });
});

describe('planta que não roda a tempo', () => {
  it('não fica guardada: a próxima tentativa compara com a planta de verdade', async () => {
    let chamadas = 0;
    const executorLento: Executor = {
      pronto: () => true,
      executar: async ({ codigo }) => {
        chamadas += 1;
        // Só a primeira execução (a da planta) esgota o tempo; depois o Python volta ao normal.
        if (chamadas === 1) return { ...resultadoVazio, erro: { tipo: 'TempoEsgotado', mensagem: 'sem resposta', linha: null, fase: 'programa' } };
        return { ...resultadoVazio, saida: codigo.includes('print') ? '1\n' : '' };
      },
    };
    // Mesma saída da planta, escrita de outro jeito: só passa pelo comportamento.
    const tentativa = { linhas: [{ recuo: 0, texto: 'print(x * 1)' }], tijolos: [] };
    await expect(avaliarTentativa({ obra, passo: 0, tentativa, executor: executorLento })).rejects.toThrow('a tempo');
    expect(await avaliarTentativa({ obra, passo: 0, tentativa, executor: executorLento })).toEqual({ tipo: 'certo', via: 'comportamento' });
  });
});
