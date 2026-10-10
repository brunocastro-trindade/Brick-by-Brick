// Web Worker que carrega o Pyodide e roda os programas dos jogadores fora da thread da interface.
// Um laço infinito aqui não congela a tela: o executor principal derruba e recria o worker (ADR-0002).
import { loadPyodide } from 'pyodide';
import codigoDoExecutor from './executor.py?raw';
import type { PedidoExecucao, ResultadoExecucao } from './tipos';

export type MensagemParaWorker = { tipo: 'executar'; id: number; pedido: PedidoExecucao };

export type MensagemDoWorker =
  | { tipo: 'pronto'; versao: string }
  | { tipo: 'falhou'; mensagem: string }
  | { tipo: 'resultado'; id: number; resultado: ResultadoExecucao }
  | { tipo: 'erro-interno'; id: number; mensagem: string };

type FuncaoExecutar = (codigo: string, verificacao: string, entradas: string[], limitePassos: number) => string;

const escopo = self as unknown as {
  postMessage(mensagem: MensagemDoWorker): void;
  onmessage: ((evento: MessageEvent<MensagemParaWorker>) => void) | null;
};

let executar: FuncaoExecutar | null = null;

async function iniciar(): Promise<void> {
  try {
    const pyodide = await loadPyodide({
      indexURL: new URL(`${import.meta.env.BASE_URL}pyodide/`, self.location.origin).href,
      stdout: () => {},
      stderr: () => {},
    });
    pyodide.runPython(codigoDoExecutor);
    executar = pyodide.globals.get('executar') as FuncaoExecutar;
    escopo.postMessage({ tipo: 'pronto', versao: pyodide.version });
  } catch (erro) {
    escopo.postMessage({ tipo: 'falhou', mensagem: erro instanceof Error ? erro.message : String(erro) });
  }
}

escopo.onmessage = ({ data }) => {
  if (data.tipo !== 'executar') return;
  if (!executar) {
    escopo.postMessage({ tipo: 'erro-interno', id: data.id, mensagem: 'O Python ainda não está pronto.' });
    return;
  }
  try {
    const { codigo, verificacao = '', entradas, limitePassos = 200_000 } = data.pedido;
    const resultado = JSON.parse(executar(codigo, verificacao, entradas, limitePassos)) as ResultadoExecucao;
    escopo.postMessage({ tipo: 'resultado', id: data.id, resultado });
  } catch (erro) {
    escopo.postMessage({ tipo: 'erro-interno', id: data.id, mensagem: erro instanceof Error ? erro.message : String(erro) });
  }
};

void iniciar();
