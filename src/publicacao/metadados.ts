// Metadados de publicação (ADR-0013): o que buscadores, redes sociais e mensageiros leem, conforme o
// endereço do site e o ambiente. Usado pelo vite.config no build; aqui fica só a regra, testável.

export interface AmbienteDeBuild {
  URL_DO_SITE?: string;
  AMBIENTE_DO_SITE?: string;
  VERCEL_ENV?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
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

export function publicacao(ambiente: AmbienteDeBuild): Publicacao {
  const vercel = ambiente.VERCEL_PROJECT_PRODUCTION_URL ? `https://${ambiente.VERCEL_PROJECT_PRODUCTION_URL}` : '';
  const bruta = ambiente.URL_DO_SITE ?? vercel;
  if (bruta && !/^https:\/\/[^/\s]+\/?$/.test(bruta)) {
    throw new Error(`URL_DO_SITE precisa ser só https://dominio, sem caminho; veio "${bruta}"`);
  }
  const nome = ambiente.AMBIENTE_DO_SITE ?? (ambiente.VERCEL_ENV && ambiente.VERCEL_ENV !== 'production' ? 'teste' : 'producao');
  if (nome !== 'producao' && nome !== 'teste') {
    throw new Error(`AMBIENTE_DO_SITE precisa ser "producao" ou "teste"; veio "${nome}"`);
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
