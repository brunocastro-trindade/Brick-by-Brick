import { describe, expect, it } from 'vitest';
import { mapaCompleto, mapaLiberado, mapaSeguinte, obrasDoMapa } from './mapas';
import { OBRAS } from './obras';
import { obraLiberada, progressoNovo, type Progresso } from './progresso';

const concluidas = (ids: string[]): Progresso => ({
  ...progressoNovo(),
  obras: Object.fromEntries(
    ids.map((id) => [id, { passo: 0, resultados: [], combo: 0, aulaVista: true, concluida: true, estrelas: 3 as const, melhorPontuacao: 0, vistoria: null }]),
  ),
});

describe('mapas (ADR-0021)', () => {
  const vila = obrasDoMapa(OBRAS, 'vila');
  const serra = obrasDoMapa(OBRAS, 'serra-verde');

  it('a Vila tem as 10 primeiras obras e a Serra Verde as 10 seguintes, em bloco', () => {
    expect(vila).toHaveLength(10);
    expect(serra).toHaveLength(10);
    expect(OBRAS.map((obra) => obra.mapa)).toEqual([...vila.map(() => 'vila'), ...serra.map(() => 'serra-verde')]);
    expect(serra.map((obra) => obra.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(mapaSeguinte('vila')).toBe('serra-verde');
    expect(mapaSeguinte('serra-verde')).toBeNull();
  });

  it('a Serra Verde só abre com a Vila inteira concluída', () => {
    expect(mapaLiberado(OBRAS, progressoNovo(), 'vila')).toBe(true);
    expect(mapaLiberado(OBRAS, progressoNovo(), 'serra-verde')).toBe(false);
    const quaseTudo = concluidas(vila.slice(0, 9).map((obra) => obra.id));
    expect(mapaLiberado(OBRAS, quaseTudo, 'serra-verde')).toBe(false);
    // Concluir só a última da Vila (no modo livre, por exemplo) não basta.
    expect(mapaLiberado(OBRAS, concluidas([vila[9]?.id ?? '']), 'serra-verde')).toBe(false);
    const vilaInteira = concluidas(vila.map((obra) => obra.id));
    expect(mapaCompleto(OBRAS, vilaInteira, 'vila')).toBe(true);
    expect(mapaLiberado(OBRAS, vilaInteira, 'serra-verde')).toBe(true);
    expect(mapaLiberado(OBRAS, { ...progressoNovo(), modoLivre: true }, 'serra-verde')).toBe(true);
  });

  it('dentro da Serra Verde, as obras seguem a ordem', () => {
    const vilaInteira = concluidas(vila.map((obra) => obra.id));
    const segunda = OBRAS.indexOf(serra[1] ?? serra[0]!);
    expect(obraLiberada(OBRAS, vilaInteira, segunda)).toBe(false);
    expect(obraLiberada(OBRAS, concluidas([...vila, serra[0]!].map((obra) => obra.id)), segunda)).toBe(true);
  });
});
