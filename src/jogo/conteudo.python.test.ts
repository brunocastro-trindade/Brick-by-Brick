// Roda todas as obras no Pyodide de verdade (o mesmo executor.py do navegador), dentro do Node.
// É a prova de que o conteúdo ensina Python que funciona: `npm run conteudo:validar`.
import { loadPyodide } from 'pyodide';
import { beforeAll, describe, expect, it } from 'vitest';
import codigoDoExecutor from '../python/executor.py?raw';
import type { Executor, PedidoExecucao, ResultadoExecucao } from '../python/tipos';
import { OBRAS } from './obras';
import { CORPO_DE_SONDAGEM, fecharBlocoAberto, linhasAntesDoPasso, textoDoPrograma } from './programa';
import type { Desafio, Linha, Obra } from './tipos';
import { criarSorteio } from './embaralhar';
import { progressoNovo } from './progresso';
import { candidatas, ERRADAS_MINIMAS, gerarPergunta } from './qualSaida';
import { avaliarTentativa } from './validacao';
import { MARCA_COMENTARIO_FIM, MARCA_COMENTARIO_INICIO } from '../python/tipos';
import { avaliarVistoria, moldeDaVistoria, programaDaSaidaEsperada, saidaComComentarios, verificacaoDaObra } from './vistoria';

let executor: Executor;

beforeAll(async () => {
  const pyodide = await loadPyodide();
  pyodide.runPython(codigoDoExecutor);
  const executar = pyodide.globals.get('executar') as (c: string, v: string, e: string[], l: number) => string;
  executor = {
    pronto: () => true,
    executar: async (pedido: PedidoExecucao) =>
      JSON.parse(executar(pedido.codigo, pedido.verificacao ?? '', pedido.entradas, pedido.limitePassos ?? 200_000)) as ResultadoExecucao,
  };
}, 120_000);

const rodar = (codigo: string, entradas: string[] = [], verificacao?: string) =>
  executor.executar({ codigo, entradas, verificacao });

function programaComLinhas(obra: Obra, passo: number, linhas: Linha[]): string {
  return textoDoPrograma(fecharBlocoAberto([...linhasAntesDoPasso(obra, passo), ...linhas], CORPO_DE_SONDAGEM));
}

/** Mesmo comportamento observável em todas as entradas: saída, variáveis, teste oculto e erro. */
async function mesmoComportamento(obra: Obra, desafio: Desafio, linhas: Linha[]): Promise<boolean> {
  for (const entradas of obra.entradas) {
    const planta = await rodar(programaComLinhas(obra, desafio.indice, desafio.linhas), entradas, desafio.verificar);
    const outra = await rodar(programaComLinhas(obra, desafio.indice, linhas), entradas, desafio.verificar);
    const igual =
      planta.saida === outra.saida &&
      planta.saidaVerificacao === outra.saidaVerificacao &&
      JSON.stringify(planta.variaveis) === JSON.stringify(outra.variaveis) &&
      planta.erro?.tipo === outra.erro?.tipo;
    if (!igual) return false;
  }
  return true;
}

describe('executor.py', () => {
  it('simula input e marca a resposta digitada', async () => {
    const resultado = await rodar('nome = input("Nome? ")\nprint("Oi,", nome)', ['Ana']);
    expect(resultado.saida).toBe('Nome? \u0002Ana\u0003\nOi, Ana\n');
    expect(resultado.variaveis).toEqual({ nome: "'Ana'" });
  });

  it('para laço infinito pelo limite de passos', async () => {
    const resultado = await executor.executar({ codigo: 'while True:\n    pass', entradas: [], limitePassos: 5_000 });
    expect(resultado.erro?.tipo).toBe('LimiteDePassos');
  });

  it('aponta a linha e a sugestão do erro', async () => {
    const resultado = await rodar('quantidade = 1\nprint(Quantidade)');
    expect(resultado.erro).toMatchObject({ tipo: 'NameError', linha: 2, fase: 'programa' });
    expect(resultado.erro?.mensagem).toMatch(/Did you mean: 'quantidade'/);
  });

  it('resume objetos sem endereço de memória', async () => {
    const resultado = await rodar('class C:\n    def __init__(self):\n        self.a = 1\nc = C()');
    expect(resultado.variaveis.c).toBe('<C a=1>');
    expect(resultado.variaveis.C).toBe('<classe C: __init__(self)>');
  });
});

describe.each(OBRAS.map((obra) => [obra.nome, obra] as const))('obra %s', (_nome, obra) => {
  it('cada passo da planta roda sem erro, em todas as entradas', async () => {
    for (const desafio of obra.desafios) {
      for (const entradas of obra.entradas) {
        const resultado = await rodar(programaComLinhas(obra, desafio.indice, desafio.linhas), entradas, desafio.verificar);
        expect(resultado.erro, `${desafio.id} com entradas ${JSON.stringify(entradas)}`).toBeNull();
      }
    }
  });

  it('a obra completa mostra a saída esperada', async () => {
    const resultado = await rodar(textoDoPrograma(linhasAntesDoPasso(obra, obra.desafios.length)), obra.entradas[0]);
    expect(resultado.saida.replaceAll('\u0002', '').replaceAll('\u0003', '')).toMatchSnapshot();
  });

  it('a resposta da planta é aceita de primeira', async () => {
    for (const desafio of obra.desafios) {
      const tijolos = desafio.tipo === 'digitar' ? [] : desafio.tijolos.filter((tijolo) => !tijolo.classificacao);
      const veredito = await avaliarTentativa({
        obra,
        passo: desafio.indice,
        tentativa: { linhas: desafio.linhas, tijolos, vagas: desafio.tipo === 'montar' ? desafio.resposta : undefined },
        executor,
      });
      expect(veredito, desafio.id).toEqual({ tipo: 'certo', via: 'planta' });
    }
  });

  it('nenhum tijolo "tem um problema" se comporta igual à resposta', async () => {
    const enganosos: string[] = [];
    for (const desafio of obra.desafios) {
      if (desafio.tipo === 'digitar') continue;
      for (const extra of desafio.tijolos.filter((tijolo) => tijolo.classificacao === 'problema')) {
        if (desafio.tipo === 'montar') {
          for (let vaga = 0; vaga < desafio.resposta.length; vaga += 1) {
            const vagas = desafio.resposta.map((texto, indice) => (indice === vaga ? extra.texto : texto));
            const texto = desafio.partes.map((parte) => (parte.tipo === 'fixo' ? parte.texto : vagas[parte.indice])).join('');
            if (await mesmoComportamento(obra, desafio, [{ recuo: desafio.recuo, texto: texto.trimEnd() }])) {
              enganosos.push(`${desafio.id}: "${extra.texto}" na vaga ${vaga + 1}`);
            }
          }
        } else {
          for (let posicao = 0; posicao < desafio.linhas.length; posicao += 1) {
            const linhas = desafio.linhas.map((linha, indice) => (indice === posicao ? { ...linha, texto: extra.texto } : linha));
            if (await mesmoComportamento(obra, desafio, linhas)) enganosos.push(`${desafio.id}: "${extra.texto}" na linha ${posicao + 1}`);
          }
        }
      }
    }
    expect(enganosos).toEqual([]);
  });
});

describe('avaliarTentativa com Python de verdade', () => {
  const obra = (id: string) => OBRAS.find((candidata) => candidata.id === id) as Obra;

  it('aceita solução diferente da planta que faz a mesma coisa', async () => {
    const mercado = obra('mercado');
    const veredito = await avaliarTentativa({
      obra: mercado,
      passo: 1,
      tentativa: { linhas: [{ recuo: 0, texto: 'total = 4 * preco' }], tijolos: [] },
      executor,
    });
    expect(veredito).toEqual({ tipo: 'certo', via: 'comportamento' });
  });

  it('mostra o erro de recuo de um bloco mal empilhado', async () => {
    const cinema = obra('cinema');
    const veredito = await avaliarTentativa({
      obra: cinema,
      passo: 1,
      tentativa: {
        linhas: [
          { recuo: 0, texto: 'print("Pode entrar!")' },
          { recuo: 0, texto: 'else:' },
          { recuo: 1, texto: 'print("Esse filme ainda não é para você.")' },
        ],
        tijolos: [],
      },
      executor,
    });
    expect(veredito).toMatchObject({ tipo: 'erro-python', erro: { tipo: 'IndentationError' }, diagnostico: { tipo: 'recuo', indice: 0 } });
  });

  it('percebe quando a saída muda por causa do recuo', async () => {
    const fabrica = obra('fabrica');
    const veredito = await avaliarTentativa({
      obra: fabrica,
      passo: 2,
      tentativa: {
        linhas: [
          { recuo: 0, texto: 'total = 0' },
          { recuo: 0, texto: 'for lote in range(5):' },
          { recuo: 1, texto: 'total = total + 10' },
          { recuo: 1, texto: 'print("Total produzido:", total)' },
        ],
        tijolos: [],
      },
      executor,
    });
    expect(veredito).toMatchObject({ tipo: 'resultado-diferente', motivo: { tipo: 'saida' }, diagnostico: { tipo: 'recuo', indice: 3 } });
  });

  it('pega a função que mostra em vez de devolver pelo teste oculto', async () => {
    const oficina = obra('oficina');
    const veredito = await avaliarTentativa({
      obra: oficina,
      passo: 3,
      tentativa: {
        linhas: [
          { recuo: 0, texto: 'def area(largura, altura):' },
          { recuo: 1, texto: 'print(largura * altura)' },
        ],
        tijolos: [],
      },
      executor,
    });
    expect(veredito).toMatchObject({ tipo: 'resultado-diferente', motivo: { tipo: 'teste', esperado: '6\n', obtido: '6\nNone\n' } });
  });
});

describe('vistoria no Python de verdade (ADR-0016)', () => {
  it.each(OBRAS.map((item) => [item.nome, item] as const))('%s: os testes ocultos de todas as etapas rodam juntos na planta', async (_, item) => {
    for (const entradas of item.entradas) {
      const resultado = await rodar(textoDoPrograma(moldeDaVistoria(item)), entradas, verificacaoDaObra(item));
      expect(resultado.erro).toBeNull();
    }
  });

  it.each(OBRAS.map((item) => [item.nome, item] as const))('%s: a planta escrita com outro espaçamento passa', async (_, item) => {
    const textos = moldeDaVistoria(item).map((linha) => linha.texto.replace(/ = /g, '='));
    expect(await avaliarVistoria({ obra: item, textos, executor })).toMatchObject({ tipo: 'certo' });
  });

  it.each(OBRAS.map((item) => [item.nome, item] as const))('%s: a saída esperada é a da planta, mais os comentários dela', async (_, item) => {
    const semComentario = new RegExp(`${MARCA_COMENTARIO_INICIO}[^${MARCA_COMENTARIO_FIM}]*${MARCA_COMENTARIO_FIM}\\n`, 'g');
    for (const entradas of item.entradas) {
      const planta = await rodar(textoDoPrograma(moldeDaVistoria(item)), entradas);
      const esperada = await rodar(programaDaSaidaEsperada(item), entradas);
      expect(esperada.erro).toBeNull();
      expect(saidaComComentarios(item, esperada.saida).replace(semComentario, '')).toBe(planta.saida);
    }
  });

  it('Correio: o comentário aparece entre as linhas que ele separa', async () => {
    const correio = OBRAS.find((item) => item.id === 'correio')!;
    const saida = saidaComComentarios(correio, (await rodar(programaDaSaidaEsperada(correio))).saida);
    expect(saida.split('\n').slice(1, 4)).toEqual(['Cartas e pacotes', '\u00043\u001f# Quem enviou o cartão\u0005', 'Remetente: Guglo']);
  });

  // O programa que só imprime a saída pronta, com o mesmo número de fiadas, nas obras sem recuo e sem input():
  // a comparação de variáveis é o que barra (sem ela, ele passaria pela saída).
  const semBloco = OBRAS.filter((item) => moldeDaVistoria(item).every((linha) => linha.recuo === 0 && !linha.texto.includes('input(')));
  it.each(semBloco.map((item) => [item.nome, item] as const))('%s: print com a saída pronta não passa na vistoria', async (_, item) => {
    const molde = moldeDaVistoria(item);
    const planta = await rodar(textoDoPrograma(molde), item.entradas[0]);
    // Programa só de print com texto (o Correio): imprimir a saída pronta é o próprio programa.
    if (Object.keys(planta.variaveis).length === 0) return;
    const saida = planta.saida.replace(/\n$/, '').split('\n');
    const prints = saida.length <= molde.length ? saida.map((linha) => `print(${JSON.stringify(linha)})`) : [`print(${JSON.stringify(saida.join('\n'))})`];
    const textos = [...prints, ...Array.from({ length: molde.length - prints.length }, () => 'pass')];
    expect(await avaliarVistoria({ obra: item, textos, executor })).not.toMatchObject({ tipo: 'certo' });
  });
});

describe('"Qual é a saída?" no Python de verdade (ADR-0017)', () => {
  const todas = candidatas(OBRAS, { ...progressoNovo(), modoLivre: true });

  it.each(OBRAS.map((item) => [item.nome, item] as const))('%s: rende perguntas com uma certa e erradas distintas', async (_, item) => {
    let perguntas = 0;
    for (const candidata of todas.filter(({ obra }) => obra.id === item.id)) {
      const pergunta = await gerarPergunta(candidata, executor, criarSorteio(candidata.inicio + 1));
      if (!pergunta) continue;
      perguntas += 1;
      const saidas = pergunta.alternativas.map((alternativa) => alternativa.saida);
      expect(pergunta.alternativas.filter((alternativa) => alternativa.certa)).toHaveLength(1);
      expect(new Set(saidas).size).toBe(saidas.length);
      expect(saidas.length).toBeGreaterThanOrEqual(ERRADAS_MINIMAS + 1);
      expect(saidas.every((saida) => saida.trim() !== '')).toBe(true);
      // A certa é o que a linha mostra de verdade: rodar o trecho termina com ela.
      const certa = pergunta.alternativas.find((alternativa) => alternativa.certa)?.saida ?? '';
      const rodado = await rodar(textoDoPrograma(pergunta.trecho), [...pergunta.entradas, ...(item.entradas[0] ?? [])]);
      if (pergunta.entradas.length === 0) expect(rodado.saida.endsWith(certa)).toBe(true);
    }
    expect(perguntas).toBeGreaterThanOrEqual(1);
  });
});

