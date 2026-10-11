// Metadados de publicação (ADR-0013): o que buscadores, redes sociais e mensageiros leem, conforme o
// endereço do site e o ambiente. Usado pelo vite.config no build; aqui fica só a regra, testável.

export interface AmbienteDeBuild {
  URL_DO_SITE?: string;
  AMBIENTE_DO_SITE?: string;
  /** Postas pelo Cloudflare Pages no build: '1', a branch e o endereço desta implantação. */
  CF_PAGES?: string;
  CF_PAGES_BRANCH?: string;
  CF_PAGES_URL?: string;
}

export interface Publicacao {
  /** Endereço de produção, sem barra no fim; null num build local sem domínio. */
  url: string | null;
  /** Só produção entra nos buscadores; prévia e teste ficam com noindex. */
  indexavel: boolean;
}

export interface Etiqueta {
  tag: 'meta' | 'link';
  attrs: Record<string, string>;
}

const TITULO = 'Brick by Brick: aprenda Python construindo uma cidade';
const DESCRICAO =
  'Jogo gratuito e de código aberto: cada prédio é uma aula, cada mini desafio dá tijolos de código, e o Python roda de verdade no navegador.';
const IMAGEM = 'compartilhar.png';
const IMAGEM_ALT = 'Logo do Brick by Brick ao lado do Guglo, o pinguim pedreiro de capacete, assentando tijolos.';

/** Branch que o Cloudflare Pages publica como produção (ADR-0013); as outras viram prévia. */
const BRANCH_DE_PRODUCAO = 'main';

export function publicacao(ambiente: AmbienteDeBuild): Publicacao {
  const noPages = ambiente.CF_PAGES === '1';
  const nome = ambiente.AMBIENTE_DO_SITE ?? (noPages && ambiente.CF_PAGES_BRANCH !== BRANCH_DE_PRODUCAO ? 'teste' : 'producao');
  if (nome !== 'producao' && nome !== 'teste') {
    throw new Error(`AMBIENTE_DO_SITE precisa ser "producao" ou "teste"; veio "${nome}"`);
  }
  // Em produção, só URL_DO_SITE: o endereço da implantação (abc123.projeto.pages.dev) não serve de canonical.
  const bruta = ambiente.URL_DO_SITE ?? (noPages && nome === 'teste' ? (ambiente.CF_PAGES_URL ?? '') : '');
  if (bruta && !/^https:\/\/[^/\s]+\/?$/.test(bruta)) {
    throw new Error(`URL_DO_SITE precisa ser só https://dominio, sem caminho; veio "${bruta}"`);
  }
  return { url: bruta ? bruta.replace(/\/$/, '') : null, indexavel: nome === 'producao' };
}

export function etiquetas({ url, indexavel }: Publicacao): Etiqueta[] {
  const meta = (chave: 'name' | 'property', valor: string, conteudo: string): Etiqueta => ({
    tag: 'meta',
    attrs: { [chave]: valor, content: conteudo },
  });
  return [
    ...(indexavel ? [] : [meta('name', 'robots', 'noindex, nofollow')]),
    ...(url ? [{ tag: 'link' as const, attrs: { rel: 'canonical', href: `${url}/` } }, meta('property', 'og:url', `${url}/`)] : []),
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', 'Brick by Brick'),
    meta('property', 'og:locale', 'pt_BR'),
    meta('property', 'og:title', TITULO),
    meta('property', 'og:description', DESCRICAO),
    meta('property', 'og:image', `${url ?? ''}/${IMAGEM}`),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('property', 'og:image:alt', IMAGEM_ALT),
    meta('name', 'twitter:card', 'summary_large_image'),
  ];
}

export function robots({ url, indexavel }: Publicacao): string {
  if (!indexavel) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\n${url ? `\nSitemap: ${url}/sitemap.xml\n` : ''}`;
}

/** O jogo é uma página só (rotas por hash): o sitemap tem um endereço. */
export function sitemap({ url, indexavel }: Publicacao): string | null {
  if (!url || !indexavel) return null;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${url}/</loc></url>\n</urlset>\n`;
}
