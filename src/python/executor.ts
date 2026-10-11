// Lado da interface: conversa com o Web Worker do Pyodide, com tempo limite explícito e
// caminho de falha definido (HARNESS S8). Se um programa trava, o worker é recriado.
import type { MensagemDoWorker, MensagemParaWorker } from './executor.worker';
import type { Executor, PedidoExecucao, ResultadoExecucao } from './tipos';

export type EstadoDoPython = 'carregando' | 'pronto' | 'falhou';

export const TEMPO_LIMITE_MS = 8000;

interface Pendente {
  resolver: (resultado: ResultadoExecucao) => void;
  rejeitar: (erro: Error) => void;
  temporizador: ReturnType<typeof setTimeout>;
}

export class PythonNoNavegador implements Executor {
  private worker: Worker | null = null;
  private estado: EstadoDoPython = 'carregando';
  private motivo: string | null = null;
  private readonly ouvintes = new Set<(estado: EstadoDoPython) => void>();
  private readonly pendentes = new Map<number, Pendente>();
  private proximoId = 1;

  iniciar(): void {
    if (this.worker) return;
    this.mudarEstado('carregando');
    const worker = new Worker(new URL('./executor.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (evento: MessageEvent<MensagemDoWorker>) => this.receber(evento.data);
    worker.onerror = (evento) => this.falhar(`o worker do Python falhou: ${evento.message}`);
    this.worker = worker;
  }

  pronto(): boolean {
    return this.estado === 'pronto';
  }

  obterEstado(): EstadoDoPython {
    return this.estado;
  }

  /** Por que o Python não carregou, para o retorno do beta (ADR-0012). */
  motivoDaFalha(): string | null {
    return this.motivo;
  }

  aoMudarEstado(ouvinte: (estado: EstadoDoPython) => void): () => void {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  executar(pedido: PedidoExecucao): Promise<ResultadoExecucao> {
    const worker = this.worker;
    if (!worker || this.estado !== 'pronto') return Promise.reject(new Error('O Python ainda não está pronto.'));
    const id = this.proximoId;
    this.proximoId += 1;
    return new Promise((resolver, rejeitar) => {
      const temporizador = setTimeout(() => this.estourarTempo(id), TEMPO_LIMITE_MS);
      this.pendentes.set(id, { resolver, rejeitar, temporizador });
      const mensagem: MensagemParaWorker = { tipo: 'executar', id, pedido };
      worker.postMessage(mensagem);
    });
  }

  /** Recria o worker do zero, por exemplo depois de um programa travado. */
  reiniciar(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const pendente of this.pendentes.values()) {
      clearTimeout(pendente.temporizador);
      pendente.rejeitar(new Error('O Python foi reiniciado.'));
    }
    this.pendentes.clear();
    this.iniciar();
  }

  private estourarTempo(id: number): void {
    const pendente = this.pendentes.get(id);
    if (!pendente) return;
    this.pendentes.delete(id);
    pendente.resolver({
      saida: '',
      saidaVerificacao: '',
      variaveis: {},
      erro: { tipo: 'TempoEsgotado', mensagem: `sem resposta em ${TEMPO_LIMITE_MS / 1000} s`, linha: null, fase: 'programa' },
    });
    this.reiniciar();
  }

  private receber(mensagem: MensagemDoWorker): void {
    if (mensagem.tipo === 'pronto') return this.mudarEstado('pronto');
    if (mensagem.tipo === 'falhou') return this.falhar(mensagem.mensagem);
    const pendente = this.pendentes.get(mensagem.id);
    if (!pendente) return;
    clearTimeout(pendente.temporizador);
    this.pendentes.delete(mensagem.id);
    if (mensagem.tipo === 'resultado') pendente.resolver(mensagem.resultado);
    else pendente.rejeitar(new Error(mensagem.mensagem));
  }

  private falhar(motivo: string): void {
    this.motivo = motivo;
    this.mudarEstado('falhou');
  }

  private mudarEstado(estado: EstadoDoPython): void {
    this.estado = estado;
    for (const ouvinte of this.ouvintes) ouvinte(estado);
  }
}

export const pythonDoJogo = new PythonNoNavegador();
