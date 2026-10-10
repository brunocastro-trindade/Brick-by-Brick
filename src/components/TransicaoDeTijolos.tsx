// Troca de tela à moda do Tetris: fiadas de tijolos caem e cobrem a tela, depois saem por baixo.
import type { CSSProperties } from 'react';
import styles from './TransicaoDeTijolos.module.css';

const FIADAS = 8;

export function TransicaoDeTijolos({ fase }: { fase: 'cobrindo' | 'descobrindo' }) {
  return (
    <div className={`${styles.transicao} ${styles[fase]}`} aria-hidden="true">
      {Array.from({ length: FIADAS }, (_, indice) => (
        <div
          key={indice}
          className={`${styles.fiada} ${indice % 2 ? styles.desencontrada : ''}`}
          style={{ '--ordem': FIADAS - 1 - indice } as CSSProperties}
        />
      ))}
    </div>
  );
}
