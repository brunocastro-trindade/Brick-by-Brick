// Service worker do Brick by Brick (ADR-0010): guarda no aparelho o jogo inteiro, Pyodide incluído, de uma
// vez só. Da visita seguinte em diante tudo sai daqui, inclusive sem internet.
// O build põe antes deste código a constante OFFLINE = { versao, arquivos } (plugin brick:servico-offline).
/* global OFFLINE */

const PREFIXO = 'brick-by-brick-';
const CACHE = `${PREFIXO}${OFFLINE.versao}`;
const PAGINA = OFFLINE.arquivos[0];

// Tudo ou nada: se um arquivo falhar, a instalação falha e o jogo segue pela rede, como antes.
self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(OFFLINE.arquivos)));
});

// Versão nova só assume quando nenhuma aba usa a velha (sem skipWaiting); aí apaga o cache velho.
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((nome) => nome.startsWith(PREFIXO) && nome !== CACHE).map((nome) => caches.delete(nome))))
      .then(() => self.clients.claim()),
  );
});

/** A página vem da rede quando há rede, para pegar a versão nova; sem rede, a guardada. */
async function pagina(pedido) {
  try {
    return await fetch(pedido);
  } catch {
    return (await caches.match(PAGINA, { cacheName: CACHE, ignoreVary: true })) ?? Response.error();
  }
}

/**
 * Arquivo com hash ou versão no nome nunca muda de conteúdo: o guardado vale sempre. `ignoreVary` porque o
 * servidor responde com `Vary: Origin` ou `Accept-Encoding`, e o script com crossorigin pede com um Origin que
 * o pedido guardado não tinha: sem isso, nada casaria e o jogo não abriria sem internet.
 */
async function arquivo(pedido) {
  return (await caches.match(pedido, { cacheName: CACHE, ignoreVary: true })) ?? fetch(pedido);
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;
  evento.respondWith(pedido.mode === 'navigate' ? pagina(pedido) : arquivo(pedido));
});
