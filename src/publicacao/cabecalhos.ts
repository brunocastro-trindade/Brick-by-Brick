// Cabeçalhos de segurança e de cache (ADR-0009, ADR-0010, ADR-0014). Fonte única para a meta do index.html, o
// _headers que o Cloudflare lê e o vite preview da fumaça: nenhum cabeçalho é escrito à mão em outro lugar.

/** Só o próprio site (INV-09). O script-src muda entre o documento e o worker (abaixo). */
const DIRETIVAS = [
  "default-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
];

/**
 * Para a meta do index.html, que vale em qualquer host. Sem 'unsafe-eval': o documento não precisa de eval. A meta
 * vale só para o documento, e o navegador aplica ao documento as duas políticas juntas (meta e cabeçalho): o eval
 * fica barrado nele mesmo com o cabeçalho permitindo. frame-ancestors é ignorado em meta.
 */
export const POLITICA_NA_META = ["default-src 'self'", "script-src 'self'", ...DIRETIVAS.slice(1)].join('; ');

/**
 * Em cabeçalho, a política vale também para o worker do Python, que só obedece ao cabeçalho da própria resposta e
 * precisa de 'unsafe-eval' (o Emscripten do Pyodide usa eval). Ganha frame-ancestors: ninguém põe o jogo num iframe.
 */
const POLITICA_EM_CABECALHO = ["default-src 'self'", "script-src 'self' 'unsafe-eval'", ...DIRETIVAS.slice(1), "frame-ancestors 'none'"].join('; ');

export const CABECALHOS_DE_SEGURANCA: Record<string, string> = {
  'Content-Security-Policy': POLITICA_EM_CABECALHO,
  // Outra janela aberta pelo jogo, ou que abriu o jogo, não alcança esta; e nenhum site carrega arquivo daqui.
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000',
};

/** Nome com hash (/assets) ou com a versão no caminho (/pyodide/<versão>, ADR-0010): o conteúdo nunca muda. */
const CAMINHOS_IMUTAVEIS = ['/assets/*', '/pyodide/*'];
const CACHE_IMUTAVEL = 'public, max-age=31536000, immutable';

/**
 * O HTML pede revalidação (o padrão do Cloudflare) e proíbe reescrita na borda: com no-transform, o Cloudflare
 * não injeta o beacon do Web Analytics, o Rocket Loader nem a Email Obfuscation, mesmo ligados no painel (INV-09).
 */
const CAMINHOS_DO_HTML = ['/', '/index.html', '/404.html'];
export const CACHE_DO_HTML = 'public, max-age=0, must-revalidate, no-transform';

function regra(caminho: string, cabecalhos: Record<string, string>): string {
  return [caminho, ...Object.entries(cabecalhos).map(([nome, valor]) => `  ${nome}: ${valor}`)].join('\n');
}

/**
 * Arquivo _headers do Cloudflare. Sem Cache-Control em /*: o padrão do Cloudflare (revalidar sempre) é o certo
 * para sw.js e manifest, e ele junta com vírgula o mesmo cabeçalho vindo de duas regras.
 */
export function arquivoDeCabecalhos(): string {
  const regras = [
    regra('/*', CABECALHOS_DE_SEGURANCA),
    ...CAMINHOS_DO_HTML.map((caminho) => regra(caminho, { 'Cache-Control': CACHE_DO_HTML })),
    ...CAMINHOS_IMUTAVEIS.map((caminho) => regra(caminho, { 'Cache-Control': CACHE_IMUTAVEL })),
  ];
  return `${regras.join('\n\n')}\n`;
}
