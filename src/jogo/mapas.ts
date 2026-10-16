// Os mapas do jogo (ADR-0021): nome, rota e o que já foi feito em cada um. A arte e as medidas de cada mapa ficam
// em src/components/artesDosMapas.ts.
import { obraLiberada, progressoDaObra, type Progresso } from './progresso';
import { MAPAS, type MapaId, type Nivel, type Obra } from './tipos';

export interface DadosDoMapa {
  id: MapaId;
  nome: string;
  /** Primeiro pedaço do endereço: `#/cidade` é a Vila, `#/serra-verde` é a Serra. */
  rota: string;
  /** O bairro de cada nível, como nas placas da arte. */
  bairros: Record<Nivel, string>;
}

export const DADOS_DOS_MAPAS: Record<MapaId, DadosDoMapa> = {
  vila: {
    id: 'vila',
    nome: 'Vila',
    rota: 'cidade',
    bairros: { basico: 'Vila do Alicerce', intermediario: 'Centro', avancado: 'Alto da Colina' },
  },
  'serra-verde': {
    id: 'serra-verde',
    nome: 'Serra Verde',
    rota: 'serra-verde',
    bairros: { basico: 'Vale das Araucárias', intermediario: 'Lago Central', avancado: 'Alto da Serra' },
  },
};

const NOMES_DO_NIVEL: Record<Nivel, string> = { basico: 'básico', intermediario: 'intermediário', avancado: 'avançado' };

/** "Vale das Araucárias · básico": o bairro da obra no mapa dela e o nível. */
export function bairroDaObra(obra: Obra): string {
  return `${DADOS_DOS_MAPAS[obra.mapa].bairros[obra.nivel]} · ${NOMES_DO_NIVEL[obra.nivel]}`;
}

export function obrasDoMapa(obras: readonly Obra[], mapa: MapaId): Obra[] {
  return obras.filter((obra) => obra.mapa === mapa);
}

/** Todas as obras do mapa concluídas (e ele tem obra). */
export function mapaCompleto(obras: readonly Obra[], progresso: Progresso, mapa: MapaId): boolean {
  const doMapa = obrasDoMapa(obras, mapa);
  return doMapa.length > 0 && doMapa.every((obra) => progressoDaObra(progresso, obra.id).concluida);
}

/** O mapa abre quando a primeira obra dele abre. */
export function mapaLiberado(obras: Obra[], progresso: Progresso, mapa: MapaId): boolean {
  const primeira = obras.findIndex((obra) => obra.mapa === mapa);
  return primeira >= 0 && obraLiberada(obras, progresso, primeira);
}

/** O mapa seguinte a este, se houver. */
export function mapaSeguinte(mapa: MapaId): MapaId | null {
  return MAPAS[MAPAS.indexOf(mapa) + 1] ?? null;
}
