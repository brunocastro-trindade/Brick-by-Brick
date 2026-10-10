// Texto de saída do programa, como num terminal. O que foi "digitado" no input() aparece destacado.
import { MARCA_ENTRADA_FIM, MARCA_ENTRADA_INICIO } from '../python/tipos';
import styles from './SaidaDoPrograma.module.css';

const PADRAO_ENTRADA = new RegExp(`${MARCA_ENTRADA_INICIO}([^${MARCA_ENTRADA_FIM}]*)${MARCA_ENTRADA_FIM}`, 'g');

export function SaidaDoPrograma({ saida, vazia = '(nada na tela)' }: { saida: string; vazia?: string }) {
  if (saida === '') return <pre className={`${styles.saida} ${styles.vazia}`}>{vazia}</pre>;
  const pedacos = saida.split(PADRAO_ENTRADA);
  return (
    <pre className={styles.saida}>
      {pedacos.map((pedaco, indice) =>
        indice % 2 === 1 ? (
          <span key={indice} className={styles.entrada} title="Resposta digitada no input()">
            {pedaco}
          </span>
        ) : (
          <span key={indice}>{pedaco}</span>
        ),
      )}
    </pre>
  );
}
