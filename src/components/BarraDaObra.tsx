// Barra do topo dentro de uma obra: voltar, nome, fiadas assentadas, placar, combo, som e Python.
import { ArrowLeft, Flame, Volume2, VolumeX } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Obra } from '../jogo/tipos';
import { ChipDoPython } from './ChipDoPython';
import styles from './BarraDaObra.module.css';

export interface BarraDaObraProps {
  obra: Obra;
  fiadasProntas: number;
  pontos: number;
  combo: number;
  som: boolean;
  aoVoltar: () => void;
  aoAlternarSom: () => void;
}

export function BarraDaObra({ obra, fiadasProntas, pontos, combo, som, aoVoltar, aoAlternarSom }: BarraDaObraProps) {
  return (
    <header className={styles.barra}>
      {/* No celular o texto some e fica só a seta: o nome vem do aria-label, que contém o texto visível. */}
      <button type="button" className={styles.voltar} onClick={aoVoltar} aria-label="Voltar para a cidade">
        <ArrowLeft size={20} aria-hidden="true" />
        <span>Cidade</span>
      </button>
      <div className={styles.titulo}>
        <h1 className={styles.nome}>{obra.nome}</h1>
        <span className={styles.conceito}>{obra.conceito}</span>
      </div>
      <div
        className={styles.fiadas}
        role="progressbar"
        aria-label="Fiadas assentadas"
        aria-valuemin={0}
        aria-valuemax={obra.totalLinhas}
        aria-valuenow={fiadasProntas}
        style={{ '--total': obra.totalLinhas } as CSSProperties}
      >
        {Array.from({ length: obra.totalLinhas }, (_, indice) => (
          <span key={indice} className={indice < fiadasProntas ? styles.fiadaPronta : styles.fiada} />
        ))}
        <span className={styles.contagem}>
          {fiadasProntas}/{obra.totalLinhas}
        </span>
      </div>
      <div className={styles.placar} aria-live="polite">
        <span className={styles.pontos}>
          {pontos.toLocaleString('pt-BR')} <small>pts</small>
        </span>
        {combo >= 2 ? (
          <span className={styles.combo} key={combo}>
            <Flame size={16} aria-hidden="true" />
            Combo ×{combo}
          </span>
        ) : null}
      </div>
      <div className={styles.ferramentas}>
        <button
          type="button"
          className={styles.som}
          onClick={aoAlternarSom}
          aria-pressed={som}
          aria-label={som ? 'Desligar som' : 'Ligar som'}
        >
          {som ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
        </button>
        <ChipDoPython />
      </div>
    </header>
  );
}
