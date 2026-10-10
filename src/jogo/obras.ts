// Todas as obras da cidade, lidas de conteudo/obras/*.yaml em tempo de build (ADR-0003).
import { processarCidade } from './conteudo';
import type { Obra } from './tipos';

const modulos = import.meta.glob<unknown>('../../conteudo/obras/*.yaml', { eager: true, import: 'default' });

export const OBRAS: Obra[] = processarCidade(
  Object.entries(modulos).map(([caminho, dados]) => ({ origem: caminho.split('/').pop() ?? caminho, dados })),
);

export function obraPorId(id: string): Obra | null {
  return OBRAS.find((obra) => obra.id === id) ?? null;
}
