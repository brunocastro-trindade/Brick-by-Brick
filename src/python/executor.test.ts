import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PythonNoNavegador, TEMPO_LIMITE_MS } from './executor';
import type { MensagemDoWorker, MensagemParaWorker } from './executor.worker';
import type { ResultadoExecucao } from './tipos';

/** Worker de mentira: guarda o que recebe e responde quando o teste mandar. */
class WorkerFalso {
  static ultimo: WorkerFalso | null = null;
  onmessage: ((evento: { data: MensagemDoWorker }) => void) | null = null;
  onerror: ((evento: { message: string }) => void) | null = null;
  recebidas: MensagemParaWorker[] = [];
  encerrado = false;
  constructor() {
    WorkerFalso.ultimo = this;
  }
  postMessage(mensagem: MensagemParaWorker) {
    this.recebidas.push(mensagem);
  }
  terminate() {
    this.encerrado = true;
  }
  responder(mensagem: MensagemDoWorker) {
    this.onmessage?.({ data: mensagem });
  }
}

const resultado = (saida: string): ResultadoExecucao => ({ saida, saidaVerificacao: '', erro: null, variaveis: {} });

describe('executor no navegador (HARNESS S8)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', WorkerFalso);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const pronto = () => {
    const python = new PythonNoNavegador();
    python.iniciar();
    const worker = WorkerFalso.ultimo!;
    worker.responder({ tipo: 'pronto', versao: 'teste' });
    return { python, worker };
  };

  it('entrega um pedido por vez ao worker, e o relógio só conta a execução, não a fila', async () => {
    const { python, worker } = pronto();
    const primeiro = python.executar({ codigo: 'a', entradas: [] });
    const segundo = python.executar({ codigo: 'b', entradas: [] });
    expect(worker.recebidas.map((mensagem) => mensagem.pedido.codigo)).toEqual(['a']);

    // O primeiro demora quase o limite inteiro: o segundo, na fila, não pode estourar por isso.
    vi.advanceTimersByTime(TEMPO_LIMITE_MS - 100);
    worker.responder({ tipo: 'resultado', id: worker.recebidas[0]!.id, resultado: resultado('A') });
    expect(worker.recebidas.map((mensagem) => mensagem.pedido.codigo)).toEqual(['a', 'b']);
    vi.advanceTimersByTime(TEMPO_LIMITE_MS - 100);
    worker.responder({ tipo: 'resultado', id: worker.recebidas[1]!.id, resultado: resultado('B') });

    expect((await primeiro).saida).toBe('A');
    expect((await segundo).saida).toBe('B');
    expect(worker.encerrado).toBe(false);
  });

  it('programa travado vira TempoEsgotado, recria o worker e recusa quem esperava na fila', async () => {
    const { python, worker } = pronto();
    const travado = python.executar({ codigo: 'while True: pass', entradas: [] });
    const naFila = python.executar({ codigo: 'b', entradas: [] });
    vi.advanceTimersByTime(TEMPO_LIMITE_MS);
    expect((await travado).erro?.tipo).toBe('TempoEsgotado');
    await expect(naFila).rejects.toThrow('reiniciado');
    expect(worker.encerrado).toBe(true);
    expect(python.obterEstado()).toBe('carregando');
  });

  it('esperarPronto resolve quando o Python volta, ou com false se ele falhar', async () => {
    const python = new PythonNoNavegador();
    python.iniciar();
    const espera = python.esperarPronto();
    WorkerFalso.ultimo!.responder({ tipo: 'pronto', versao: 'teste' });
    expect(await espera).toBe(true);
    expect(await python.esperarPronto()).toBe(true);

    python.reiniciar();
    const outra = python.esperarPronto();
    WorkerFalso.ultimo!.responder({ tipo: 'falhou', mensagem: 'sem rede' });
    expect(await outra).toBe(false);
  });
});
