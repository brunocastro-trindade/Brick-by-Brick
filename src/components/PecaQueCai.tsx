// Peças do Guglo Wars (ADR-0007): uma barra de tijolo com a linha de código colorida, com o espaçamento exato
// (o que se vê é o que se digita). Copiando, o trecho já digitado fica assentado; na lacuna, o que a pessoa
// digita aparece dentro da vaga. O realce é semântico (ADR-0015): chamada de função tem cor de função.
import { caracteresCertos, conferir, type Peca } from '../jogo/gugloWars';
import { realceSemantico, tokenizar, type CategoriaToken } from '../jogo/tokenizador';
import styles from './PecaQueCai.module.css';

interface Segmento {
  texto: string;
  categoria: CategoriaToken;
  assentado: boolean;
  desvio: boolean;
}

/** Quebra a linha em trechos de mesma categoria e mesmo estado de digitação. */
function segmentos(texto: string, certos = 0, desvioEm = -1): Segmento[] {
  const lista: Segmento[] = [];
  let posicao = 0;
  for (const token of realceSemantico(tokenizar(texto))) {
    for (const caractere of token.texto) {
      const atual = { categoria: token.categoria, assentado: posicao < certos, desvio: posicao === desvioEm };
      const ultimo = lista.at(-1);
      if (ultimo && ultimo.categoria === atual.categoria && ultimo.assentado === atual.assentado && !ultimo.desvio && !atual.desvio) {
        ultimo.texto += caractere;
      } else {
        lista.push({ texto: caractere, ...atual });
      }
      posicao += 1;
    }
  }
  return lista;
}

function Codigo({ texto, certos, desvioEm }: { texto: string; certos?: number; desvioEm?: number }) {
  return (
    <>
      {segmentos(texto, certos, desvioEm).map((segmento, indice) => (
        <span
          key={indice}
          className={[styles[segmento.categoria], segmento.assentado ? styles.assentado : '', segmento.desvio ? styles.desvio : ''].join(' ')}
        >
          {segmento.texto}
        </span>
      ))}
    </>
  );
}

export interface PecaQueCaiProps {
  peca: Peca;
  digitado: string;
}

/** A peça da vez. */
export function PecaQueCai({ peca, digitado }: PecaQueCaiProps) {
  const conferencia = conferir(digitado, peca);
  const certos = caracteresCertos(digitado, peca);
  if (peca.modo === 'copiar') {
    return (
      <span className={styles.peca}>
        <Codigo texto={peca.resposta} certos={certos} desvioEm={conferencia === 'desvio' ? certos : -1} />
      </span>
    );
  }
  return (
    <span className={styles.peca}>
      <Codigo texto={peca.antes} />
      <span
        className={`${styles.vaga} ${conferencia === 'desvio' ? styles.vagaComDesvio : ''}`}
        style={{ minWidth: `${peca.resposta.length + 1}ch` }}
      >
        {digitado}
      </span>
      <Codigo texto={peca.depois} />
    </span>
  );
}

/** Peça que chegou ao fundo sem ser digitada. */
export function PecaDeEntulho({ texto }: { texto: string }) {
  return <span className={`${styles.peca} ${styles.entulho}`}>{texto}</span>;
}

/** A próxima peça, só com o formato: mostrar o texto entregaria a lacuna. */
export function SilhuetaDaPeca({ comprimento }: { comprimento: number }) {
  return <span className={`${styles.peca} ${styles.silhueta}`} style={{ width: `${comprimento + 2}ch` }} />;
}
