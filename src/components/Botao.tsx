// Botão do sistema: variantes fechadas (HARNESS §2.3), sombra dura de desenho animado
// que "afunda" ao apertar, alvo de toque de 44px no mínimo.
import type { ReactNode } from 'react';
import styles from './Botao.module.css';

export interface BotaoProps {
  children: ReactNode;
  variante?: 'primario' | 'secundario' | 'fantasma';
  tamanho?: 'medio' | 'grande';
  icone?: ReactNode;
  atalho?: string;
  carregando?: boolean;
  desabilitado?: boolean;
  larguraTotal?: boolean;
  tipo?: 'button' | 'submit';
  rotulo?: string;
  /** Recebe o foco quando um modal abre. */
  autofoco?: boolean;
  aoClicar?: () => void;
}

export function Botao({
  children,
  variante = 'primario',
  tamanho = 'medio',
  icone,
  atalho,
  carregando = false,
  desabilitado = false,
  larguraTotal = false,
  tipo = 'button',
  rotulo,
  autofoco = false,
  aoClicar,
}: BotaoProps) {
  const classes = [styles.botao, styles[variante], styles[tamanho], larguraTotal ? styles.larguraTotal : ''].join(' ');
  return (
    <button
      type={tipo}
      className={classes}
      disabled={desabilitado || carregando}
      aria-busy={carregando || undefined}
      aria-label={rotulo}
      data-autofoco={autofoco || undefined}
      onClick={aoClicar}
    >
      {carregando ? <span className={styles.giro} aria-hidden="true" /> : icone}
      <span>{children}</span>
      {atalho && !carregando ? <kbd className={styles.atalho}>{atalho}</kbd> : null}
    </button>
  );
}
