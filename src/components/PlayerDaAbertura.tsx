// Player pequeno da abertura (ADR-0020): no canto da tela, na primeira entrada na cidade. Fecha sozinho quando o
// vídeo acaba, para não ficar por cima da cidade.
import { X } from 'lucide-react';
import { VideoDoGuglo } from './VideoDoGuglo';
import styles from './PlayerDaAbertura.module.css';

export interface PlayerDaAberturaProps {
  somLigado: boolean;
  aoFechar: () => void;
}

export function PlayerDaAbertura({ somLigado, aoFechar }: PlayerDaAberturaProps) {
  return (
    <section className={styles.player} aria-labelledby="titulo-da-abertura">
      <header className={styles.topo}>
        <h2 id="titulo-da-abertura" className={styles.titulo}>
          Bem-vindo à Vila!
        </h2>
        <button type="button" className={styles.fechar} onClick={aoFechar} aria-label="Fechar o vídeo">
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <VideoDoGuglo video="abertura" somLigado={somLigado} aoTerminar={aoFechar} />
    </section>
  );
}
