// Uma linha de Python colorida por categoria de token, sobre o fundo escuro do editor.
import { tokenizar } from '../jogo/tokenizador';
import styles from './CodigoColorido.module.css';

export function CodigoColorido({ texto }: { texto: string }) {
  return (
    <code className={styles.codigo}>
      {tokenizar(texto).map((token, indice) => (
        <span key={indice} className={styles[token.categoria]}>
          {token.texto}
        </span>
      ))}
    </code>
  );
}

/** Bloco de várias linhas, como o exemplo de uma aula. */
export function BlocoDeCodigo({ codigo, rotulo }: { codigo: string; rotulo?: string }) {
  return (
    <pre className={styles.bloco} aria-label={rotulo}>
      {codigo.split('\n').map((linha, indice) => (
        <div key={indice} className={styles.linhaDoBloco}>
          <CodigoColorido texto={linha} />
        </div>
      ))}
    </pre>
  );
}
