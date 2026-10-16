// Guglo animado por tema (refs/brick_by_brick_6_conjuntos_animacao, ADR-0006): seis conjuntos de seis quadros,
// cada um uma folha de sprites com fundo transparente. Reservado para as próximas janelas e telas do jogo.
import { useEffect, useState } from 'react';
import { prefereMenosMovimento } from '../estado/usePython';
import programacao from '../assets/guglo-animado/guglo-programacao.webp';
import python from '../assets/guglo-animado/guglo-python.webp';
import design from '../assets/guglo-animado/guglo-design.webp';
import terminal from '../assets/guglo-animado/guglo-terminal.webp';
import ideias from '../assets/guglo-animado/guglo-ideias.webp';
import ferramentas from '../assets/guglo-animado/guglo-ferramentas.webp';
import styles from './GugloAnimado.module.css';

export type ConjuntoDoGuglo = 'programacao' | 'python' | 'design' | 'terminal' | 'ideias' | 'ferramentas';

/** O que o Guglo faz: parado (quadro 0), trabalhando (laço do tema), pensando (quadro 4) ou comemorando (quadro 5). */
export type AnimacaoDoGuglo = 'parado' | 'trabalhando' | 'pensando' | 'comemorando';

interface Conjunto {
  folha: string;
  largura: number;
  altura: number;
  /** Quadros do laço "trabalhando", na ordem em que tocam. */
  trabalho: readonly number[];
  /** Nome de cada quadro na arte original, na ordem da folha. */
  quadros: readonly string[];
}

export const CONJUNTOS_DO_GUGLO: Record<ConjuntoDoGuglo, Conjunto> = {
  programacao: { folha: programacao, largura: 235, altura: 217, trabalho: [1, 2, 3, 2], quadros: ['parado', 'digita 1', 'digita 2', 'digita 3', 'pensa', 'acerta'] },
  python: { folha: python, largura: 238, altura: 223, trabalho: [1, 2, 3], quadros: ['parado', 'mostra', 'vibra', 'acena', 'aponta', 'acerta'] },
  design: { folha: design, largura: 235, altura: 220, trabalho: [1, 2, 3, 2], quadros: ['parado', 'segura', 'desenha 1', 'desenha 2', 'pensa', 'acerta'] },
  terminal: { folha: terminal, largura: 236, altura: 220, trabalho: [1, 2, 3, 2], quadros: ['parado', 'mostra', 'digita 1', 'digita 2', 'pensa', 'acerta'] },
  ideias: { folha: ideias, largura: 237, altura: 232, trabalho: [1, 2, 3], quadros: ['parado', 'ideia 1', 'ideia 2', 'aponta', 'pensa', 'acerta'] },
  ferramentas: { folha: ferramentas, largura: 238, altura: 223, trabalho: [1, 2, 3, 2], quadros: ['parado', 'segura', 'anda 1', 'anda 2', 'acena', 'acerta'] },
};

export const NOMES_DOS_CONJUNTOS = Object.keys(CONJUNTOS_DO_GUGLO) as ConjuntoDoGuglo[];

const CADENCIA_MS = 220;
const QUADRO_FIXO: Record<Exclude<AnimacaoDoGuglo, 'trabalhando'>, number> = { parado: 0, pensando: 4, comemorando: 5 };

/** Toca o laço de trabalho; com movimento reduzido, fica no primeiro quadro do laço. */
function useQuadro(conjunto: Conjunto, animacao: AnimacaoDoGuglo): number {
  const [indice, setIndice] = useState(0);
  const animada = animacao === 'trabalhando' && !prefereMenosMovimento();
  useEffect(() => {
    if (!animada) return;
    const relogio = window.setInterval(() => setIndice((atual) => atual + 1), CADENCIA_MS);
    return () => window.clearInterval(relogio);
  }, [animada]);
  if (animacao !== 'trabalhando') return QUADRO_FIXO[animacao];
  const { trabalho } = conjunto;
  return animada ? (trabalho[indice % trabalho.length] ?? 0) : (trabalho[0] ?? 0);
}

export interface GugloAnimadoProps {
  conjunto: ConjuntoDoGuglo;
  animacao?: AnimacaoDoGuglo;
  rotulo?: string;
}

/** Ocupa a caixa de quem chama, com os pés no chão dela. Sem rótulo, é decorativo. */
export function GugloAnimado({ conjunto, animacao = 'trabalhando', rotulo }: GugloAnimadoProps) {
  const dados = CONJUNTOS_DO_GUGLO[conjunto];
  const quadro = useQuadro(dados, animacao);
  const { largura, altura, folha } = dados;
  return (
    <svg
      className={styles.guglo}
      viewBox={`${quadro * largura} 0 ${largura} ${altura}`}
      preserveAspectRatio="xMidYMax meet"
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
    >
      <image href={folha} width={largura * 6} height={altura} />
    </svg>
  );
}
