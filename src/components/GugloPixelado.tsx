// Guglo em pixel art (refs/Guglo-pixelado, ADR-0006): uma folha de sprites com 12 quadros lado a lado.
// O mapa escolhe o quadro a cada passo; o Guglo avulso toca a própria sequência (painel de obra pronta, vitrine).
import { useEffect, useState } from 'react';
import { prefereMenosMovimento } from '../estado/usePython';
import folha from '../assets/guglo-pixelado.webp';
import styles from './GugloPixelado.module.css';

/** Tamanho de cada quadro na folha e o ponto do pé, que pisa no chão. */
export const SPRITE_DO_GUGLO = { largura: 140, altura: 173, peX: 70, peY: 164 } as const;
const TOTAL_DE_QUADROS = 12;

export const QUADROS_DO_GUGLO = {
  parado: 0,
  /** Pé direito à frente (1, 2 e 3) alternando com o esquerdo (4). */
  passos: [1, 4, 2, 4, 3, 4],
  acenando: 5,
  /** Agacha, ergue os braços, pula, aterrissa, abaixa os braços e vibra. */
  comemoracao: [6, 7, 8, 9, 10, 11],
  bracosParaCima: 7,
} as const;

export const CADENCIA_DO_GUGLO_MS = { passos: 110, comemoracao: 120 } as const;

/** Duas voltas da comemoração. */
export const COMEMORACAO_COMPLETA: readonly number[] = [...QUADROS_DO_GUGLO.comemoracao, ...QUADROS_DO_GUGLO.comemoracao];

/** Um quadro da folha, com o pé em (0, 0) do SVG em volta. */
function Quadro({ quadro }: { quadro: number }) {
  const { largura, altura, peX, peY } = SPRITE_DO_GUGLO;
  return (
    <g className={quadro === QUADROS_DO_GUGLO.parado ? styles.respirando : undefined}>
      <svg x={-peX} y={-peY} width={largura} height={altura} viewBox={`${quadro * largura} 0 ${largura} ${altura}`}>
        <image href={folha} width={largura * TOTAL_DE_QUADROS} height={altura} />
      </svg>
    </g>
  );
}

export interface GugloPixeladoNoMapaProps {
  x: number;
  y: number;
  quadro: number;
  olhandoPara: 'direita' | 'esquerda';
  escala: number;
}

/** Guglo dentro de outro SVG, com os pés em (x, y). Quem chama escolhe o quadro. */
export function GugloPixeladoNoMapa({ x, y, quadro, olhandoPara, escala }: GugloPixeladoNoMapaProps) {
  const virado = olhandoPara === 'esquerda' ? ' scale(-1 1)' : '';
  return (
    <g transform={`translate(${x} ${y})${virado} scale(${escala})`} aria-hidden="true">
      <Quadro quadro={quadro} />
    </g>
  );
}

export type AcaoDoGuglo = 'parado' | 'andando' | 'acenando' | 'comemorando';

const SEQUENCIAS: Record<AcaoDoGuglo, { quadros: readonly number[]; cadenciaMs: number; voltas: number; final: number }> = {
  parado: { quadros: [QUADROS_DO_GUGLO.parado], cadenciaMs: 0, voltas: 1, final: QUADROS_DO_GUGLO.parado },
  andando: { quadros: QUADROS_DO_GUGLO.passos, cadenciaMs: CADENCIA_DO_GUGLO_MS.passos, voltas: Infinity, final: QUADROS_DO_GUGLO.parado },
  acenando: { quadros: [QUADROS_DO_GUGLO.acenando], cadenciaMs: 0, voltas: 1, final: QUADROS_DO_GUGLO.acenando },
  comemorando: {
    quadros: COMEMORACAO_COMPLETA,
    cadenciaMs: CADENCIA_DO_GUGLO_MS.comemoracao,
    voltas: 1,
    final: QUADROS_DO_GUGLO.bracosParaCima,
  },
};

/** Toca a sequência da ação e devolve o quadro da vez; ao terminar, fica no quadro final. */
function useQuadroDaAcao(acao: AcaoDoGuglo): number {
  const { quadros, cadenciaMs, voltas, final } = SEQUENCIAS[acao];
  const [indice, setIndice] = useState(0);
  const animada = quadros.length > 1 && !prefereMenosMovimento();
  useEffect(() => {
    if (!animada) return;
    const ultimo = quadros.length * voltas;
    const comeco = performance.now();
    let pedido = 0;
    const tique = (agora: number) => {
      const i = Math.floor(Math.max(0, agora - comeco) / cadenciaMs);
      setIndice(i);
      if (i < ultimo) pedido = requestAnimationFrame(tique);
    };
    pedido = requestAnimationFrame(tique);
    return () => cancelAnimationFrame(pedido);
  }, [animada, quadros, cadenciaMs, voltas]);
  if (!animada) return final;
  return indice < quadros.length * voltas ? (quadros[indice % quadros.length] ?? final) : final;
}

export interface GugloPixeladoProps {
  acao?: AcaoDoGuglo;
  rotulo?: string;
}

/** Guglo avulso, num <svg> próprio. Comemorando, pula duas vezes e fica de braços para cima. */
export function GugloPixelado({ acao = 'parado', rotulo }: GugloPixeladoProps) {
  const quadro = useQuadroDaAcao(acao);
  const { largura, altura, peX, peY } = SPRITE_DO_GUGLO;
  return (
    <svg
      className={styles.avulso}
      viewBox={`${-peX} ${-peY} ${largura} ${altura}`}
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
    >
      <Quadro quadro={quadro} />
    </svg>
  );
}
