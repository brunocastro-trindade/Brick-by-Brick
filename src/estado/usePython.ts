import { useSyncExternalStore } from 'react';
import { pythonDoJogo, type EstadoDoPython } from '../python/executor';

export function useEstadoDoPython(): EstadoDoPython {
  return useSyncExternalStore(
    (avisar) => pythonDoJogo.aoMudarEstado(avisar),
    () => pythonDoJogo.obterEstado(),
  );
}

/** Movimento reduzido pedido pelo sistema: animações viram cortes secos. */
export function prefereMenosMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
