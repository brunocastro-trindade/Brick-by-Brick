import { describe, expect, it } from 'vitest';
import type { Executor, ResultadoExecucao } from '../python/tipos';
import { processarObra } from './conteudo';
import { falaDaVistoria } from './falas';
import {
  avaliarVistoria,
  fiadasDeComentario,
  linhasDaVistoria,
  moldeDaVistoria,
  primeiraLinhaDiferente,
  programaDaSaidaEsperada,
  saidaComComentarios,
  verificacaoDaObra,
} from './vistoria';

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
      { tipo: 'digitar', titulo: 'Mostre x', contexto: 'Mostre.', codigo: 'print(x)', explicacao: 'Assim.', verificar: 'print(x * 2)' },
      {
        tipo: 'empilhar',
        titulo: 'Decida',
        contexto: 'Decida.',
        codigo: 'if x > 0:\n    print("positivo")',
        explicacao: 'Assim.',
      },
    ],
  },
  'teste.yaml',
);

const PLANTA = ['x = 1', 'print(x)', 'if x > 0:', 'print("positivo")'];

/** Executor que só lembra o código que recebeu e devolve o resultado combinado para ele. */
function executorFalso(resultados: (codigo: string) => Partial<ResultadoExecucao>): Executor & { codigos: string[] } {
  const codigos: string[] = [];
  return {
    codigos,
    pronto: () => true,
    executar: async ({ codigo }) => {
      codigos.push(codigo);
      return { saida: '', saidaVerificacao: '', erro: null, variaveis: {}, ...resultados(codigo) };
    },
  };
}

describe('vistoria (ADR-0016)', () => {
  it('o molde é o programa inteiro da obra, com o recuo da planta', () => {
    expect(moldeDaVistoria(obra).map((linha) => linha.recuo)).toEqual([0, 0, 0, 1]);
    expect(linhasDaVistoria(obra, ['  x = 1 ', 'print(x)', 'if x > 0:', 'print("positivo")'])[0]).toEqual({ recuo: 0, texto: 'x = 1' });
  });

  it('junta os testes ocultos de todas as etapas', () => {
    expect(verificacaoDaObra(obra)).toBe('print(x * 2)');
  });

  it('linha vazia não vai para o Python: a vistoria aponta quais faltam', async () => {
    const executor = executorFalso(() => ({}));
    expect(await avaliarVistoria({ obra, textos: ['x = 1', '', 'if x > 0:'], executor })).toEqual({ tipo: 'incompleta', vazias: [1, 3] });
    expect(executor.codigos).toEqual([]);
  });

  it('igual à planta, ignorando espaços e estilo de aspas, passa sem rodar Python', async () => {
    const executor = executorFalso(() => ({}));
    const veredito = await avaliarVistoria({ obra, textos: ['x=1', 'print( x )', 'if x>0:', "print('positivo')"], executor });
    expect(veredito).toEqual({ tipo: 'certo', via: 'planta' });
    expect(executor.codigos).toEqual([]);
  });

  it('diferente da planta mas com o mesmo comportamento passa "do seu jeito"', async () => {
    const executor = executorFalso(() => ({ saida: '1\npositivo\n', variaveis: { x: '1' } }));
    const textos = ['x = 1', 'print(x)', 'if x >= 1:', 'print("positivo")'];
    expect(await avaliarVistoria({ obra, textos, executor })).toEqual({ tipo: 'certo', via: 'comportamento' });
  });

  it('variável diferente reprova, mesmo com a mesma saída: print com o texto pronto não passa', async () => {
    const executor = executorFalso((codigo) => ({ saida: '1\npositivo\n', variaveis: codigo.startsWith('x = 1') ? { x: '1' } : ({} as Record<string, string>) }));
    const veredito = await avaliarVistoria({ obra, textos: ['print(1)', 'print("positivo")', 'if True:', 'pass'], executor });
    expect(veredito).toMatchObject({ tipo: 'resultado-diferente', motivo: { tipo: 'variavel', nome: 'x' }, linha: 0 });
  });

  it('erro do Python aponta a fiada onde ele parou', async () => {
    const erro = { tipo: 'NameError', mensagem: "name 'y' is not defined", linha: 2, fase: 'programa' as const };
    const executor = executorFalso((codigo) => (codigo.includes('print(y)') ? { erro } : {}));
    const veredito = await avaliarVistoria({ obra, textos: ['x = 1', 'print(y)', 'if x > 0:', 'print("positivo")'], executor });
    expect(veredito).toEqual({ tipo: 'erro-python', erro, linha: 1 });
  });

  it('sem Python, diz qual é a primeira fiada que não confere com a planta', async () => {
    const textos = ['x = 1', 'print(x)', 'if x >= 1:', 'print("positivo")'];
    expect(primeiraLinhaDiferente(obra, textos)).toBe(2);
    expect(await avaliarVistoria({ obra, textos, executor: null })).toEqual({ tipo: 'sem-python', linha: 2 });
    expect(primeiraLinhaDiferente(obra, PLANTA)).toBeNull();
  });
});

describe('fala da vistoria', () => {
  const planta = moldeDaVistoria(obra);

  it('lista as fiadas vazias', () => {
    expect(falaDaVistoria({ tipo: 'incompleta', vazias: [1, 3] }, planta, 0, 0).texto).toBe('As fiadas 2 e 4 estão vazias. Toda fiada da planta precisa de código.');
    expect(falaDaVistoria({ tipo: 'incompleta', vazias: [0] }, planta, 0, 0).texto).toMatch(/^A fiada 1 está vazia/);
  });

  it('só aponta a fiada que não confere da segunda entrega errada em diante', () => {
    const veredito = { tipo: 'sem-python' as const, linha: 2 };
    expect(falaDaVistoria(veredito, planta, 0, 0).texto).not.toContain('fiada 3');
    expect(falaDaVistoria(veredito, planta, 1, 0).texto).toContain('Olhe a fiada 3');
  });

  it('aprovada de primeira só sem erro e sem espiar; do seu jeito mostra a planta', () => {
    expect(falaDaVistoria({ tipo: 'certo', via: 'planta' }, planta, 0, 0).texto).toContain('De primeira e sem espiar');
    expect(falaDaVistoria({ tipo: 'certo', via: 'planta' }, planta, 0, 1).texto).toContain('tente de primeira e sem espiar');
    expect(falaDaVistoria({ tipo: 'certo', via: 'comportamento' }, planta, 1, 0).codigo).toBe('x = 1\nprint(x)\nif x > 0:\n    print("positivo")');
  });
});

describe('comentários da planta na saída esperada', () => {
  const comComentario = processarObra(
    {
      id: 'comentada',
      ordem: 1,
      nome: 'Comentada',
      conceito: 'comentários',
      nivel: 'basico',
      modelo: 'casa',
      aula: { titulo: 'Aula', texto: 'Texto', exemplo: 'x = 1' },
      inicial: '# começo\nx = 1\nif x > 5:\n    # nunca roda\n    print("grande")',
      desafios: [{ tipo: 'digitar', titulo: 'Mostre', contexto: 'Mostre.', codigo: 'print(x)  # mostra x', explicacao: 'Assim.' }],
    },
    'comentada.yaml',
  );

  it('só a fiada que é inteira comentário conta (comentário no fim de uma linha de código não)', () => {
    expect(fiadasDeComentario(comComentario)).toEqual([0, 3]);
    expect(fiadasDeComentario(obra)).toEqual([]);
  });

  it('o programa troca o comentário por uma marca com o número da fiada, sem o texto e no mesmo recuo', () => {
    const programa = programaDaSaidaEsperada(comComentario);
    expect(programa).not.toContain('começo');
    expect(programa.split('\n').slice(2)).toEqual(['__comentario_da_planta__(0)', 'x = 1', 'if x > 5:', '    __comentario_da_planta__(3)', '    print("grande")', 'print(x)  # mostra x']);
    expect(programaDaSaidaEsperada(obra)).toBe('x = 1\nprint(x)\nif x > 0:\n    print("positivo")');
  });

  it('a marca vira o comentário com a fiada; o que não rodou vai para o fim', () => {
    expect(saidaComComentarios(comComentario, '\u00040\u0005\n1\n')).toBe('\u00041\u001f# começo\u0005\n1\n\u00044\u001f# nunca roda\u0005\n');
    expect(saidaComComentarios(obra, '1\npositivo\n')).toBe('1\npositivo\n');
  });
});

