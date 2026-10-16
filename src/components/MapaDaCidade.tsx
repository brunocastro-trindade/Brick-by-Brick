// O mapa: a arte em pixel de um mapa (ADR-0006, ADR-0021) com o estado de cada obra desenhado por cima.
// O Guglo pixelado caminha pela estrada até a obra escolhida, como no Club Penguin.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { prefereMenosMovimento } from '../estado/usePython';
import type { Obra } from '../jogo/tipos';
import outdoorAnuncie from '../assets/outdoor-anuncie.png';
import { CADENCIA_DO_GUGLO_MS, COMEMORACAO_COMPLETA, GugloPixeladoNoMapa, QUADROS_DO_GUGLO } from './GugloPixelado';
import type { SituacaoDoPredio } from './PredioDaCidade';
import type { ArteDoMapa, Lugar } from './artesDosMapas';
import styles from './MapaDaCidade.module.css';

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

const RAIO_DO_SELO = 21;

export interface ObraNoMapa {
  obra: Obra;
  situacao: SituacaoDoPredio;
  progresso: number;
  /** Passou na Vistoria (ADR-0016): o selo de concluída ganha o carimbo. */
  vistoriada: boolean;
}

/** A estrada e os terrenos de cada arte são fixos: as paradas se calculam uma vez por sessão, por mapa. */
const paradasDaSessao = new WeakMap<ArteDoMapa, number[]>();
const PASSO_DA_BUSCA = 8;

/**
 * Comprimento, ao longo da estrada, do ponto mais perto de cada terreno. `getPointAtLength` é caro
 * (dezenas de microssegundos a cada chamada): uma passada só, para todos os terrenos, de 8 em 8, e um refino
 * de 1 em 1 em volta de cada achado. Antes eram 10 passadas de 4 em 4, uns 1,3 s travando a tela a cada visita.
 */
function paradasNaEstrada(caminho: SVGPathElement, arte: ArteDoMapa): number[] {
  const guardadas = paradasDaSessao.get(arte);
  if (guardadas) return guardadas;
  const { lugares } = arte;
  const total = caminho.getTotalLength();
  const distancia = (s: number, [x, y]: [number, number]) => {
    const ponto = caminho.getPointAtLength(s);
    return Math.hypot(ponto.x - x, ponto.y - y);
  };
  const achados = lugares.map(() => ({ s: 0, distancia: Infinity }));
  for (let s = 0; s <= total; s += PASSO_DA_BUSCA) {
    const ponto = caminho.getPointAtLength(s);
    lugares.forEach(({ parada: [x, y] }, indice) => {
      const d = Math.hypot(ponto.x - x, ponto.y - y);
      const achado = achados[indice];
      if (achado && d < achado.distancia) achados[indice] = { s, distancia: d };
    });
  }
  const paradas = achados.map(({ s: perto }, indice) => {
    const parada = lugares[indice]?.parada ?? [0, 0];
    let melhor = perto;
    let menor = Infinity;
    for (let s = Math.max(0, perto - PASSO_DA_BUSCA); s <= Math.min(total, perto + PASSO_DA_BUSCA); s += 1) {
      const d = distancia(s, parada);
      if (d < menor) {
        menor = d;
        melhor = s;
      }
    }
    return melhor;
  });
  paradasDaSessao.set(arte, paradas);
  return paradas;
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
        {obra.numero}
      </text>
      {situacao === 'bloqueado' ? (
        <g className={styles.cadeado} transform="translate(15 -15)">
          <circle r={10} />
          <path d="M-4 -1 V-4 A4 4 0 0 1 4 -4 V-1" fill="none" />
          <rect x={-6} y={-1} width={12} height={8} rx={2} />
        </g>
      ) : null}
      {situacao === 'concluido' ? (
        <g className={`${styles.concluida} ${item.vistoriada ? styles.vistoriada : ''}`} transform="translate(15 -15)">
          <circle r={10} />
          {item.vistoriada ? (
            <path d="M-6.5 0 L-3.5 3 L1.5 -3 M-1 1.5 L0.5 3 L6 -3.5" fill="none" />
          ) : (
            <path d="M-5 0 L-1.5 3.5 L5 -3.5" fill="none" />
          )}
        </g>
      ) : null}
    </g>
  );
}

/** A placa que leva ao mapa seguinte: um botão no próprio mapa, com cadeado enquanto ele está fechado. */
function PlacaDoMapaSeguinte({ placa, posicao: [x, y] }: { placa: PlacaDoFim; posicao: [number, number] }) {
  const largura = 28 + placa.nome.length * 15 + (placa.liberado ? 34 : 48);
  const aoTeclar = (evento: KeyboardEvent<SVGGElement>) => {
    if (evento.key !== 'Enter' && evento.key !== ' ') return;
    evento.preventDefault();
    placa.aoAbrir();
  };
  return (
    <g
      className={`${styles.placaDoFim} ${placa.liberado ? '' : styles.placaFechada}`}
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={placa.liberado ? `Ir para ${placa.nome}` : `${placa.nome}: fechada até a cidade ficar pronta`}
      onClick={placa.aoAbrir}
      onKeyDown={aoTeclar}
    >
      <rect x={-largura / 2} y={-25} width={largura} height={50} rx={25} />
      <text x={placa.liberado ? -14 : 12} textAnchor="middle" dominantBaseline="central">
        {placa.nome}
      </text>
      {placa.liberado ? (
        <path d={`M${largura / 2 - 34} -8 L${largura / 2 - 22} 0 L${largura / 2 - 34} 8`} fill="none" />
      ) : (
        <g className={styles.cadeado} transform={`translate(${-largura / 2 + 28} 0) scale(1.3)`}>
          <circle r={10} />
          <path d="M-4 -1 V-4 A4 4 0 0 1 4 -4 V-1" fill="none" />
          <rect x={-6} y={-1} width={12} height={8} rx={2} />
        </g>
      )}
    </g>
  );
}

/** A placa do fim do mapa (ADR-0021): o caminho para o mapa seguinte, com cadeado enquanto ele está fechado. */
export interface PlacaDoFim {
  nome: string;
  liberado: boolean;
  aoAbrir: () => void;
}

export interface MapaDaCidadeProps {
  arte: ArteDoMapa;
  /** Nome do mapa, para quem usa leitor de tela. */
  nome: string;
  /** Sem mapa seguinte, a placa diz "em breve". */
  placaDoFim: PlacaDoFim | null;
  obras: ObraNoMapa[];
  selecionada: string | null;
  proximaAConstruir: string | null;
  aoSelecionar: (obra: Obra) => void;
  aoEntrar: (obra: Obra) => void;
}

export function MapaDaCidade({ arte, nome, placaDoFim, obras, selecionada, proximaAConstruir, aoSelecionar, aoEntrar }: MapaDaCidadeProps) {
  const { imagem, largura, altura, lugares, outdoor } = arte;
  const estrada = useRef<SVGPathElement>(null);
  const paradas = useRef<number[]>([]);
  const atual = useRef(0);
  const direcao = useRef<'direita' | 'esquerda'>('direita');
  const [posicao, setPosicao] = useState<Posicao>({ x: arte.inicioDoGuglo[0], y: arte.inicioDoGuglo[1], olhandoPara: 'direita', quadro: PARADO });
  const indiceSelecionado = obras.findIndex((item) => item.obra.id === selecionada);

  // Onde cada terreno encosta na estrada (comprimento ao longo do caminho).
  useLayoutEffect(() => {
    const caminho = estrada.current;
    if (caminho) paradas.current = paradasNaEstrada(caminho, arte);
  }, [arte]);

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
  const lugarDaProxima = proxima ? lugares[obras.indexOf(proxima)] : undefined;

  return (
    <svg className={styles.mapa} viewBox={`0 0 ${largura} ${altura}`} role="group" aria-label={`Mapa: ${nome}`}>
      <defs>
        <filter id="terreno-bloqueado">
          <feColorMatrix type="saturate" values="0.15" />
        </filter>
        {lugares.map((lugar, indice) => (
          <clipPath key={indice} id={`terreno-${indice}`}>
            <rect x={lugar.x} y={lugar.y} width={lugar.largura} height={lugar.altura} rx={14} />
          </clipPath>
        ))}
      </defs>
      <image href={imagem} width={largura} height={altura} />
      <path ref={estrada} d={arte.estrada} fill="none" stroke="none" />

      {/* Terreno bloqueado: a própria arte, sem cor. */}
      {obras.map((item, indice) =>
        item.situacao === 'bloqueado' && lugares[indice] ? (
          <g key={item.obra.id} aria-hidden="true">
            <image href={imagem} width={largura} height={altura} clipPath={`url(#terreno-${indice})`} filter="url(#terreno-bloqueado)" />
            <rect
              className={styles.veu}
              x={lugares[indice].x}
              y={lugares[indice].y}
              width={lugares[indice].largura}
              height={lugares[indice].altura}
              rx={14}
            />
          </g>
        ) : null,
      )}

      {placaDoFim ? null : (
        <g className={styles.emBreve} transform={`translate(${arte.placaDoFim[0]} ${arte.placaDoFim[1]})`} aria-hidden="true">
          <rect x={-48} y={-15} width={96} height={30} rx={15} />
          <text textAnchor="middle" dominantBaseline="central">
            em breve
          </text>
        </g>
      )}

      {obras.map((item, indice) => {
        const lugar = lugares[indice];
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
            aria-label={`${obra.numero}. ${obra.nome}: ${obra.conceito}, ${rotuloDaSituacao}`}
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
      {placaDoFim ? <PlacaDoMapaSeguinte placa={placaDoFim} posicao={arte.placaDoFim} /> : null}

      {outdoor ? (
        <a href="#/anuncie" className={styles.outdoor} aria-label="Anuncie aqui: espaços para marcas no Brick by Brick">
          <rect
            className={styles.realceDoOutdoor}
            x={outdoor.x - outdoor.lado / 2 - 6}
            y={outdoor.y - outdoor.lado - 6}
            width={outdoor.lado + 12}
            height={outdoor.lado + 12}
            rx={14}
          />
          <image href={outdoorAnuncie} x={outdoor.x - outdoor.lado / 2} y={outdoor.y - outdoor.lado} width={outdoor.lado} height={outdoor.lado} />
        </a>
      ) : null}

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
