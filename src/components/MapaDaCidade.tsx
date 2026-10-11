// O mapa da cidade: a arte em pixel da Vila (ADR-0006) com o estado de cada obra desenhado por cima.
// O Guglo pixelado caminha pela estrada até a obra escolhida, como no Club Penguin.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { prefereMenosMovimento } from '../estado/usePython';
import type { Obra } from '../jogo/tipos';
import arteDoMapa from '../assets/mapa-da-cidade.webp';
import outdoorAnuncie from '../assets/outdoor-anuncie.png';
import { CADENCIA_DO_GUGLO_MS, COMEMORACAO_COMPLETA, GugloPixeladoNoMapa, QUADROS_DO_GUGLO } from './GugloPixelado';
import type { SituacaoDoPredio } from './PredioDaCidade';
import styles from './MapaDaCidade.module.css';

/** Tamanho da arte; o viewBox usa os pixels dela, então as coordenadas abaixo são medidas na própria imagem. */
const LARGURA = 1619;
const ALTURA = 971;

/** Linha central da estrada, da placa da Vila do Alicerce até o fim do Alto da Colina. */
const ESTRADA =
  'M150 752 C164 758 205 780 235 788 C265 796 302 796 330 797 C358 798 388 797 400 797 H1370 ' +
  'C1380 797 1410 799 1430 797 C1450 795 1471 795 1488 786 C1505 777 1523 760 1532 744 ' +
  'C1541 728 1542 708 1540 690 C1538 672 1529 649 1519 634 C1509 619 1495 608 1480 598 ' +
  'C1465 588 1448 580 1430 576 C1412 572 1380 574 1370 573 H400 ' +
  'C388 572 352 572 330 570 C308 568 290 567 270 558 C250 549 226 533 208 517 ' +
  'C190 501 174 480 165 460 C156 440 153 420 157 400 C161 380 174 355 190 343 ' +
  'C206 331 227 328 250 328 C273 328 305 340 330 345 C355 350 388 357 400 359 H1520';
const VELOCIDADE = 620;
const DURACAO_MAXIMA = 2.4;

const ESCALA_DO_GUGLO = 0.46;
const { parado: PARADO, passos: PASSOS } = QUADROS_DO_GUGLO;

/** O que o Guglo faz ao chegar: acena numa obra a fazer e comemora numa obra pronta. Depois, fica parado. */
const CHEGADAS = {
  acenando: { quadros: [QUADROS_DO_GUGLO.acenando], cadenciaMs: 1100 },
  comemorando: {
    quadros: [...COMEMORACAO_COMPLETA, ...Array<number>(4).fill(QUADROS_DO_GUGLO.bracosParaCima)],
    cadenciaMs: CADENCIA_DO_GUGLO_MS.comemoracao,
  },
};

interface Lugar {
  /** Terreno na arte: canto superior esquerdo e tamanho. Também é a área de toque. */
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** Selo com o número, por cima do número impresso na arte. */
  selo: [number, number];
  /** Onde o Guglo para, na estrada em frente ao terreno. */
  parada: [number, number];
}

/**
 * Terrenos na ordem da estrada: Vila do Alicerce (1–4), Centro (5–7, da direita para a esquerda) e
 * Alto da Colina (8–10). A arte não tem o 5: o terreno marcado "6" é a obra 5 e as lojas são a 6.
 */
export const LUGARES: Lugar[] = [
  { x: 560, y: 640, largura: 165, altura: 120, selo: [587, 746], parada: [642, 797] },
  { x: 770, y: 605, largura: 185, altura: 155, selo: [790, 735], parada: [862, 797] },
  { x: 1010, y: 620, largura: 195, altura: 140, selo: [1033, 741], parada: [1107, 797] },
  { x: 1265, y: 600, largura: 200, altura: 155, selo: [1292, 743], parada: [1368, 797] },
  { x: 1180, y: 390, largura: 150, altura: 140, selo: [1203, 515], parada: [1255, 573] },
  { x: 845, y: 372, largura: 205, altura: 156, selo: [866, 512], parada: [948, 573] },
  { x: 270, y: 395, largura: 185, altura: 135, selo: [299, 516], parada: [362, 572] },
  { x: 340, y: 185, largura: 210, altura: 137, selo: [360, 308], parada: [445, 360] },
  { x: 605, y: 195, largura: 210, altura: 135, selo: [627, 312], parada: [710, 359] },
  { x: 910, y: 150, largura: 225, altura: 175, selo: [944, 314], parada: [1022, 359] },
];

/** A casa no fim do Alto da Colina guarda o lugar das próximas obras. */
const EM_BREVE: [number, number] = [1365, 330];

/** Outdoor da própria Vila (ADR-0008): o Guglo com a placa, na beira da estrada do Alto da Colina; pés em (x, y). */
const OUTDOOR = { x: 1205, y: 330, lado: 116 };

const RAIO_DO_SELO = 21;

export interface ObraNoMapa {
  obra: Obra;
  situacao: SituacaoDoPredio;
  progresso: number;
}

interface Posicao {
  x: number;
  y: number;
  olhandoPara: 'direita' | 'esquerda';
  quadro: number;
}

function Selo({ item, lugar }: { item: ObraNoMapa; lugar: Lugar }) {
  const [x, y] = lugar.selo;
  const { situacao, progresso, obra } = item;
  return (
    <g className={styles[`selo-${situacao}`]} transform={`translate(${x} ${y})`}>
      <circle className={styles.seloFundo} r={RAIO_DO_SELO} />
      {situacao === 'em-obra' ? (
        <circle
          className={styles.seloProgresso}
          r={RAIO_DO_SELO}
          pathLength={100}
          strokeDasharray={`${Math.max(4, Math.round(progresso * 100))} 100`}
          transform="rotate(-90)"
        />
      ) : null}
      <text className={styles.numero} textAnchor="middle" dominantBaseline="central">
        {obra.ordem}
      </text>
      {situacao === 'bloqueado' ? (
        <g className={styles.cadeado} transform="translate(15 -15)">
          <circle r={10} />
          <path d="M-4 -1 V-4 A4 4 0 0 1 4 -4 V-1" fill="none" />
          <rect x={-6} y={-1} width={12} height={8} rx={2} />
        </g>
      ) : null}
      {situacao === 'concluido' ? (
        <g className={styles.concluida} transform="translate(15 -15)">
          <circle r={10} />
          <path d="M-5 0 L-1.5 3.5 L5 -3.5" fill="none" />
        </g>
      ) : null}
    </g>
  );
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
  const [posicao, setPosicao] = useState<Posicao>({ x: 150, y: 752, olhandoPara: 'direita', quadro: PARADO });
  const indiceSelecionado = obras.findIndex((item) => item.obra.id === selecionada);

  // Onde cada terreno encosta na estrada (comprimento ao longo do caminho).
  useLayoutEffect(() => {
    const caminho = estrada.current;
    if (!caminho) return;
    const total = caminho.getTotalLength();
    paradas.current = LUGARES.map(({ parada: [x, y] }) => {
      let melhor = 0;
      let menorDistancia = Infinity;
      for (let s = 0; s <= total; s += 4) {
        const ponto = caminho.getPointAtLength(s);
        const distancia = Math.hypot(ponto.x - x, ponto.y - y);
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          melhor = s;
        }
      }
      return melhor;
    });
  }, []);

  const destinoConcluido = obras[indiceSelecionado]?.situacao === 'concluido';

  // Caminhada até a obra selecionada; na chegada, o Guglo acena, ou comemora se a obra está pronta.
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
      const pedido = requestAnimationFrame(() => setPosicao((anterior) => ({ ...anterior, x: final.x, y: final.y, quadro: PARADO })));
      return () => cancelAnimationFrame(pedido);
    }
    const duracao = Math.min(DURACAO_MAXIMA, distancia / VELOCIDADE) * 1000;
    const chegada = destinoConcluido ? CHEGADAS.comemorando : CHEGADAS.acenando;
    const total = caminho.getTotalLength();
    const sentido = Math.sign(destino - inicio);
    const comeco = performance.now();
    let pedido = 0;
    const passo = (agora: number) => {
      // O carimbo do requestAnimationFrame pode vir um pouco antes de `comeco`.
      const decorrido = Math.max(0, agora - comeco);
      const t = Math.min(1, decorrido / duracao);
      const suave = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const s = inicio + (destino - inicio) * suave;
      const aqui = ponto(s);
      const adiante = ponto(Math.min(total, Math.max(0, s + sentido * 2)));
      if (adiante.x < aqui.x - 0.1) direcao.current = 'esquerda';
      else if (adiante.x > aqui.x + 0.1) direcao.current = 'direita';
      atual.current = s;
      const quadro =
        t < 1
          ? (PASSOS[Math.floor(decorrido / CADENCIA_DO_GUGLO_MS.passos) % PASSOS.length] ?? PARADO)
          : (chegada.quadros[Math.floor((decorrido - duracao) / chegada.cadenciaMs)] ?? PARADO);
      setPosicao({ x: aqui.x, y: aqui.y, olhandoPara: direcao.current, quadro });
      if (quadro !== PARADO) pedido = requestAnimationFrame(passo);
    };
    pedido = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(pedido);
  }, [indiceSelecionado, destinoConcluido]);

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
        <filter id="terreno-bloqueado">
          <feColorMatrix type="saturate" values="0.15" />
        </filter>
        {LUGARES.map((lugar, indice) => (
          <clipPath key={indice} id={`terreno-${indice}`}>
            <rect x={lugar.x} y={lugar.y} width={lugar.largura} height={lugar.altura} rx={14} />
          </clipPath>
        ))}
      </defs>
      <image href={arteDoMapa} width={LARGURA} height={ALTURA} />
      <path ref={estrada} d={ESTRADA} fill="none" stroke="none" />

      {/* Terreno bloqueado: a própria arte, sem cor. */}
      {obras.map((item, indice) =>
        item.situacao === 'bloqueado' && LUGARES[indice] ? (
          <g key={item.obra.id} aria-hidden="true">
            <image
              href={arteDoMapa}
              width={LARGURA}
              height={ALTURA}
              clipPath={`url(#terreno-${indice})`}
              filter="url(#terreno-bloqueado)"
            />
            <rect
              className={styles.veu}
              x={LUGARES[indice].x}
              y={LUGARES[indice].y}
              width={LUGARES[indice].largura}
              height={LUGARES[indice].altura}
              rx={14}
            />
          </g>
        ) : null,
      )}

      <g className={styles.emBreve} transform={`translate(${EM_BREVE[0]} ${EM_BREVE[1]})`} aria-hidden="true">
        <rect x={-48} y={-15} width={96} height={30} rx={15} />
        <text textAnchor="middle" dominantBaseline="central">
          em breve
        </text>
      </g>

      {obras.map((item, indice) => {
        const lugar = LUGARES[indice];
        if (!lugar) return null;
        const { obra, situacao } = item;
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
            <rect className={styles.terreno} x={lugar.x} y={lugar.y} width={lugar.largura} height={lugar.altura} rx={14} />
            <Selo item={item} lugar={lugar} />
          </g>
        );
      })}

      {/* Depois das obras: no Tab, quem usa teclado chega primeiro nelas. */}
      <a href="#/anuncie" className={styles.outdoor} aria-label="Anuncie aqui: espaços para marcas no Brick by Brick">
        <rect
          className={styles.realceDoOutdoor}
          x={OUTDOOR.x - OUTDOOR.lado / 2 - 6}
          y={OUTDOOR.y - OUTDOOR.lado - 6}
          width={OUTDOOR.lado + 12}
          height={OUTDOOR.lado + 12}
          rx={14}
        />
        <image href={outdoorAnuncie} x={OUTDOOR.x - OUTDOOR.lado / 2} y={OUTDOOR.y - OUTDOOR.lado} width={OUTDOOR.lado} height={OUTDOOR.lado} />
      </a>

      {lugarDaProxima ? (
        <g transform={`translate(${lugarDaProxima.x + lugarDaProxima.largura / 2} ${lugarDaProxima.y - 6})`} aria-hidden="true">
          <g className={styles.exclamacao}>
            <circle r={20} />
            <text className={styles.exclamacaoTexto} textAnchor="middle" dominantBaseline="central">
              !
            </text>
          </g>
        </g>
      ) : null}

      <GugloPixeladoNoMapa {...posicao} escala={ESCALA_DO_GUGLO} />
    </svg>
  );
}
