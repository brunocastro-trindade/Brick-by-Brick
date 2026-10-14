// Texto de saída do programa, como num terminal. O que foi "digitado" no input() aparece destacado; na
// saída esperada da Vistoria (ADR-0016), o comentário da planta aparece como comentário, com a fiada dele.
import {
  MARCA_COMENTARIO_FIM,
  MARCA_COMENTARIO_INICIO,
  MARCA_COMENTARIO_SEPARADOR,
  MARCA_ENTRADA_FIM,
  MARCA_ENTRADA_INICIO,
} from '../python/tipos';
import styles from './SaidaDoPrograma.module.css';

const PADRAO = new RegExp(
  `${MARCA_ENTRADA_INICIO}([^${MARCA_ENTRADA_FIM}]*)${MARCA_ENTRADA_FIM}` +
    `|${MARCA_COMENTARIO_INICIO}(\\d+)${MARCA_COMENTARIO_SEPARADOR}([^${MARCA_COMENTARIO_FIM}]*)${MARCA_COMENTARIO_FIM}`,
  'g',
);

export function SaidaDoPrograma({ saida, vazia = '(nada na tela)' }: { saida: string; vazia?: string }) {
  if (saida === '') return <pre className={`${styles.saida} ${styles.vazia}`}>{vazia}</pre>;
  const pedacos = [];
  let posicao = 0;
  for (const achado of saida.matchAll(PADRAO)) {
    const [inteiro, entrada, fiada, comentario] = achado;
    const inicio = achado.index ?? 0;
    if (inicio > posicao) pedacos.push(<span key={posicao}>{saida.slice(posicao, inicio)}</span>);
    pedacos.push(
      entrada !== undefined ? (
        <span key={inicio} className={styles.entrada} title="Resposta digitada no input()">
          {entrada}
        </span>
      ) : (
        <span key={inicio} className={styles.comentario}>
          {comentario}
          <span className={styles.fiada}> ← comentário da fiada {fiada}</span>
        </span>
      ),
    );
    posicao = inicio + inteiro.length;
  }
  if (posicao < saida.length) pedacos.push(<span key={posicao}>{saida.slice(posicao)}</span>);
  return <pre className={styles.saida}>{pedacos}</pre>;
}
