// A palete com os tijolos do mini desafio. Também é alvo de soltura: arrastar um tijolo
// de volta para cá o devolve. Os nove primeiros têm atalho de teclado (1–9).
import type { PointerEvent } from 'react';
import type { Tijolo } from '../jogo/tipos';
import { TijoloDeCodigo } from './TijoloDeCodigo';
import styles from './PaleteDeTijolos.module.css';

export interface PaleteDeTijolosProps {
  tijolos: Tijolo[];
  formato: 'pedaco' | 'linha';
  bloqueada: boolean;
  idArrastado: string | null;
  recebendo: boolean;
  aoEscolher: (id: string) => void;
  pressionar: (id: string) => (evento: PointerEvent<HTMLElement>) => void;
  cliqueValido: () => boolean;
}

export function PaleteDeTijolos({ tijolos, formato, bloqueada, idArrastado, recebendo, aoEscolher, pressionar, cliqueValido }: PaleteDeTijolosProps) {
  return (
    <section className={`${styles.palete} ${recebendo ? styles.recebendo : ''}`} data-alvo="palete" aria-label="Palete de tijolos">
      <h3 className={styles.rotulo}>Palete de tijolos</h3>
      {tijolos.length === 0 ? (
        <p className={styles.vazia}>Todos os tijolos estão na planta. Confira a linha e assente!</p>
      ) : (
        <div className={`${styles.tijolos} ${styles[formato]}`}>
          {tijolos.map((tijolo, indice) => (
            <TijoloDeCodigo
              key={tijolo.id}
              texto={tijolo.texto}
              formato={formato}
              idFlip={tijolo.id}
              numero={indice < 9 ? indice + 1 : undefined}
              estado={idArrastado === tijolo.id ? 'fantasma' : 'solto'}
              desabilitado={bloqueada}
              aoClicar={() => cliqueValido() && aoEscolher(tijolo.id)}
              aoPressionar={bloqueada ? undefined : pressionar(tijolo.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
