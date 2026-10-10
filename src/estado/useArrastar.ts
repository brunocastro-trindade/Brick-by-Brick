// Arrastar e soltar por ponteiro (mouse, caneta e toque), sem biblioteca.
// Um toque sem movimento continua sendo clique; arrastar só começa depois de alguns pixels.
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';

const LIMIAR_DE_ARRASTO = 6;

export interface Arrasto {
  id: string;
  /** Posição do ponteiro. */
  x: number;
  y: number;
  /** Onde o ponteiro pegou o tijolo, relativo ao canto do tijolo. */
  pegaX: number;
  pegaY: number;
  /** Alvo debaixo do ponteiro (atributo data-alvo), se houver. */
  alvo: string | null;
  elementoAlvo: HTMLElement | null;
}

interface Pressao {
  id: string;
  x0: number;
  y0: number;
  pegaX: number;
  pegaY: number;
  ativo: boolean;
}

export interface Soltura {
  id: string;
  alvo: string | null;
  elementoAlvo: HTMLElement | null;
  /** Canto esquerdo do tijolo no momento em que foi solto. */
  esquerda: number;
  topo: number;
}

function alvoNoPonto(x: number, y: number): HTMLElement | null {
  for (const elemento of document.elementsFromPoint(x, y)) {
    const alvo = (elemento as HTMLElement).closest<HTMLElement>('[data-alvo]');
    if (alvo) return alvo;
  }
  return null;
}

export function useArrastar(aoSoltar: (soltura: Soltura) => void) {
  const [arrasto, setArrasto] = useState<Arrasto | null>(null);
  const pressao = useRef<Pressao | null>(null);
  const acabouDeArrastar = useRef(false);
  const aoSoltarAtual = useRef(aoSoltar);

  useEffect(() => {
    aoSoltarAtual.current = aoSoltar;
  }, [aoSoltar]);

  useEffect(() => {
    const mover = (evento: globalThis.PointerEvent) => {
      const atual = pressao.current;
      if (!atual) return;
      const distancia = Math.hypot(evento.clientX - atual.x0, evento.clientY - atual.y0);
      if (!atual.ativo && distancia < LIMIAR_DE_ARRASTO) return;
      atual.ativo = true;
      const elementoAlvo = alvoNoPonto(evento.clientX, evento.clientY);
      setArrasto({
        id: atual.id,
        x: evento.clientX,
        y: evento.clientY,
        pegaX: atual.pegaX,
        pegaY: atual.pegaY,
        alvo: elementoAlvo?.dataset.alvo ?? null,
        elementoAlvo,
      });
    };
    const soltar = (evento: globalThis.PointerEvent) => {
      const atual = pressao.current;
      pressao.current = null;
      if (!atual?.ativo) return;
      acabouDeArrastar.current = true;
      const elementoAlvo = alvoNoPonto(evento.clientX, evento.clientY);
      setArrasto(null);
      aoSoltarAtual.current({
        id: atual.id,
        alvo: elementoAlvo?.dataset.alvo ?? null,
        elementoAlvo,
        esquerda: evento.clientX - atual.pegaX,
        topo: evento.clientY - atual.pegaY,
      });
    };
    const cancelar = () => {
      pressao.current = null;
      setArrasto(null);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', cancelar);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', cancelar);
    };
  }, []);

  const pressionar = useCallback(
    (id: string) => (evento: PointerEvent<HTMLElement>) => {
      if (evento.button !== 0) return;
      const caixa = evento.currentTarget.getBoundingClientRect();
      acabouDeArrastar.current = false;
      pressao.current = {
        id,
        x0: evento.clientX,
        y0: evento.clientY,
        pegaX: evento.clientX - caixa.left,
        pegaY: evento.clientY - caixa.top,
        ativo: false,
      };
    },
    [],
  );

  /** Depois de um arrasto, o navegador ainda dispara um clique: este filtro o ignora. */
  const cliqueValido = useCallback(() => {
    if (!acabouDeArrastar.current) return true;
    acabouDeArrastar.current = false;
    return false;
  }, []);

  return { arrasto, pressionar, cliqueValido };
}
