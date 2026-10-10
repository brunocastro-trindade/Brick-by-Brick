// Markdown mínimo e seguro (sem HTML cru): parágrafos, `código` e **destaque**.
import { Fragment, type ReactNode } from 'react';
import styles from './TextoRico.module.css';

function trechos(texto: string): ReactNode[] {
  return texto.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((trecho, indice) => {
    if (trecho.startsWith('`') && trecho.endsWith('`') && trecho.length > 2) {
      return (
        <code key={indice} className={styles.codigo}>
          {trecho.slice(1, -1)}
        </code>
      );
    }
    if (trecho.startsWith('**') && trecho.endsWith('**') && trecho.length > 4) {
      return <strong key={indice}>{trecho.slice(2, -2)}</strong>;
    }
    return <Fragment key={indice}>{trecho}</Fragment>;
  });
}

export function TextoRico({ texto, tom = 'claro' }: { texto: string; tom?: 'claro' | 'escuro' }) {
  const paragrafos = texto.split(/\n\s*\n/).map((paragrafo) => paragrafo.replace(/\s*\n\s*/g, ' ').trim());
  return (
    <div className={`${styles.texto} ${tom === 'escuro' ? styles.escuro : ''}`}>
      {paragrafos.map((paragrafo, indice) => (
        <p key={indice}>{trechos(paragrafo)}</p>
      ))}
    </div>
  );
}

/** Versão de uma linha, sem parágrafo: para títulos e rótulos. */
export function TextoRicoEmLinha({ texto }: { texto: string }) {
  return <>{trechos(texto)}</>;
}
