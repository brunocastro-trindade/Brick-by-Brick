import { describe, expect, it } from 'vitest';
import { estrelasDaObra, pontuarDesafio, type ResultadoDesafio } from './pontuacao';
import {
  carregarProgresso,
  CHAVE_DO_PROGRESSO,
  obraLiberada,
  progressoNovo,
  registrarAcerto,
  registrarPartidaDoGugloWars,
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
