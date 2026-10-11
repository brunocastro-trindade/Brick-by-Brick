import { describe, expect, it } from 'vitest';
import { arquivoDeCabecalhos, CABECALHOS_DE_SEGURANCA, POLITICA_NA_META } from './cabecalhos';

/** Lê o _headers no formato do Cloudflare Pages: caminho na coluna 0, cabeçalhos recuados abaixo. */
function regras(texto: string): Map<string, Record<string, string>> {
  const mapa = new Map<string, Record<string, string>>();
  let atual: Record<string, string> = {};
  for (const linha of texto.split('\n').filter(Boolean)) {
    if (!linha.startsWith(' ')) mapa.set(linha, (atual = {}));
    else {
      const [nome, ...valor] = linha.trim().split(': ');
      atual[nome ?? ''] = valor.join(': ');
    }
  }
  return mapa;
}

describe('cabeçalhos do host (ADR-0013)', () => {
  it('a política em cabeçalho é a da meta mais frame-ancestors, que a meta não aceita', () => {
    expect(POLITICA_NA_META).toContain("default-src 'self'");
    expect(POLITICA_NA_META).not.toContain('frame-ancestors');
    expect(CABECALHOS_DE_SEGURANCA['Content-Security-Policy']).toBe(`${POLITICA_NA_META}; frame-ancestors 'none'`);
  });

  it('_headers põe a segurança em tudo e cache imutável só no que tem hash ou versão no nome', () => {
    const lidas = regras(arquivoDeCabecalhos());
    expect([...lidas.keys()]).toEqual(['/*', '/assets/*', '/pyodide/*']);
    expect(lidas.get('/*')).toEqual(CABECALHOS_DE_SEGURANCA);
    // Sem Cache-Control em /*: o padrão do Pages (revalidar sempre) é o certo para /, sw.js e manifest,
    // e um segundo Cache-Control seria juntado com vírgula ao das regras abaixo.
    expect(lidas.get('/*')).not.toHaveProperty('Cache-Control');
    for (const caminho of ['/assets/*', '/pyodide/*']) {
      expect(lidas.get(caminho)).toEqual({ 'Cache-Control': 'public, max-age=31536000, immutable' });
    }
  });

  it('respeita os limites do Pages: até 100 regras e 2.000 caracteres por linha', () => {
    const texto = arquivoDeCabecalhos();
    expect(regras(texto).size).toBeLessThanOrEqual(100);
    for (const linha of texto.split('\n')) expect(linha.length).toBeLessThanOrEqual(2000);
  });
});
