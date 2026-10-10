// A cena da obra. Cada fiada da parede é uma linha do programa (a primeira linha é o alicerce,
// lá embaixo), e cada tijolo é um token dessa linha. O recuo vira tijolos de pedra no começo
// da fiada. Fiadas novas caem como peças de Tetris; o Guglo sobe no andaime junto com a parede.
import type { CSSProperties } from 'react';
import { tokensSignificativos, type CategoriaToken } from '../jogo/tokenizador';
import type { Linha, Obra } from '../jogo/tipos';
import { PinguimNoMapa, type PoseDoPinguim } from './Pinguim';
import styles from './PredioEmConstrucao.module.css';

const LARGURA = 420;
const ALTURA = 520;
const CHAO = 474;
const BASE = 456;
const X0 = 74;
const X1 = 318;
const ALTURA_MAXIMA_DA_PAREDE = 286;
const ALTURA_MAXIMA_DA_FIADA = 34;
const ARGAMASSA = 3;

type CategoriaDaPeca = CategoriaToken | 'recuo';

interface Peca {
  x: number;
  largura: number;
  texto: string;
  categoria: CategoriaDaPeca;
}

const CORES: Record<CategoriaDaPeca, { face: string; rotulo: string }> = {
  'palavra-chave': { face: 'var(--cor-tijolo-palavra-chave)', rotulo: 'var(--cor-tijolo-rotulo-claro)' },
  funcao: { face: 'var(--cor-tijolo-funcao)', rotulo: 'var(--cor-tijolo-rotulo-escuro)' },
  nome: { face: 'var(--cor-tijolo-nome)', rotulo: 'var(--cor-tijolo-rotulo-escuro)' },
  texto: { face: 'var(--cor-tijolo-texto)', rotulo: 'var(--cor-tijolo-rotulo-escuro)' },
  comentario: { face: 'var(--cor-tijolo-texto)', rotulo: 'var(--cor-tijolo-rotulo-escuro)' },
  numero: { face: 'var(--cor-tijolo-numero)', rotulo: 'var(--cor-tijolo-rotulo-escuro)' },
  operador: { face: 'var(--cor-tijolo-simbolo)', rotulo: 'var(--cor-tijolo-rotulo-claro)' },
  pontuacao: { face: 'var(--cor-tijolo-simbolo)', rotulo: 'var(--cor-tijolo-rotulo-claro)' },
  desconhecido: { face: 'var(--cor-tijolo-simbolo)', rotulo: 'var(--cor-tijolo-rotulo-claro)' },
  espaco: { face: 'var(--cor-tijolo-simbolo)', rotulo: 'var(--cor-tijolo-rotulo-claro)' },
  recuo: { face: 'var(--cor-tijolo-recuo)', rotulo: 'var(--cor-tijolo-rotulo-escuro)' },
};

/** Distribui os tokens da linha pela largura da parede, proporcional ao tamanho de cada um. */
export function pecasDaFiada(linha: Linha, largura = X1 - X0): Peca[] {
  const brutas: Array<{ texto: string; categoria: CategoriaDaPeca; peso: number }> = [
    ...Array.from({ length: linha.recuo }, () => ({ texto: '', categoria: 'recuo' as const, peso: 2.2 })),
    ...tokensSignificativos(linha.texto).map((token) => ({
      texto: token.texto,
      categoria: token.categoria,
      // textos longos crescem até um teto, para não espremer os tijolos vizinhos
      peso: Math.max(1.4, Math.min(token.texto.length, 10) * 0.75 + 0.9),
    })),
  ];
  const pesoTotal = brutas.reduce((soma, peca) => soma + peca.peso, 0);
  const util = largura - ARGAMASSA * (brutas.length + 1);
  let x = ARGAMASSA;
  return brutas.map((peca) => {
    const larguraDaPeca = (peca.peso / pesoTotal) * util;
    const resultado = { x, largura: larguraDaPeca, texto: peca.texto, categoria: peca.categoria };
    x += larguraDaPeca + ARGAMASSA;
    return resultado;
  });
}

const FONTE_MINIMA = 8;

/** Encolhe a fonte até o texto caber (com piso); se ainda não couber, corta com reticências. */
function textoQueCabe(texto: string, largura: number, fonteMaxima: number): { texto: string; fonte: number } {
  const fonte = Math.max(FONTE_MINIMA, Math.min(fonteMaxima, (largura - 6) / (Math.max(texto.length, 1) * 0.62)));
  const cabem = Math.floor((largura - 6) / (fonte * 0.62));
  if (cabem >= texto.length) return { texto, fonte };
  return { texto: cabem >= 3 ? `${texto.slice(0, cabem - 1)}…` : '', fonte };
}

function Fiada({ linha, indice, alturaDaFiada, nova }: { linha: Linha; indice: number; alturaDaFiada: number; nova: boolean }) {
  const y = BASE - (indice + 1) * alturaDaFiada;
  const tamanhoDaFonte = Math.min(13, alturaDaFiada * 0.42);
  const mostrarTexto = alturaDaFiada >= 18;
  return (
    <g transform={`translate(${X0} ${y})`}>
      {pecasDaFiada(linha).map((peca, ordem) => {
        const cores = CORES[peca.categoria];
        const altura = alturaDaFiada - ARGAMASSA;
        const { texto, fonte } = mostrarTexto ? textoQueCabe(peca.texto, peca.largura, tamanhoDaFonte) : { texto: '', fonte: 0 };
        return (
          <g
            key={ordem}
            className={nova ? styles.cair : undefined}
            style={nova ? ({ '--atraso': `${ordem * 45}ms` } as CSSProperties) : undefined}
          >
            <rect
              x={peca.x}
              y={ARGAMASSA / 2}
              width={peca.largura}
              height={altura}
              rx={3}
              fill={cores.face}
              stroke="var(--cor-ilustra-contorno)"
              strokeWidth={2}
            />
            <rect x={peca.x + 3} y={ARGAMASSA / 2 + 3} width={Math.max(0, peca.largura - 6)} height={2.5} rx={1.2} fill="var(--cor-brilho)" />
            {texto ? (
              <text
                x={peca.x + peca.largura / 2}
                y={ARGAMASSA / 2 + altura / 2 + 1}
                fontSize={fonte}
                fill={cores.rotulo}
                className={styles.textoDoTijolo}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {texto}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function Telhado({ topo, concluida }: { topo: number; concluida: boolean }) {
  const meio = (X0 + X1) / 2;
  const pico = topo - 72;
  if (!concluida) {
    return (
      <path
        d={`M${X0 - 14} ${topo} L${meio} ${pico} L${X1 + 14} ${topo}`}
        fill="none"
        stroke="var(--cor-ilustra-fantasma)"
        strokeWidth={2}
        strokeDasharray="7 6"
      />
    );
  }
  return (
    <g className={styles.telhado}>
      <rect x={X1 - 62} y={pico + 14} width={20} height={44} fill="var(--cor-tijolo-palavra-chave)" stroke="var(--cor-ilustra-contorno)" strokeWidth={3} />
      <path d={`M${X0 - 18} ${topo + 2} L${meio} ${pico} L${X1 + 18} ${topo + 2} Z`} fill="var(--cor-ilustra-telhado)" stroke="var(--cor-ilustra-contorno)" strokeWidth={4} strokeLinejoin="round" />
      {[0.33, 0.66].map((fracao) => (
        <path
          key={fracao}
          d={`M${X0 - 18 + (meio - X0 + 18) * fracao} ${topo + 2 - (topo + 2 - pico) * fracao} L${X1 + 18 - (X1 + 18 - meio) * fracao} ${topo + 2 - (topo + 2 - pico) * fracao}`}
          stroke="var(--cor-ilustra-contorno)"
          strokeWidth={2}
          opacity={0.4}
        />
      ))}
      <line x1={meio} y1={pico} x2={meio} y2={pico - 40} stroke="var(--cor-ilustra-contorno)" strokeWidth={3} />
      <path className={styles.bandeira} d={`M${meio} ${pico - 40} L${meio + 30} ${pico - 32} L${meio} ${pico - 24} Z`} fill="var(--cor-acento)" stroke="var(--cor-ilustra-contorno)" strokeWidth={2.5} />
    </g>
  );
}

function Confete() {
  return (
    <g className={styles.confete} aria-hidden="true">
      {Array.from({ length: 16 }, (_, indice) => (
        <rect
          key={indice}
          x={30 + ((indice * 97) % 360)}
          y={-20}
          width={14}
          height={7}
          rx={1.5}
          fill={indice % 3 === 0 ? 'var(--cor-aviso)' : indice % 3 === 1 ? 'var(--cor-acento)' : 'var(--cor-sucesso)'}
          stroke="var(--cor-ilustra-contorno)"
          strokeWidth={1.5}
          style={{ '--atraso': `${(indice % 8) * 90}ms`, '--giro': `${(indice % 2 ? 1 : -1) * (200 + indice * 20)}deg` } as CSSProperties}
        />
      ))}
    </g>
  );
}

export interface PredioEmConstrucaoProps {
  obra: Obra;
  linhas: Linha[];
  quantasNovas: number;
  pose: PoseDoPinguim;
  eventoDoPinguim: number;
  concluida: boolean;
}

export function PredioEmConstrucao({ obra, linhas, quantasNovas, pose, eventoDoPinguim, concluida }: PredioEmConstrucaoProps) {
  const alturaDaFiada = Math.min(ALTURA_MAXIMA_DA_FIADA, ALTURA_MAXIMA_DA_PAREDE / obra.totalLinhas);
  const topo = BASE - alturaDaFiada * obra.totalLinhas;
  const topoConstruido = BASE - alturaDaFiada * linhas.length;
  const primeiraNova = linhas.length - quantasNovas;
  const subida = linhas.length === 0 ? 0 : topoConstruido - CHAO;
  const proxima = !concluida && linhas.length < obra.totalLinhas ? linhas.length : null;
  const descricao = `${obra.nome}: ${linhas.length} de ${obra.totalLinhas} fiadas assentadas${concluida ? ', obra concluída' : ''}.`;

  return (
    <svg className={styles.cena} viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label={descricao} preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="ceu-da-obra" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--cor-ilustra-ceu-topo)' }} />
          <stop offset="1" style={{ stopColor: 'var(--cor-ilustra-ceu-horizonte)' }} />
        </linearGradient>
      </defs>
      <rect width={LARGURA} height={ALTURA} fill="url(#ceu-da-obra)" />
      <circle cx={352} cy={70} r={30} fill="var(--cor-ilustra-sol)" stroke="var(--cor-ilustra-contorno)" strokeWidth={3} />
      <g className={styles.nuvens} fill="var(--cor-ilustra-nuvem)" stroke="var(--cor-ilustra-contorno)" strokeWidth={2.5}>
        <path d="M40 92 a16 16 0 0 1 28 -12 a20 20 0 0 1 36 6 a14 14 0 0 1 4 26 h-62 a12 12 0 0 1 -6 -20 Z" />
        <path d="M232 52 a12 12 0 0 1 22 -9 a15 15 0 0 1 27 5 a11 11 0 0 1 3 20 h-47 a9 9 0 0 1 -5 -16 Z" />
      </g>
      <path d="M0 410 Q90 350 190 392 T420 380 V474 H0 Z" fill="var(--cor-ilustra-colina-longe)" />

      {/* poste do andaime: sobe junto com a plataforma; a parte de baixo some atrás do chão */}
      {linhas.length > 0 ? (
        <g className={styles.andaime} style={{ transform: `translateY(${subida}px)` }}>
          <rect x={X1 + 44} y={CHAO} width={7} height={420} fill="var(--cor-ilustra-andaime)" stroke="var(--cor-ilustra-contorno)" strokeWidth={2} />
        </g>
      ) : null}

      <rect x={0} y={CHAO} width={LARGURA} height={ALTURA - CHAO} fill="var(--cor-ilustra-chao)" />
      <rect x={0} y={CHAO} width={LARGURA} height={5} fill="var(--cor-ilustra-chao-sombra)" />

      {/* pilha de tijolos no chão */}
      <g stroke="var(--cor-ilustra-contorno)" strokeWidth={2} fill="var(--cor-tijolo-nome)">
        <rect x={12} y={CHAO - 14} width={24} height={12} rx={2} />
        <rect x={38} y={CHAO - 14} width={24} height={12} rx={2} />
        <rect x={25} y={CHAO - 27} width={24} height={12} rx={2} />
      </g>

      {/* planta fantasma do prédio inteiro */}
      <rect x={X0} y={topo} width={X1 - X0} height={BASE - topo} fill="none" stroke="var(--cor-ilustra-fantasma)" strokeWidth={2} strokeDasharray="7 6" />
      <Telhado topo={topo} concluida={concluida} />

      {/* alicerce */}
      <rect x={X0 - 10} y={BASE} width={X1 - X0 + 20} height={CHAO - BASE + 2} fill="var(--cor-tijolo-simbolo)" stroke="var(--cor-ilustra-contorno)" strokeWidth={3} />

      {linhas.length > 0 ? (
        <rect x={X0} y={topoConstruido} width={X1 - X0} height={BASE - topoConstruido} fill="var(--cor-argamassa)" />
      ) : null}

      {linhas.map((linha, indice) => (
        <Fiada key={indice} linha={linha} indice={indice} alturaDaFiada={alturaDaFiada} nova={indice >= primeiraNova} />
      ))}

      {linhas.map((_, indice) => (
        <text key={indice} x={X0 - 8} y={BASE - (indice + 0.5) * alturaDaFiada} className={styles.numeroDaFiada} textAnchor="end" dominantBaseline="central">
          {indice + 1}
        </text>
      ))}

      {proxima !== null ? (
        <rect
          className={styles.proximaFiada}
          x={X0}
          y={BASE - (proxima + 1) * alturaDaFiada}
          width={X1 - X0}
          height={alturaDaFiada}
          rx={3}
        />
      ) : null}

      {/* plataforma do andaime com o Guglo */}
      <g className={styles.andaime} style={{ transform: `translateY(${subida}px)` }}>
        {linhas.length > 0 ? (
          <rect x={X1 + 4} y={CHAO - 4} width={86} height={9} rx={2} fill="var(--cor-ilustra-andaime)" stroke="var(--cor-ilustra-contorno)" strokeWidth={2.5} />
        ) : null}
        <PinguimNoMapa key={eventoDoPinguim} x={X1 + 48} y={CHAO - 4} escala={0.5} pose={pose} capacete olhandoPara="esquerda" />
      </g>

      {concluida ? <Confete key="confete" /> : null}
    </svg>
  );
}
