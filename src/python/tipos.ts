// Contrato entre o jogo e quem executa Python (Web Worker no navegador, Pyodide direto nos testes).

export interface PedidoExecucao {
  codigo: string;
  /** Código invisível rodado depois do programa, no mesmo escopo, para testar comportamento. */
  verificacao?: string;
  entradas: string[];
  limitePassos?: number;
}

export interface ErroPython {
  tipo: string;
  mensagem: string;
  /** Linha no programa (1 = primeira), quando o erro aponta para o código do jogador. */
  linha: number | null;
  fase: 'programa' | 'verificacao';
}

export interface ResultadoExecucao {
  /** Saída do programa. Entradas digitadas vêm entre os marcadores \u0002 e \u0003. */
  saida: string;
  saidaVerificacao: string;
  erro: ErroPython | null;
  /** Retrato das variáveis globais ao fim do programa: nome → repr resumido. */
  variaveis: Record<string, string>;
}

export interface Executor {
  pronto(): boolean;
  executar(pedido: PedidoExecucao): Promise<ResultadoExecucao>;
}

export const MARCA_ENTRADA_INICIO = '\u0002';
export const MARCA_ENTRADA_FIM = '\u0003';

/** Comentário da planta na saída esperada da Vistoria (ADR-0016): número da fiada, separador e texto. */
export const MARCA_COMENTARIO_INICIO = '\u0004';
export const MARCA_COMENTARIO_SEPARADOR = '\u001f';
export const MARCA_COMENTARIO_FIM = '\u0005';
