// Prédios do mapa. Cada modelo é desenhado com origem no pé da porta (0, 0), crescendo para cima.
// O mesmo desenho serve de planta tracejada (bloqueado), de obra parcial (em obra) e de prédio pronto.
import type { ReactNode } from 'react';
import type { ModeloPredio } from '../jogo/tipos';
import styles from './PredioDaCidade.module.css';

export type SituacaoDoPredio = 'bloqueado' | 'disponivel' | 'em-obra' | 'concluido';

const C = 'var(--cor-ilustra-contorno)';

interface Medidas {
  largura: number;
  altura: number;
}

/** Largura e altura da parede principal de cada modelo (o telhado vai além). */
export const MEDIDAS: Record<ModeloPredio, Medidas> = {
  casa: { largura: 140, altura: 100 },
  armazem: { largura: 180, altura: 108 },
  mercado: { largura: 160, altura: 104 },
  prefeitura: { largura: 196, altura: 108 },
  cinema: { largura: 160, altura: 128 },
  fabrica: { largura: 196, altura: 100 },
  biblioteca: { largura: 170, altura: 112 },
  oficina: { largura: 170, altura: 104 },
  cofre: { largura: 160, altura: 116 },
  torre: { largura: 116, altura: 214 },
};

function Parede({ largura, altura, idPadrao }: Medidas & { idPadrao: string }) {
  return <rect x={-largura / 2} y={-altura} width={largura} height={altura} fill={`url(#${idPadrao})`} stroke={C} strokeWidth={4} />;
}

function Janela({ x, y, largura = 26, altura = 24, acesa }: { x: number; y: number; largura?: number; altura?: number; acesa: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={largura} height={altura} rx={3} fill={acesa ? 'var(--cor-ilustra-janela)' : 'var(--cor-ilustra-vidro)'} stroke={C} strokeWidth={3} />
      <path d={`M${x + largura / 2} ${y} V${y + altura} M${x} ${y + altura / 2} H${x + largura}`} stroke={C} strokeWidth={2} />
    </g>
  );
}

function Porta({ largura = 32, altura = 52, x = -largura / 2 }: { largura?: number; altura?: number; x?: number }) {
  return (
    <g>
      <rect x={x} y={-altura} width={largura} height={altura} rx={4} fill="var(--cor-ilustra-porta)" stroke={C} strokeWidth={3} />
      <circle cx={x + largura - 8} cy={-altura / 2} r={2.5} fill="var(--cor-ilustra-destaque)" />
    </g>
  );
}

function Letreiro({ y, largura, texto }: { y: number; largura: number; texto: string }) {
  return (
    <g>
      <rect x={-largura / 2} y={y} width={largura} height={18} rx={3} fill="var(--cor-ilustra-placa)" stroke={C} strokeWidth={2.5} />
      <text x={0} y={y + 9.5} className={styles.letreiro} textAnchor="middle" dominantBaseline="central">
        {texto}
      </text>
    </g>
  );
}

function desenho(modelo: ModeloPredio, idPadrao: string, acesa: boolean): ReactNode {
  const { largura: L, altura: A } = MEDIDAS[modelo];
  const parede = <Parede largura={L} altura={A} idPadrao={idPadrao} />;
  switch (modelo) {
    case 'casa':
      return (
        <>
          <rect x={30} y={A * -1 - 52} width={16} height={36} fill="var(--cor-tijolo-palavra-chave)" stroke={C} strokeWidth={3} />
          {parede}
          <path d={`M${-L / 2 - 14} ${-A + 2} L0 ${-A - 62} L${L / 2 + 14} ${-A + 2} Z`} fill="var(--cor-ilustra-telhado)" stroke={C} strokeWidth={4} strokeLinejoin="round" />
          <Janela x={-58} y={-76} acesa={acesa} />
          <Janela x={32} y={-76} acesa={acesa} />
          <Porta />
          <Letreiro y={-98} largura={74} texto="CORREIO" />
          <rect x={L / 2 + 8} y={-34} width={5} height={34} fill="var(--cor-ilustra-tronco)" stroke={C} strokeWidth={2} />
          <rect x={L / 2} y={-46} width={22} height={16} rx={6} fill="var(--cor-acento)" stroke={C} strokeWidth={2.5} />
        </>
      );
    case 'armazem':
      return (
        <>
          {parede}
          <path d={`M${-L / 2 - 10} ${-A + 2} Q0 ${-A - 70} ${L / 2 + 10} ${-A + 2} Z`} fill="var(--cor-ilustra-telhado-alternativo)" stroke={C} strokeWidth={4} />
          <rect x={-38} y={-72} width={76} height={72} rx={4} fill="var(--cor-ilustra-porta)" stroke={C} strokeWidth={3} />
          <path d="M-38 -72 L38 0 M38 -72 L-38 0" stroke={C} strokeWidth={2.5} opacity={0.6} />
          <Letreiro y={-98} largura={84} texto="ARMAZÉM" />
          <rect x={L / 2 - 4} y={-26} width={26} height={26} fill="var(--cor-tijolo-texto)" stroke={C} strokeWidth={2.5} />
          <rect x={L / 2 + 2} y={-48} width={20} height={22} fill="var(--cor-tijolo-numero)" stroke={C} strokeWidth={2.5} />
        </>
      );
    case 'mercado':
      return (
        <>
          {parede}
          <rect x={-L / 2 - 8} y={-A - 12} width={L + 16} height={14} fill="var(--cor-ilustra-telhado)" stroke={C} strokeWidth={3} />
          <text x={0} y={-A - 5} className={styles.letreiroClaro} textAnchor="middle" dominantBaseline="central">
            MERCADO
          </text>
          {Array.from({ length: 8 }, (_, indice) => (
            <path
              key={indice}
              d={`M${-L / 2 + indice * (L / 8)} -84 h${L / 8} v18 a${L / 16} 7 0 0 1 ${-L / 8} 0 Z`}
              fill={indice % 2 ? 'var(--cor-ilustra-placa)' : 'var(--cor-ilustra-destaque)'}
              stroke={C}
              strokeWidth={2}
            />
          ))}
          <rect x={-66} y={-58} width={72} height={38} rx={3} fill={acesa ? 'var(--cor-ilustra-janela)' : 'var(--cor-ilustra-vidro)'} stroke={C} strokeWidth={3} />
          <Porta x={18} largura={30} altura={56} />
        </>
      );
    case 'prefeitura':
      return (
        <>
          {parede}
          <path d={`M${-L / 2 - 12} ${-A + 2} L0 ${-A - 52} L${L / 2 + 12} ${-A + 2} Z`} fill="var(--cor-ilustra-placa)" stroke={C} strokeWidth={4} strokeLinejoin="round" />
          <circle cx={0} cy={-A - 20} r={13} fill="var(--cor-superficie-destaque)" stroke={C} strokeWidth={3} />
          <path d={`M0 ${-A - 20} V${-A - 29} M0 ${-A - 20} H7`} stroke={C} strokeWidth={2.5} strokeLinecap="round" />
          {[-80, -46, 32, 66].map((x) => (
            <rect key={x} x={x} y={-A + 6} width={14} height={A - 14} fill="var(--cor-ilustra-placa)" stroke={C} strokeWidth={2.5} />
          ))}
          <Porta altura={60} largura={36} />
          <rect x={-L / 2 - 6} y={-8} width={L + 12} height={8} fill="var(--cor-tijolo-recuo)" stroke={C} strokeWidth={2.5} />
          <Letreiro y={-A + 8} largura={100} texto="PREFEITURA" />
        </>
      );
    case 'cinema':
      return (
        <>
          {parede}
          <rect x={-L / 2 - 6} y={-A - 10} width={L + 12} height={12} fill="var(--cor-ilustra-telhado)" stroke={C} strokeWidth={3} />
          <rect x={L / 2 - 6} y={-A - 34} width={26} height={96} rx={4} fill="var(--cor-acento)" stroke={C} strokeWidth={3} />
          {['C', 'I', 'N', 'E'].map((letra, indice) => (
            <text key={letra} x={L / 2 + 7} y={-A - 20 + indice * 22} className={styles.letreiroClaro} textAnchor="middle" dominantBaseline="central">
              {letra}
            </text>
          ))}
          <rect x={-70} y={-96} width={128} height={26} rx={4} fill="var(--cor-ilustra-destaque)" stroke={C} strokeWidth={3} />
          {Array.from({ length: 9 }, (_, indice) => (
            <circle
              key={indice}
              cx={-62 + indice * 14}
              cy={-100}
              r={3.2}
              fill={acesa ? 'var(--cor-ilustra-janela)' : 'var(--cor-ilustra-placa)'}
              stroke={C}
              strokeWidth={1.5}
              className={acesa ? styles.luzinha : undefined}
            />
          ))}
          <text x={-6} y={-83} className={styles.letreiro} textAnchor="middle" dominantBaseline="central">
            EM CARTAZ
          </text>
          <rect x={-26} y={-62} width={52} height={62} rx={3} fill={acesa ? 'var(--cor-ilustra-janela)' : 'var(--cor-ilustra-vidro)'} stroke={C} strokeWidth={3} />
          <path d="M0 -62 V0" stroke={C} strokeWidth={2.5} />
        </>
      );
    case 'fabrica':
      return (
        <>
          <rect x={52} y={-A - 92} width={26} height={96} fill="var(--cor-tijolo-palavra-chave)" stroke={C} strokeWidth={3} />
          <path d={`M52 ${-A - 70} h26 M52 ${-A - 50} h26`} stroke="var(--cor-ilustra-placa)" strokeWidth={6} />
          {acesa ? (
            <g className={styles.fumaca} fill="var(--cor-ilustra-nuvem)" stroke={C} strokeWidth={2}>
              <circle cx={66} cy={-A - 104} r={10} />
              <circle cx={80} cy={-A - 122} r={13} />
              <circle cx={98} cy={-A - 144} r={16} />
            </g>
          ) : null}
          {parede}
          <path
            d={`M${-L / 2} ${-A} L${-L / 2} ${-A - 30} L${-L / 6} ${-A} L${-L / 6} ${-A - 30} L${L / 6} ${-A} L${L / 6} ${-A - 30} L${L / 2} ${-A} Z`}
            fill="var(--cor-ilustra-telhado-alternativo)"
            stroke={C}
            strokeWidth={4}
            strokeLinejoin="round"
          />
          {[-86, -50, 26, 62].map((x) => (
            <Janela key={x} x={x} y={-82} largura={24} altura={20} acesa={acesa} />
          ))}
          <rect x={-22} y={-58} width={44} height={58} rx={3} fill="var(--cor-ilustra-andaime)" stroke={C} strokeWidth={3} />
          <path d="M-22 -44 H22 M-22 -30 H22 M-22 -16 H22" stroke={C} strokeWidth={2} />
          <Letreiro y={-A + 6} largura={70} texto="FÁBRICA" />
        </>
      );
    case 'biblioteca':
      return (
        <>
          {parede}
          <path d={`M${-L / 2 + 6} ${-A + 2} A${L / 2 - 6} 56 0 0 1 ${L / 2 - 6} ${-A + 2} Z`} fill="var(--cor-ilustra-telhado-alternativo)" stroke={C} strokeWidth={4} />
          <rect x={-5} y={-A - 72} width={10} height={20} fill="var(--cor-ilustra-destaque)" stroke={C} strokeWidth={2.5} />
          {[-62, 34].map((x) => (
            <path
              key={x}
              d={`M${x} -40 V-72 a14 14 0 0 1 28 0 V-40 Z`}
              fill={acesa ? 'var(--cor-ilustra-janela)' : 'var(--cor-ilustra-vidro)'}
              stroke={C}
              strokeWidth={3}
            />
          ))}
          <path d="M-18 0 V-46 a18 18 0 0 1 36 0 V0 Z" fill="var(--cor-ilustra-porta)" stroke={C} strokeWidth={3} />
          <Letreiro y={-A + 8} largura={96} texto="BIBLIOTECA" />
        </>
      );
    case 'oficina':
      return (
        <>
          {parede}
          <path d={`M${-L / 2 - 10} ${-A + 2} L0 ${-A - 34} L${L / 2 + 10} ${-A + 2} Z`} fill="var(--cor-ilustra-telhado)" stroke={C} strokeWidth={4} strokeLinejoin="round" />
          <g transform={`translate(0 ${-A - 8})`}>
            <circle r={13} fill="var(--cor-ilustra-destaque)" stroke={C} strokeWidth={3} strokeDasharray="5 3" />
            <circle r={5} fill="var(--cor-ilustra-placa)" stroke={C} strokeWidth={2.5} />
          </g>
          <rect x={-62} y={-70} width={78} height={70} rx={3} fill="var(--cor-ilustra-placa)" stroke={C} strokeWidth={3} />
          {[-56, -44, -32, -20, -8].map((y) => (
            <path key={y} d={`M-62 ${y} H16`} stroke={C} strokeWidth={2} opacity={0.55} />
          ))}
          <Porta x={30} largura={30} altura={54} />
          <Letreiro y={-A + 8} largura={78} texto="OFICINA" />
        </>
      );
    case 'cofre':
      return (
        <>
          {parede}
          <rect x={-L / 2 - 10} y={-A - 16} width={L + 20} height={18} fill="var(--cor-ilustra-placa)" stroke={C} strokeWidth={3} />
          <text x={0} y={-A - 7} className={styles.letreiro} textAnchor="middle" dominantBaseline="central">
            COFRE
          </text>
          {[-72, 56].map((x) => (
            <rect key={x} x={x} y={-A + 4} width={16} height={A - 4} fill="var(--cor-ilustra-placa)" stroke={C} strokeWidth={2.5} />
          ))}
          <g transform="translate(0 -52)">
            <circle r={36} fill="var(--cor-tijolo-recuo)" stroke={C} strokeWidth={4} />
            <circle r={24} fill={acesa ? 'var(--cor-ilustra-destaque)' : 'var(--cor-ilustra-placa)'} stroke={C} strokeWidth={3} />
            <path d="M0 -24 V24 M-24 0 H24 M-17 -17 L17 17 M17 -17 L-17 17" stroke={C} strokeWidth={2.5} />
            <circle r={6} fill="var(--cor-ilustra-porta)" stroke={C} strokeWidth={2} />
          </g>
        </>
      );
    case 'torre':
      return (
        <>
          {parede}
          <rect x={-L / 2 - 6} y={-A - 10} width={L + 12} height={12} fill="var(--cor-ilustra-telhado)" stroke={C} strokeWidth={3} />
          {[0, 1, 2, 3, 4, 5].flatMap((linha) =>
            [-44, -12, 20].map((x) => <Janela key={`${linha}${x}`} x={x} y={-A + 20 + linha * 28} largura={24} altura={18} acesa={acesa && (linha + x) % 3 !== 0} />),
          )}
          <Porta altura={40} largura={30} />
          <g stroke={C} strokeWidth={3} fill="none">
            <path d={`M-30 ${-A - 10} V${-A - 86} M-18 ${-A - 10} V${-A - 86} M-30 ${-A - 30} L-18 ${-A - 50} M-30 ${-A - 54} L-18 ${-A - 74}`} />
            <path d={`M-40 ${-A - 86} H66 M-36 ${-A - 86} L-24 ${-A - 106} L-12 ${-A - 86}`} />
            <path d={`M56 ${-A - 86} V${-A - 56}`} strokeWidth={2} />
          </g>
          <rect x={48} y={-A - 58} width={16} height={10} rx={2} fill="var(--cor-tijolo-nome)" stroke={C} strokeWidth={2} />
          <Letreiro y={-A + 2} largura={96} texto="CONSTRUTORA" />
        </>
      );
  }
}

function Andaime({ largura, altura }: Medidas) {
  const x0 = -largura / 2 - 12;
  const x1 = largura / 2 + 12;
  const niveis = Math.max(1, Math.round(altura / 36));
  return (
    <g stroke={C} strokeWidth={2.5} aria-hidden="true">
      {[x0, x0 + 10, x1 - 10, x1].map((x) => (
        <line key={x} x1={x} y1={0} x2={x} y2={-altura - 10} stroke="var(--cor-ilustra-andaime)" strokeWidth={5} />
      ))}
      {Array.from({ length: niveis }, (_, indice) => {
        const y = -((indice + 1) * altura) / niveis;
        return (
          <g key={indice}>
            <rect x={x0 - 4} y={y - 3} width={18} height={6} fill="var(--cor-ilustra-tronco)" />
            <rect x={x1 - 14} y={y - 3} width={18} height={6} fill="var(--cor-ilustra-tronco)" />
          </g>
        );
      })}
    </g>
  );
}

function Tapume({ largura, emBreve }: { largura: number; emBreve: boolean }) {
  const tabuas = Math.ceil((largura + 40) / 20);
  const x0 = -(tabuas * 20) / 2;
  return (
    <g aria-hidden="true">
      {Array.from({ length: tabuas }, (_, indice) => (
        <rect
          key={indice}
          x={x0 + indice * 20}
          y={-44 - (indice % 2) * 4}
          width={20}
          height={44 + (indice % 2) * 4}
          fill="var(--cor-ilustra-tapume)"
          stroke={C}
          strokeWidth={2.5}
        />
      ))}
      {emBreve ? (
        <>
          <rect x={-34} y={-34} width={68} height={22} rx={3} fill="var(--cor-ilustra-placa)" stroke={C} strokeWidth={2.5} />
          <text x={0} y={-22.5} className={styles.letreiro} textAnchor="middle" dominantBaseline="central">
            EM BREVE
          </text>
        </>
      ) : (
        <g transform="translate(0 -24)">
          <path d="M-8 -4 V-10 a8 8 0 0 1 16 0 V-4" fill="none" stroke={C} strokeWidth={3.5} />
          <rect x={-12} y={-5} width={24} height={19} rx={3} fill="var(--cor-ilustra-destaque)" stroke={C} strokeWidth={3} />
          <circle cx={0} cy={4} r={2.6} fill={C} />
        </g>
      )}
    </g>
  );
}

export interface PredioDaCidadeProps {
  modelo: ModeloPredio;
  situacao: SituacaoDoPredio;
  /** De 0 a 1: quanto da parede já foi assentado. */
  progresso: number;
  idUnico: string;
  /** Terreno de conteúdo futuro, não uma obra trancada. */
  emBreve?: boolean;
}

export function PredioDaCidade({ modelo, situacao, progresso, idUnico, emBreve = false }: PredioDaCidadeProps) {
  const medidas = MEDIDAS[modelo];
  const idPadrao = `tijolos-${idUnico}`;
  const idRecorte = `obra-${idUnico}`;
  const completo = desenho(modelo, idPadrao, situacao === 'concluido');
  const alturaFeita = situacao === 'em-obra' ? Math.max(0.12, progresso) * medidas.altura : 10;

  return (
    <g className={styles.predio}>
      <defs>
        <pattern id={idPadrao} width={24} height={12} patternUnits="userSpaceOnUse">
          <rect width={24} height={12} fill="var(--cor-argamassa)" />
          <rect x={1} y={1} width={22} height={4.5} rx={1} fill="var(--cor-tijolo-nome)" />
          <rect x={-11} y={7} width={22} height={4.5} rx={1} fill="var(--cor-tijolo-funcao)" />
          <rect x={13} y={7} width={22} height={4.5} rx={1} fill="var(--cor-tijolo-nome)" />
        </pattern>
        <clipPath id={idRecorte}>
          <rect x={-400} y={-alturaFeita} width={800} height={alturaFeita + 4} />
        </clipPath>
      </defs>
      <ellipse cx={0} cy={2} rx={medidas.largura / 2 + 22} ry={9} fill="var(--cor-sombra-difusa)" />
      {situacao === 'concluido' ? (
        completo
      ) : (
        <>
          <g className={styles.fantasma}>{completo}</g>
          {situacao === 'bloqueado' ? (
            <Tapume largura={medidas.largura} emBreve={emBreve} />
          ) : (
            <>
              <g clipPath={`url(#${idRecorte})`}>{completo}</g>
              <rect x={-medidas.largura / 2 - 6} y={-6} width={medidas.largura + 12} height={8} fill="var(--cor-tijolo-recuo)" stroke={C} strokeWidth={2.5} />
              <Andaime largura={medidas.largura} altura={Math.min(medidas.altura, alturaFeita + 26)} />
            </>
          )}
        </>
      )}
    </g>
  );
}
