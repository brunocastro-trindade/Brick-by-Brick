// Cabeçalho das telas de modo (Guglo Wars, Vistoria, "Qual é a saída?"): logo que volta ao início, o nome do modo
// com o ícone dele e as ações à direita. No celular rola junto com a tela: fixo, comeria o espaço do teclado.
import type { ReactNode } from 'react';
import { Logo } from './Logo';
import styles from './CabecalhoDoModo.module.css';

export interface CabecalhoDoModoProps {
  titulo: string;
  /** Ícone do modo (lucide, com aria-hidden), colorido pelo `tom`. */
  icone: ReactNode;
  tom: 'acento' | 'sucesso' | 'codigo';
  aoIrParaInicio: () => void;
  /** Botões à direita (Botao do sistema). */
  children: ReactNode;
}

export function CabecalhoDoModo({ titulo, icone, tom, aoIrParaInicio, children }: CabecalhoDoModoProps) {
  return (
    <header className={styles.barra}>
      <button type="button" className={styles.logo} onClick={aoIrParaInicio} aria-label="Brick by Brick: voltar ao início">
        <Logo tamanho="pequeno" alt="" />
      </button>
      <h1 className={`${styles.titulo} ${styles[tom]}`}>
        {icone}
        {titulo}
      </h1>
      <div className={styles.acoes}>{children}</div>
    </header>
  );
}
