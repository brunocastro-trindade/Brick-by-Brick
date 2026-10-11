import { describe, expect, it } from 'vitest';
import { etiquetas, publicacao, robots, sitemap } from './metadados';

const conteudo = (tags: ReturnType<typeof etiquetas>, chave: string) =>
  tags.find((tag) => tag.attrs.property === chave || tag.attrs.name === chave || tag.attrs.rel === chave);

describe('metadados de publicação (ADR-0013, ADR-0014)', () => {
  it('build local, sem variáveis: indexável, sem endereço absoluto nem sitemap', () => {
    const site = publicacao({});
    expect(site).toEqual({ url: null, indexavel: true });
    const tags = etiquetas(site);
    expect(conteudo(tags, 'og:image')?.attrs.content).toBe('/compartilhar.png');
    expect(conteudo(tags, 'og:url')).toBeUndefined();
    expect(conteudo(tags, 'robots')).toBeUndefined();
    expect(robots(site)).toBe('User-agent: *\nAllow: /\n');
    expect(sitemap(site)).toBeNull();
  });

  it('produção com domínio: endereço absoluto, canonical e sitemap', () => {
    const site = publicacao({ URL_DO_SITE: 'https://brick.exemplo.org/', AMBIENTE_DO_SITE: 'producao' });
    expect(site.url).toBe('https://brick.exemplo.org');
    const tags = etiquetas(site);
    expect(conteudo(tags, 'og:image')?.attrs.content).toBe('https://brick.exemplo.org/compartilhar.png');
    expect(conteudo(tags, 'og:url')?.attrs.content).toBe('https://brick.exemplo.org/');
    expect(conteudo(tags, 'canonical')?.attrs.href).toBe('https://brick.exemplo.org/');
    expect(robots(site)).toContain('Sitemap: https://brick.exemplo.org/sitemap.xml');
    expect(sitemap(site)).toContain('<loc>https://brick.exemplo.org/</loc>');
  });

  it('prévia no Workers Builds (branch que não é main) fica fora dos buscadores', () => {
    const site = publicacao({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'feat/fe-x' });
    expect(site).toEqual({ url: null, indexavel: false });
    expect(conteudo(etiquetas(site), 'robots')?.attrs.content).toBe('noindex, nofollow');
    expect(robots(site)).toBe('User-agent: *\nDisallow: /\n');
    expect(sitemap(site)).toBeNull();
  });

  it('produção no Workers Builds (main) entra nos buscadores e usa URL_DO_SITE', () => {
    expect(publicacao({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main' })).toEqual({ url: null, indexavel: true });
    expect(publicacao({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main', URL_DO_SITE: 'https://brickbybrick.com.br' })).toEqual({
      url: 'https://brickbybrick.com.br',
      indexavel: true,
    });
  });

  it('AMBIENTE_DO_SITE manda mais que a branch', () => {
    expect(publicacao({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main', AMBIENTE_DO_SITE: 'teste' }).indexavel).toBe(false);
  });

  it('variável mal configurada derruba o build em vez de publicar endereço errado', () => {
    expect(() => publicacao({ URL_DO_SITE: 'http://sem-https.org' })).toThrow(/URL_DO_SITE/);
    expect(() => publicacao({ URL_DO_SITE: 'brick.org' })).toThrow(/URL_DO_SITE/);
    expect(() => publicacao({ AMBIENTE_DO_SITE: 'prod' })).toThrow(/AMBIENTE_DO_SITE/);
  });
});
