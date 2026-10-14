import { describe, expect, it } from 'vitest';
import { estrelasDaObra, pontuarDesafio, type ResultadoDesafio } from './pontuacao';
import {
  arquivoDeProgresso,
  carregarProgresso,
  CHAVE_DO_PROGRESSO,
  lerArquivoDeProgresso,
  obraLiberada,
  progressoDaObra,
  progressoDeObraNovo,
  progressoNovo,
  registrarAcerto,
  registrarPartidaDoGugloWars,
  registrarVistoria,
  reiniciarObra,
  salvarProgresso,
  type Armazenamento,
} from './progresso';
import { OBRAS } from './obras';

function armazenamentoEmMemoria(inicial: Record<string, string> = {}): Armazenamento & { dados: Record<string, string> } {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (chave) => dados[chave] ?? null,
    setItem: (chave, valor) => {
      dados[chave] = valor;
    },
  };
}

const resultado = (dePrimeira: boolean): ResultadoDesafio => ({
  desafioId: 'x',
  linhas: 1,
  errosAntes: dePrimeira ? 0 : 1,
  usouDica: false,
  dePrimeira,
  pontos: 100,
});

describe('pontuação', () => {
  it('dá bônus e combo para acerto de primeira', () => {
    expect(pontuarDesafio({ desafioId: 'a', linhas: 1, errosAntes: 0, usouDica: false, comboAtual: 0 })).toMatchObject({
      resultado: { pontos: 150, dePrimeira: true },
      combo: 1,
    });
    expect(pontuarDesafio({ desafioId: 'a', linhas: 2, errosAntes: 0, usouDica: false, comboAtual: 2 }).resultado.pontos).toBe(450);
  });

  it('dica tira o acerto de primeira e zera o combo', () => {
    expect(pontuarDesafio({ desafioId: 'a', linhas: 1, errosAntes: 0, usouDica: true, comboAtual: 3 })).toMatchObject({
      resultado: { pontos: 100, dePrimeira: false },
      combo: 0,
    });
  });

  it('o combo para em 2x', () => {
    expect(pontuarDesafio({ desafioId: 'a', linhas: 1, errosAntes: 0, usouDica: false, comboAtual: 20 }).resultado.pontos).toBe(300);
  });

  it('estrelas pela taxa de acerto de primeira', () => {
    expect(estrelasDaObra([resultado(true), resultado(true), resultado(true), resultado(true), resultado(false)])).toBe(3);
    expect(estrelasDaObra([resultado(true), resultado(false)])).toBe(2);
    expect(estrelasDaObra([resultado(false), resultado(false), resultado(true)])).toBe(1);
  });
});

describe('progresso', () => {
  it('dado corrompido ou de outra versão vira progresso novo', () => {
    expect(carregarProgresso(armazenamentoEmMemoria({ [CHAVE_DO_PROGRESSO]: '{quebrado' }))).toEqual(progressoNovo());
    expect(carregarProgresso(armazenamentoEmMemoria({ [CHAVE_DO_PROGRESSO]: '{"versao":9}' }))).toEqual(progressoNovo());
    expect(carregarProgresso(null)).toEqual(progressoNovo());
  });

  it('guarda o tema do Guglo Wars e devolve o padrão quando o valor é estranho (ADR-0015)', () => {
    const comTema = (tema: unknown) =>
      carregarProgresso(armazenamentoEmMemoria({ [CHAVE_DO_PROGRESSO]: JSON.stringify({ ...progressoNovo(), temaDoGugloWars: tema }) }));
    expect(comTema('dracula').temaDoGugloWars).toBe('dracula');
    expect(comTema('<script>').temaDoGugloWars).toBe('canteiro');
    expect(comTema(undefined).temaDoGugloWars).toBe('canteiro');
  });

  it('descarta só a obra com dado inválido', () => {
    const bruto = JSON.stringify({
      versao: 1,
      obras: {
        correio: { passo: 1, resultados: [], combo: 0, melhorPontuacao: 0, estrelas: 0 },
        armazem: { passo: 'muitos' },
      },
    });
    const progresso = carregarProgresso(armazenamentoEmMemoria({ [CHAVE_DO_PROGRESSO]: bruto }));
    expect(Object.keys(progresso.obras)).toEqual(['correio']);
  });

  it('salva e lê de volta, e não quebra se o navegador recusar', () => {
    const armazenamento = armazenamentoEmMemoria();
    const progresso = { ...progressoNovo(), som: false, ultimaObra: 'correio' };
    expect(salvarProgresso(progresso, armazenamento)).toBe(true);
    expect(carregarProgresso(armazenamento)).toEqual(progresso);
    const recusa: Armazenamento = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(salvarProgresso(progresso, recusa)).toBe(false);
  });

  it('conclui a obra no último desafio, guarda o melhor e libera a próxima', () => {
    const correio = OBRAS[0]!;
    let progresso = progressoNovo();
    expect(obraLiberada(OBRAS, progresso, 1)).toBe(false);
    for (const desafio of correio.desafios) {
      progresso = registrarAcerto(progresso, correio, { ...resultado(true), desafioId: desafio.id }, 1);
    }
    expect(progresso.obras.correio).toMatchObject({ concluida: true, estrelas: 3, melhorPontuacao: 500 });
    expect(obraLiberada(OBRAS, progresso, 1)).toBe(true);

    progresso = reiniciarObra(progresso, 'correio');
    expect(progresso.obras.correio).toMatchObject({ passo: 0, resultados: [], concluida: true, estrelas: 3 });
  });

  it('modo livre abre todas as obras', () => {
    expect(obraLiberada(OBRAS, { ...progressoNovo(), modoLivre: true }, 9)).toBe(true);
  });

  it('progresso salvo antes do Guglo Wars, ou com recorde estranho, carrega com recorde zero', () => {
    const antigo = { versao: 1, obras: {}, som: true, modoLivre: false, ultimaObra: null, mecanicasVistas: [] };
    expect(carregarProgresso(armazenamentoEmMemoria({ [CHAVE_DO_PROGRESSO]: JSON.stringify(antigo) })).gugloWars).toEqual({ recorde: 0, partidas: 0 });
    const estranho = { ...antigo, gugloWars: { recorde: -5, partidas: 'muitas' } };
    expect(carregarProgresso(armazenamentoEmMemoria({ [CHAVE_DO_PROGRESSO]: JSON.stringify(estranho) })).gugloWars).toEqual({ recorde: 0, partidas: 0 });
  });

  it('a partida do Guglo Wars conta e guarda só o maior placar', () => {
    let progresso = registrarPartidaDoGugloWars(progressoNovo(), 900);
    progresso = registrarPartidaDoGugloWars(progresso, 400);
    expect(progresso.gugloWars).toEqual({ recorde: 900, partidas: 2 });
  });
});

describe('progresso em arquivo (ADR-0011)', () => {
  const comAlgo = () => registrarPartidaDoGugloWars({ ...progressoNovo(), ultimaObra: OBRAS[0].id }, 120);

  it('vai e volta pelo arquivo sem perder nada', () => {
    const progresso = comAlgo();
    const texto = arquivoDeProgresso(progresso, new Date('2026-10-10T12:00:00Z'));
    expect(JSON.parse(texto)).toMatchObject({ formato: 'brick-by-brick/progresso', exportadoEm: '2026-10-10T12:00:00.000Z' });
    expect(lerArquivoDeProgresso(texto)).toEqual(progresso);
  });

  it('recusa o que não é arquivo de progresso', () => {
    const valido = JSON.parse(arquivoDeProgresso(comAlgo(), new Date()));
    for (const texto of [
      'isto não é JSON',
      'null',
      '[]',
      JSON.stringify(valido.progresso),
      JSON.stringify({ ...valido, formato: 'outro-jogo/progresso' }),
      JSON.stringify({ ...valido, progresso: { ...valido.progresso, versao: 2 } }),
      JSON.stringify({ ...valido, progresso: { ...valido.progresso, obras: null } }),
    ]) {
      expect(lerArquivoDeProgresso(texto), texto).toBeNull();
    }
  });

  it('saneia o conteúdo como a leitura do navegador (INV-06)', () => {
    const valido = JSON.parse(arquivoDeProgresso(comAlgo(), new Date()));
    valido.progresso.obras = { correio: { passo: -1 } };
    valido.progresso.gugloWars = { recorde: 'muito', partidas: 3 };
    const lido = lerArquivoDeProgresso(JSON.stringify(valido));
    expect(lido?.obras).toEqual({});
    expect(lido?.gugloWars).toEqual({ recorde: 0, partidas: 3 });
  });
});

describe('vistoria no progresso (ADR-0016)', () => {
  it('guarda o melhor resultado: de primeira vence, depois menos espiadas', () => {
    let progresso = registrarVistoria(progressoNovo(), 'correio', { dePrimeira: false, espiadas: 3 });
    progresso = registrarVistoria(progresso, 'correio', { dePrimeira: false, espiadas: 5 });
    expect(progressoDaObra(progresso, 'correio').vistoria).toEqual({ dePrimeira: false, espiadas: 3 });
    progresso = registrarVistoria(progresso, 'correio', { dePrimeira: false, espiadas: 1 });
    progresso = registrarVistoria(progresso, 'correio', { dePrimeira: true, espiadas: 0 });
    progresso = registrarVistoria(progresso, 'correio', { dePrimeira: false, espiadas: 0 });
    expect(progressoDaObra(progresso, 'correio').vistoria).toEqual({ dePrimeira: true, espiadas: 0 });
  });

  it('refazer a obra não apaga a vistoria', () => {
    const progresso = registrarVistoria(progressoNovo(), 'correio', { dePrimeira: true, espiadas: 0 });
    expect(progressoDaObra(reiniciarObra(progresso, 'correio'), 'correio').vistoria).toEqual({ dePrimeira: true, espiadas: 0 });
  });

  it('vistoria salva estranha vira "sem vistoria" sem perder a obra; progresso antigo sem o campo carrega', () => {
    const obraSalva = { ...progressoDeObraNovo(), concluida: true, estrelas: 3 };
    const comVistoria = (vistoria: unknown) =>
      progressoDaObra(
        carregarProgresso(armazenamentoEmMemoria({ [CHAVE_DO_PROGRESSO]: JSON.stringify({ ...progressoNovo(), obras: { correio: { ...obraSalva, vistoria } } }) })),
        'correio',
      );
    expect(comVistoria({ dePrimeira: 'sim', espiadas: 0 })).toMatchObject({ concluida: true, vistoria: null });
    expect(comVistoria({ dePrimeira: true, espiadas: 2 }).vistoria).toEqual({ dePrimeira: false, espiadas: 2 });
    expect(comVistoria(undefined)).toMatchObject({ concluida: true, estrelas: 3, vistoria: null });
  });
});

