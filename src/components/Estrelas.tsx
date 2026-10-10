import { Star } from 'lucide-react';
import styles from './Estrelas.module.css';

export function Estrelas({ quantidade, tamanho = 'medio', animar = false }: { quantidade: number; tamanho?: 'pequeno' | 'medio' | 'grande'; animar?: boolean }) {
  return (
    <span className={`${styles.estrelas} ${styles[tamanho]} ${animar ? styles.animar : ''}`} role="img" aria-label={`${quantidade} de 3 estrelas`}>
      {[1, 2, 3].map((posicao) => (
        <Star key={posicao} className={posicao <= quantidade ? styles.cheia : styles.vazia} aria-hidden="true" />
      ))}
    </span>
  );
}
