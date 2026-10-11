// Diálogo acessível: foco preso dentro, Esc fecha, foco devolvido ao sair.
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

const FOCAVEIS = 'button:not([disabled]), [href], input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  titulo: string;
  children: ReactNode;
  aoFechar?: () => void;
  largura?: 'media' | 'larga';
  rodape?: ReactNode;
  cabecalho?: ReactNode;
}

export function Modal({ titulo, children, aoFechar, largura = 'media', rodape, cabecalho }: ModalProps) {
  const idDoTitulo = useId();
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const alvo = caixa.current?.querySelector<HTMLElement>('[data-autofoco]') ?? caixa.current;
    alvo?.focus();
    return () => anterior?.focus?.();
  }, []);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && aoFechar) {
        evento.stopPropagation();
        aoFechar();
      }
      if (evento.key !== 'Tab' || !caixa.current) return;
      const focaveis = [...caixa.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
      const primeiro = focaveis[0];
      const ultimo = focaveis.at(-1);
      if (!primeiro || !ultimo) return;
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar, true);
    return () => document.removeEventListener('keydown', aoTeclar, true);
  }, [aoFechar]);

  return createPortal(
    <div className={styles.veu} onMouseDown={(evento) => evento.target === evento.currentTarget && aoFechar?.()}>
      <div
        ref={caixa}
        className={`${styles.caixa} ${styles[largura]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idDoTitulo}
        tabIndex={-1}
      >
        <header className={cabecalho ? `${styles.cabecalho} ${styles.comSelo}` : styles.cabecalho}>
          {cabecalho}
          <h2 id={idDoTitulo} className={styles.titulo}>
            {titulo}
          </h2>
          {aoFechar ? (
            <button type="button" className={styles.fechar} onClick={aoFechar} aria-label="Fechar">
              <X size={22} aria-hidden="true" />
            </button>
          ) : null}
        </header>
        <div className={styles.corpo}>{children}</div>
        {rodape ? <footer className={styles.rodape}>{rodape}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
