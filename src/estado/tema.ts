// Tema do site (ADR-0018): o <html> leva data-tema="dracula" (escuro) ou "claro"; sem o atributo, o tokens.css
// segue o aparelho por @media (prefers-color-scheme). Fica no <html> porque os modais abrem num portal no <body>.
import type { Tema } from '../jogo/progresso';

export const ATRIBUTO_DO_TEMA: Record<Tema, string | null> = { claro: 'claro', escuro: 'dracula', aparelho: null };

export function aplicarTema(tema: Tema, raiz: HTMLElement = document.documentElement): void {
  const valor = ATRIBUTO_DO_TEMA[tema];
  if (valor) raiz.dataset.tema = valor;
  else delete raiz.dataset.tema;
}
