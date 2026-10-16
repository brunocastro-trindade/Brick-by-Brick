// Rotas por hash: o jogo é um site estático, sem servidor para reescrever URLs.
import { useEffect, useState } from 'react';
import { DADOS_DOS_MAPAS } from '../jogo/mapas';
import type { MapaId } from '../jogo/tipos';

export type Rota =
  | { tela: 'inicio' }
  | { tela: 'cidade'; mapa?: MapaId; obraId?: string }
  | { tela: 'obra'; obraId: string }
  | { tela: 'vistoria'; obraId: string }
  | { tela: 'guglo-wars' }
  | { tela: 'qual-e-a-saida' }
  | { tela: 'leia-o-erro' }
  | { tela: 'anuncie' }
  | { tela: 'vitrine' };

export function lerRota(hash: string): Rota {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (partes[0] === 'cidade') return { tela: 'cidade', obraId: partes[1] };
  if (partes[0] === DADOS_DOS_MAPAS['serra-verde'].rota) return { tela: 'cidade', mapa: 'serra-verde', obraId: partes[1] };
  if (partes[0] === 'obra' && partes[1]) return { tela: 'obra', obraId: partes[1] };
  if (partes[0] === 'vistoria' && partes[1]) return { tela: 'vistoria', obraId: partes[1] };
  if (partes[0] === 'guglo-wars') return { tela: 'guglo-wars' };
  if (partes[0] === 'qual-e-a-saida') return { tela: 'qual-e-a-saida' };
  if (partes[0] === 'leia-o-erro') return { tela: 'leia-o-erro' };
  if (partes[0] === 'anuncie') return { tela: 'anuncie' };
  if (partes[0] === 'design-system' && import.meta.env.DEV) return { tela: 'vitrine' };
  return { tela: 'inicio' };
}

export function hashDaRota(rota: Rota): string {
  switch (rota.tela) {
    case 'inicio':
      return '#/';
    case 'cidade': {
      const base = `#/${DADOS_DOS_MAPAS[rota.mapa ?? 'vila'].rota}`;
      return rota.obraId ? `${base}/${rota.obraId}` : base;
    }
    case 'obra':
      return `#/obra/${rota.obraId}`;
    case 'vistoria':
      return `#/vistoria/${rota.obraId}`;
    case 'guglo-wars':
      return '#/guglo-wars';
    case 'qual-e-a-saida':
      return '#/qual-e-a-saida';
    case 'leia-o-erro':
      return '#/leia-o-erro';
    case 'anuncie':
      return '#/anuncie';
    case 'vitrine':
      return '#/design-system';
  }
}

/** Cada mapa é uma tela (ADR-0021): trocar de mapa passa pela mesma transição que trocar de tela. */
export function telaDaRota(rota: Rota): string {
  return rota.tela === 'cidade' ? `cidade:${rota.mapa ?? 'vila'}` : rota.tela;
}

export function navegar(rota: Rota): void {
  const hash = hashDaRota(rota);
  if (window.location.hash !== hash) window.location.hash = hash;
}

export function useRota(): Rota {
  const [rota, setRota] = useState(() => lerRota(window.location.hash));
  useEffect(() => {
    const aoMudar = () => setRota(lerRota(window.location.hash));
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);
  return rota;
}
