import { describe, expect, it } from 'vitest';
import { arquivoDeCabecalhos, CABECALHOS_DE_SEGURANCA, CACHE_DO_HTML, POLITICA_NA_META } from './cabecalhos';

/** Lê o _headers no formato do Cloudflare: caminho na coluna 0, cabeçalhos recuados abaixo. */
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

describe('cabeçalhos do host (ADR-0014)', () => {
  it('a política em cabeçalho é a da meta mais frame-ancestors, que a meta não aceita', () => {
    expect(POLITICA_NA_META).toContain("default-src 'self'");
    expect(POLITICA_NA_META).not.toContain('frame-ancestors');
    // O documento fica sem eval (meta); o worker do Python, que só lê o cabeçalho, mantém o 'unsafe-eval'.
    expect(POLITICA_NA_META).toContain("script-src 'self';");
    expect(POLITICA_NA_META).not.toContain('unsafe-eval');
    const emCabecalho = CABECALHOS_DE_SEGURANCA['Content-Security-Policy'] ?? '';
    expect(emCabecalho).toContain("script-src 'self' 'unsafe-eval'");
    expect(emCabecalho).toContain("frame-ancestors 'none'");
    expect(emCabecalho.replace(" 'unsafe-eval'", '').replace("; frame-ancestors 'none'", '')).toBe(POLITICA_NA_META);
    expect(CABECALHOS_DE_SEGURANCA['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(CABECALHOS_DE_SEGURANCA['Cross-Origin-Resource-Policy']).toBe('same-origin');
  });

  it('_headers põe a segurança em tudo e cache imutável só no que tem hash ou versão no nome', () => {
    const lidas = regras(arquivoDeCabecalhos());
    expect([...lidas.keys()]).toEqual(['/*', '/', '/index.html', '/404.html', '/assets/*', '/pyodide/*']);
    expect(lidas.get('/*')).toEqual(CABECALHOS_DE_SEGURANCA);
    // Sem Cache-Control em /*: o padrão do Cloudflare (revalidar sempre) é o certo para /, sw.js e manifest,
    // e um segundo Cache-Control seria juntado com vírgula ao das regras abaixo.
    expect(lidas.get('/*')).not.toHaveProperty('Cache-Control');
    for (const caminho of ['/assets/*', '/pyodide/*']) {
      expect(lidas.get(caminho)).toEqual({ 'Cache-Control': 'public, max-age=31536000, immutable' });
    }
  });

  it('o HTML revalida sempre e proíbe a borda de reescrever a página (INV-09: nada de beacon injetado)', () => {
    const lidas = regras(arquivoDeCabecalhos());
    expect(CACHE_DO_HTML).toContain('no-transform');
    expect(CACHE_DO_HTML).toContain('max-age=0');
    for (const caminho of ['/', '/index.html', '/404.html']) expect(lidas.get(caminho)).toEqual({ 'Cache-Control': CACHE_DO_HTML });
  });

  it('respeita os limites do _headers: até 100 regras e 2.000 caracteres por linha', () => {
    const texto = arquivoDeCabecalhos();
    expect(regras(texto).size).toBeLessThanOrEqual(100);
    for (const linha of texto.split('\n')) expect(linha.length).toBeLessThanOrEqual(2000);
  });
});
