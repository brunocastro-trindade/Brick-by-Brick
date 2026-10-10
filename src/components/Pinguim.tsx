// Guglo, o mascote, em SVG, desenhado a partir da arte original (docs/guglo.png):
// corpo laranja, máscara e barriga creme, bico e pés amarelos, contorno marrom grosso.
import styles from './Pinguim.module.css';

export type PoseDoPinguim = 'parado' | 'andando' | 'comemorando' | 'pensando' | 'ops' | 'carregando';

interface CorpoProps {
  pose: PoseDoPinguim;
  capacete: boolean;
  olhandoPara: 'direita' | 'esquerda';
}

/** Largura e altura do desenho; os pés ficam em (60, 146). */
export const TAMANHO_DO_PINGUIM = { largura: 120, altura: 150 } as const;

function Olhos({ pose }: { pose: PoseDoPinguim }) {
  if (pose === 'comemorando') {
    return (
      <g className={styles.olhos} fill="none" stroke="var(--cor-pinguim-olho)" strokeWidth={4} strokeLinecap="round">
        <path d="M43 54 Q49 45 55 54" />
        <path d="M65 54 Q71 45 77 54" />
      </g>
    );
  }
  if (pose === 'ops') {
    return (
      <g className={styles.olhos} fill="none" stroke="var(--cor-pinguim-olho)" strokeWidth={4} strokeLinecap="round">
        <path d="M44 47 L54 53 L44 57" />
        <path d="M76 47 L66 53 L76 57" />
      </g>
    );
  }
  const elevacao = pose === 'pensando' ? -3 : 0;
  return (
    <g className={styles.olhos} transform={`translate(0 ${elevacao})`}>
      <ellipse cx={49} cy={52} rx={5.5} ry={7.5} fill="var(--cor-pinguim-olho)" />
      <ellipse cx={71} cy={52} rx={5.5} ry={7.5} fill="var(--cor-pinguim-olho)" />
      <circle cx={51} cy={49} r={2.1} fill="var(--cor-pinguim-brilho)" />
      <circle cx={73} cy={49} r={2.1} fill="var(--cor-pinguim-brilho)" />
    </g>
  );
}

function CorpoDoPinguim({ pose, capacete, olhandoPara }: CorpoProps) {
  const contorno = 'var(--cor-ilustra-contorno)';
  const bocaAberta = pose === 'comemorando' || pose === 'parado' || pose === 'carregando' || pose === 'andando';
  return (
    <g className={`${styles.pinguim} ${styles[pose]}`}>
      <g transform={olhandoPara === 'esquerda' ? 'translate(120 0) scale(-1 1)' : undefined}>
        <ellipse cx={60} cy={147} rx={40} ry={4} fill="var(--cor-sombra-difusa)" />
        <g className={styles.corpoTodo}>
          <g className={styles.pes}>
            <ellipse className={styles.peEsquerdo} cx={43} cy={140} rx={16} ry={7} fill="var(--cor-pinguim-bico)" stroke={contorno} strokeWidth={3.5} />
            <ellipse className={styles.peDireito} cx={77} cy={140} rx={16} ry={7} fill="var(--cor-pinguim-bico)" stroke={contorno} strokeWidth={3.5} />
          </g>
          <path
            d="M60 16 C96 16 108 62 107 96 C106 126 88 138 60 138 C32 138 14 126 13 96 C12 62 24 16 60 16 Z"
            fill="var(--cor-pinguim-corpo)"
            stroke={contorno}
            strokeWidth={4}
          />
          <path d="M60 64 C84 64 92 86 90 106 C88 124 76 132 60 132 C44 132 32 124 30 106 C28 86 36 64 60 64 Z" fill="var(--cor-pinguim-barriga)" />
          <path d="M60 40 C50 28 30 32 30 52 C30 66 44 74 60 72 C76 74 90 66 90 52 C90 32 70 28 60 40 Z" fill="var(--cor-pinguim-barriga)" />
          <Olhos pose={pose} />
          <path d="M46 63 Q60 55 74 63 Q68 75 60 75 Q52 75 46 63 Z" fill="var(--cor-pinguim-bico)" stroke={contorno} strokeWidth={3} />
          {bocaAberta ? <path d="M52 67 Q60 71 68 67 Q64 74 60 74 Q56 74 52 67 Z" fill="var(--cor-pinguim-boca)" /> : null}
          {pose === 'carregando' ? (
            <g>
              <rect x={34} y={90} width={52} height={22} rx={4} fill="var(--cor-tijolo-nome)" stroke={contorno} strokeWidth={3.5} />
              <path d="M39 95 H81" stroke="var(--cor-brilho)" strokeWidth={3} strokeLinecap="round" />
            </g>
          ) : null}
          <g className={styles.nadadeiraEsquerda}>
            <path d="M18 76 C5 88 5 110 15 116 C23 108 27 92 25 78 Z" fill="var(--cor-pinguim-corpo-sombra)" stroke={contorno} strokeWidth={3.5} />
          </g>
          <g className={styles.nadadeiraDireita}>
            <path d="M102 76 C115 88 115 110 105 116 C97 108 93 92 95 78 Z" fill="var(--cor-pinguim-corpo-sombra)" stroke={contorno} strokeWidth={3.5} />
          </g>
          {capacete ? (
            <g>
              <path d="M33 31 C33 7 87 7 87 31 Z" fill="var(--cor-pinguim-capacete)" stroke={contorno} strokeWidth={3.5} />
              <rect x={55} y={11} width={10} height={19} rx={4} fill="var(--cor-pinguim-bico-sombra)" />
              <rect x={25} y={27} width={70} height={8} rx={4} fill="var(--cor-pinguim-capacete)" stroke={contorno} strokeWidth={3.5} />
            </g>
          ) : null}
        </g>
      </g>
    </g>
  );
}

export interface PinguimProps {
  pose?: PoseDoPinguim;
  capacete?: boolean;
  olhandoPara?: 'direita' | 'esquerda';
  rotulo?: string;
}

/** Pinguim avulso, num <svg> próprio. */
export function Pinguim({ pose = 'parado', capacete = false, olhandoPara = 'direita', rotulo }: PinguimProps) {
  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${TAMANHO_DO_PINGUIM.largura} ${TAMANHO_DO_PINGUIM.altura}`}
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
    >
      <CorpoDoPinguim pose={pose} capacete={capacete} olhandoPara={olhandoPara} />
    </svg>
  );
}

/** Pinguim dentro de outro SVG, com os pés em (x, y). */
export function PinguimNoMapa({
  x,
  y,
  escala = 1,
  pose = 'parado',
  capacete = false,
  olhandoPara = 'direita',
}: PinguimProps & { x: number; y: number; escala?: number }) {
  return (
    <g transform={`translate(${x - 60 * escala} ${y - 146 * escala}) scale(${escala})`} aria-hidden="true">
      <CorpoDoPinguim pose={pose} capacete={capacete} olhandoPara={olhandoPara} />
    </g>
  );
}
