// O mapa da cidade: uma estrada em zigue-zague liga os três bairros, do básico ao avançado.
// O Guglo caminha pela estrada até a obra escolhida, como no Club Penguin.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { prefereMenosMovimento } from '../estado/usePython';
import type { Obra } from '../jogo/tipos';
import { PinguimNoMapa } from './Pinguim';
import { MEDIDAS, PredioDaCidade, type SituacaoDoPredio } from './PredioDaCidade';
import styles from './MapaDaCidade.module.css';

const C = 'var(--cor-ilustra-contorno)';
const LARGURA = 1600;
const ALTURA = 1000;
const ESTRADA = 'M40 940 H1440 A130 130 0 0 0 1440 680 H160 A130 130 0 0 1 160 420 H1560';
const VELOCIDADE = 620;
const DURACAO_MAXIMA = 2.4;

interface Lugar {
  x: number;
  /** Pé da porta; a estrada passa logo à frente. */
  y: number;
  escala: number;
  estrada: number;
}

export const LUGARES: Lugar[] = [
  { x: 300, y: 906, escala: 1, estrada: 940 },
  { x: 622, y: 906, escala: 1, estrada: 940 },
  { x: 948, y: 906, escala: 1, estrada: 940 },
  { x: 1270, y: 906, escala: 1, estrada: 940 },
  { x: 1250, y: 646, escala: 0.86, estrada: 680 },
  { x: 915, y: 646, escala: 0.86, estrada: 680 },
  { x: 585, y: 646, escala: 0.86, estrada: 680 },
  { x: 380, y: 388, escala: 0.74, estrada: 420 },
  { x: 690, y: 388, escala: 0.74, estrada: 420 },
  { x: 1000, y: 388, escala: 0.74, estrada: 420 },
];

const TERRENOS_EM_BREVE = [
  { x: 1290, y: 388, escala: 0.74, modelo: 'casa' as const },
  { x: 1480, y: 388, escala: 0.74, modelo: 'armazem' as const },
];

const ARVORES: Array<[number, number, number]> = [
  [452, 880, 0.82],
  [786, 884, 0.8],
  [1110, 880, 0.82],
  [1420, 870, 1],
  [1080, 620, 0.8],
  [752, 622, 0.75],
  [420, 610, 0.8],
  [230, 600, 0.9],
  [540, 368, 0.7],
  [850, 366, 0.7],
  [1150, 368, 0.68],
];

const BAIRROS = [
  { x: 92, y: 902, texto: 'Vila do Alicerce', subtitulo: 'básico' },
  { x: 1478, y: 644, texto: 'Centro', subtitulo: 'intermediário' },
  { x: 175, y: 384, texto: 'Alto da Colina', subtitulo: 'avançado' },
];

export interface ObraNoMapa {
  obra: Obra;
  situacao: SituacaoDoPredio;
  progresso: number;
}

function Arvore({ x, y, escala }: { x: number; y: number; escala: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`} aria-hidden="true">
      <rect x={-6} y={-40} width={12} height={40} fill="var(--cor-ilustra-tronco)" stroke={C} strokeWidth={3} />
      <circle cx={0} cy={-62} r={30} fill="var(--cor-ilustra-arvore)" stroke={C} strokeWidth={3.5} />
      <circle cx={-10} cy={-70} r={9} fill="var(--cor-ilustra-colina-longe)" opacity={0.6} />
    </g>
  );
}

function Placa({ x, y, texto, subtitulo }: { x: number; y: number; texto: string; subtitulo: string }) {
  const largura = Math.max(texto.length, subtitulo.length) * 11 + 30;
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <rect x={-4} y={-44} width={8} height={44} fill="var(--cor-ilustra-tronco)" stroke={C} strokeWidth={2.5} />
      <rect x={-largura / 2} y={-92} width={largura} height={50} rx={6} fill="var(--cor-ilustra-placa)" stroke={C} strokeWidth={3} />
      <text x={0} y={-74} className={styles.placaTitulo} textAnchor="middle" dominantBaseline="central">
        {texto}
      </text>
      <text x={0} y={-54} className={styles.placaSubtitulo} textAnchor="middle" dominantBaseline="central">
        {subtitulo}
      </text>
    </g>
  );
}

function Parque() {
  return (
    <g aria-hidden="true">
      <ellipse cx={330} cy={622} rx={70} ry={20} fill="var(--cor-ilustra-agua)" stroke={C} strokeWidth={3.5} />
      <ellipse cx={330} cy={618} rx={46} ry={11} fill="var(--cor-ilustra-agua-brilho)" />
      <rect x={322} y={570} width={16} height={48} rx={4} fill="var(--cor-ilustra-placa)" stroke={C} strokeWidth={3} />
      <g className={styles.jato} fill="var(--cor-ilustra-agua-brilho)" stroke={C} strokeWidth={2}>
        <circle cx={330} cy={562} r={9} />
        <circle cx={316} cy={576} r={5} />
        <circle cx={344} cy={576} r={5} />
      </g>
    </g>
  );
}

interface Posicao {
  x: number;
  y: number;
  olhandoPara: 'direita' | 'esquerda';
  andando: boolean;
}

export interface MapaDaCidadeProps {
  obras: ObraNoMapa[];
  selecionada: string | null;
  proximaAConstruir: string | null;
  aoSelecionar: (obra: Obra) => void;
  aoEntrar: (obra: Obra) => void;
}

export function MapaDaCidade({ obras, selecionada, proximaAConstruir, aoSelecionar, aoEntrar }: MapaDaCidadeProps) {
  const estrada = useRef<SVGPathElement>(null);
  const paradas = useRef<number[]>([]);
  const atual = useRef(0);
  const direcao = useRef<'direita' | 'esquerda'>('direita');
  const [posicao, setPosicao] = useState<Posicao>({ x: 60, y: 940, olhandoPara: 'direita', andando: false });
  const indiceSelecionado = obras.findIndex((item) => item.obra.id === selecionada);

  // Onde cada porta encosta na estrada (comprimento ao longo do caminho).
  useLayoutEffect(() => {
    const caminho = estrada.current;
    if (!caminho) return;
    const total = caminho.getTotalLength();
    paradas.current = LUGARES.map((lugar) => {
      let melhor = 0;
      let menorDistancia = Infinity;
      for (let s = 0; s <= total; s += 4) {
        const ponto = caminho.getPointAtLength(s);
        const distancia = Math.hypot(ponto.x - lugar.x, ponto.y - lugar.estrada);
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          melhor = s;
        }
      }
      return melhor;
    });
  }, []);

  // Caminhada até a obra selecionada.
  useEffect(() => {
    const caminho = estrada.current;
    const destino = indiceSelecionado >= 0 ? paradas.current[indiceSelecionado] : undefined;
    if (!caminho || destino === undefined) return;
    const inicio = atual.current;
    const distancia = Math.abs(destino - inicio);
    const ponto = (s: number) => caminho.getPointAtLength(s);
    if (distancia < 1 || prefereMenosMovimento()) {
      atual.current = destino;
      const final = ponto(destino);
      const quadro = requestAnimationFrame(() => setPosicao((anterior) => ({ ...anterior, x: final.x, y: final.y, andando: false })));
      return () => cancelAnimationFrame(quadro);
    }
    const duracao = Math.min(DURACAO_MAXIMA, distancia / VELOCIDADE) * 1000;
    const total = caminho.getTotalLength();
    const sentido = Math.sign(destino - inicio);
    const comeco = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - comeco) / duracao);
      const suave = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const s = inicio + (destino - inicio) * suave;
      const aqui = ponto(s);
      const adiante = ponto(Math.min(total, Math.max(0, s + sentido * 2)));
      if (adiante.x < aqui.x - 0.1) direcao.current = 'esquerda';
      else if (adiante.x > aqui.x + 0.1) direcao.current = 'direita';
      atual.current = s;
      setPosicao({ x: aqui.x, y: aqui.y, olhandoPara: direcao.current, andando: t < 1 });
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [indiceSelecionado]);

  const aoTeclar = (evento: KeyboardEvent<SVGGElement>, item: ObraNoMapa) => {
    if (evento.key !== 'Enter' && evento.key !== ' ') return;
    evento.preventDefault();
    if (item.obra.id === selecionada && item.situacao !== 'bloqueado') aoEntrar(item.obra);
    else aoSelecionar(item.obra);
  };

  const proxima = obras.find((item) => item.obra.id === proximaAConstruir);
  const lugarDaProxima = proxima ? LUGARES[obras.indexOf(proxima)] : undefined;

  return (
    <svg className={styles.mapa} viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="group" aria-label="Mapa da cidade">
      <defs>
        <linearGradient id="ceu-da-cidade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--cor-ilustra-ceu-topo)' }} />
          <stop offset="1" style={{ stopColor: 'var(--cor-ilustra-ceu-horizonte)' }} />
        </linearGradient>
      </defs>
      <rect width={LARGURA} height={ALTURA} fill="url(#ceu-da-cidade)" />
      <circle cx={1450} cy={110} r={54} fill="var(--cor-ilustra-sol)" stroke={C} strokeWidth={4} />
      <g className={styles.nuvens} fill="var(--cor-ilustra-nuvem)" stroke={C} strokeWidth={3}>
        <path d="M150 120 a28 28 0 0 1 50 -20 a34 34 0 0 1 62 10 a24 24 0 0 1 6 44 h-108 a20 20 0 0 1 -10 -34 Z" />
        <path d="M620 80 a22 22 0 0 1 40 -16 a27 27 0 0 1 48 8 a19 19 0 0 1 5 34 h-84 a16 16 0 0 1 -9 -26 Z" />
        <path d="M1080 150 a20 20 0 0 1 36 -14 a24 24 0 0 1 44 7 a17 17 0 0 1 4 31 h-76 a14 14 0 0 1 -8 -24 Z" />
      </g>
      <path d="M0 300 Q200 220 420 280 T860 270 T1260 250 T1600 280 V420 H0 Z" fill="var(--cor-ilustra-colina-longe)" stroke={C} strokeWidth={3} />
      <path d="M0 330 H1600 V1000 H0 Z" fill="var(--cor-ilustra-chao)" />
      <path d="M0 330 Q400 300 800 324 T1600 318" fill="none" stroke={C} strokeWidth={3} />
      <rect x={0} y={330} width={LARGURA} height={6} fill="var(--cor-ilustra-chao-sombra)" />

      <g aria-hidden="true">
        <path d={ESTRADA} fill="none" stroke="var(--cor-ilustra-estrada-borda)" strokeWidth={66} strokeLinecap="round" strokeLinejoin="round" />
        <path ref={estrada} d={ESTRADA} fill="none" stroke="var(--cor-ilustra-estrada)" strokeWidth={56} strokeLinecap="round" strokeLinejoin="round" />
        <path d={ESTRADA} fill="none" stroke="var(--cor-ilustra-faixa)" strokeWidth={5} strokeDasharray="26 22" />
      </g>

      <Parque />
      {BAIRROS.map((bairro) => (
        <Placa key={bairro.texto} {...bairro} />
      ))}

      {TERRENOS_EM_BREVE.map((terreno) => (
        <g key={terreno.x} transform={`translate(${terreno.x} ${terreno.y}) scale(${terreno.escala})`} aria-hidden="true">
          <PredioDaCidade modelo={terreno.modelo} situacao="bloqueado" progresso={0} idUnico={`em-breve-${terreno.x}`} emBreve />
        </g>
      ))}

      {[...ARVORES].sort((a, b) => a[1] - b[1]).map(([x, y, escala]) => (
        <Arvore key={`${x}-${y}`} x={x} y={y} escala={escala} />
      ))}

      {obras.map((item, indice) => {
        const lugar = LUGARES[indice];
        if (!lugar) return null;
        const { obra, situacao } = item;
        const medidas = MEDIDAS[obra.modelo];
        const escolhida = obra.id === selecionada;
        const rotuloDaSituacao = {
          bloqueado: 'bloqueada',
          disponivel: 'disponível',
          'em-obra': `em obra, ${Math.round(item.progresso * 100)}%`,
          concluido: 'concluída',
        }[situacao];
        return (
          <g
            key={obra.id}
            className={`${styles.lugar} ${escolhida ? styles.escolhido : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`${obra.ordem}. ${obra.nome}: ${obra.conceito}, ${rotuloDaSituacao}`}
            aria-pressed={escolhida}
            onClick={() => (escolhida && situacao !== 'bloqueado' ? aoEntrar(obra) : aoSelecionar(obra))}
            onKeyDown={(evento) => aoTeclar(evento, item)}
          >
            <g transform={`translate(${lugar.x} ${lugar.y}) scale(${lugar.escala})`}>
              <ellipse className={styles.anel} cx={0} cy={4} rx={medidas.largura / 2 + 34} ry={22} />
              <rect
                className={styles.areaDeToque}
                x={-medidas.largura / 2 - 20}
                y={-medidas.altura - 90}
                width={medidas.largura + 40}
                height={medidas.altura + 100}
              />
              <g className={styles.desenho}>
                <PredioDaCidade modelo={obra.modelo} situacao={situacao} progresso={item.progresso} idUnico={obra.id} />
              </g>
              <g transform={`translate(${-medidas.largura / 2 - 22} -18)`}>
                <circle r={16} fill={situacao === 'concluido' ? 'var(--cor-sucesso)' : 'var(--cor-ilustra-placa)'} stroke={C} strokeWidth={3} />
                <text className={styles.numero} textAnchor="middle" dominantBaseline="central">
                  {obra.ordem}
                </text>
              </g>
            </g>
          </g>
        );
      })}

      {lugarDaProxima && proxima ? (
        <g
          transform={`translate(${lugarDaProxima.x} ${lugarDaProxima.y - (MEDIDAS[proxima.obra.modelo].altura + 78) * lugarDaProxima.escala})`}
          aria-hidden="true"
        >
          <g className={styles.exclamacao}>
            <circle r={20} fill="var(--cor-ilustra-destaque)" stroke={C} strokeWidth={4} />
            <text className={styles.exclamacaoTexto} textAnchor="middle" dominantBaseline="central">
              !
            </text>
          </g>
        </g>
      ) : null}

      <PinguimNoMapa x={posicao.x} y={posicao.y + 18} escala={0.5} pose={posicao.andando ? 'andando' : 'parado'} olhandoPara={posicao.olhandoPara} />
    </svg>
  );
}
