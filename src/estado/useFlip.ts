// Animação FLIP por identidade: um tijolo que sai da palete e reaparece numa vaga (outro elemento,
// mesmo data-flip) desliza da posição antiga para a nova, como peça de Tetris encaixando.
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { prefereMenosMovimento } from './usePython';

interface Ponto {
  x: number;
  y: number;
}

export function useFlip(raiz: RefObject<HTMLElement | null>) {
  const posicoes = useRef(new Map<string, Ponto>());

  useLayoutEffect(() => {
    const elementos = raiz.current?.querySelectorAll<HTMLElement>('[data-flip]');
    if (!elementos) return;
    const novas = new Map<string, Ponto>();
    const animar = !prefereMenosMovimento();
    for (const elemento of elementos) {
      const id = elemento.dataset.flip;
      if (!id) continue;
      const caixa = elemento.getBoundingClientRect();
      const atual = { x: caixa.left + window.scrollX, y: caixa.top + window.scrollY };
      const antiga = posicoes.current.get(id);
      if (animar && antiga && (Math.abs(antiga.x - atual.x) > 2 || Math.abs(antiga.y - atual.y) > 2)) {
        elemento.animate(
          [{ transform: `translate(${antiga.x - atual.x}px, ${antiga.y - atual.y}px)` }, { transform: 'none' }],
          { duration: 280, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
        );
      }
      novas.set(id, atual);
    }
    posicoes.current = novas;
  });

  /** Depois de soltar um arrasto, o tijolo deve sair de onde foi solto, não de onde estava. */
  return (id: string, esquerda: number, topo: number) => {
    posicoes.current.set(id, { x: esquerda + window.scrollX, y: topo + window.scrollY });
  };
}
