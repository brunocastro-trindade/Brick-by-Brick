#!/usr/bin/env node
// Teste de fumaça (HARNESS §5.5): abre o jogo num Chromium de verdade, espera o Python carregar
// no navegador e joga o primeiro mini desafio do Correio — errando uma vez e acertando depois —
// acerta uma peça do Guglo Wars, abre o Anuncie aqui e garante que nada veio de outro domínio (INV-09)
// e que a política de segurança de conteúdo está no ar sem barrar o próprio jogo (ADR-0009). Por fim, tira
// a rede e confere que o jogo abre do aparelho, com o Python saindo do service worker (ADR-0010).
//
// Uso:  npm run build && npx vite preview --port 4173   (em outro terminal)
//       npm run fumaca
// Variáveis: URL_DO_JOGO (padrão http://localhost:4173) e CHROMIUM (caminho do navegador).
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const URL_DO_JOGO = process.env.URL_DO_JOGO ?? 'http://localhost:4173';
const PASTA = 'artefatos';
const CANDIDATOS = [process.env.CHROMIUM, '/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
const executavel = CANDIDATOS.find((caminho) => existsSync(caminho));
if (!executavel) {
  console.error('✗ Nenhum Chromium encontrado. Defina CHROMIUM=/caminho/do/navegador.');
  process.exit(1);
}

await mkdir(PASTA, { recursive: true });
const navegador = await chromium.launch({ executablePath: executavel, args: ['--no-sandbox'] });
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 860 } });
const erros = [];
pagina.on('console', (mensagem) => mensagem.type() === 'error' && erros.push(mensagem.text()));
pagina.on('pageerror', (erro) => erros.push(erro.message));
// INV-09 (ADR-0008): nada de outro domínio no navegador de quem estuda — nem script, nem fonte, nem anúncio.
const origemDoJogo = new URL(URL_DO_JOGO).origin;
const deFora = new Set();
pagina.on('request', (requisicao) => {
  const endereco = new URL(requisicao.url());
  if (['http:', 'https:', 'ws:', 'wss:'].includes(endereco.protocol) && endereco.origin !== origemDoJogo) deFora.add(endereco.origin);
});
// ADR-0009: o que a política barrar, em qualquer navegação, fica anotado para o último passo.
const violacoes = [];
await pagina.exposeFunction('anotarViolacaoDaPolitica', (descricao) => violacoes.push(descricao));
await pagina.addInitScript(() => {
  globalThis.document.addEventListener('securitypolicyviolation', (evento) =>
    globalThis.anotarViolacaoDaPolitica(`${evento.effectiveDirective} ${evento.blockedURI}`),
  );
});

const passo = async (descricao, acao) => {
  try {
    await acao();
    console.log(`✓ ${descricao}`);
  } catch (erro) {
    await pagina.screenshot({ path: `${PASTA}/falha.png`, fullPage: true });
    console.error(`✗ ${descricao}\n  ${erro instanceof Error ? erro.message : erro}\n  captura: ${PASTA}/falha.png`);
    await navegador.close();
    process.exit(1);
  }
};

await passo('a home tem o link "Mande seu feedback", com diagnóstico (ADR-0012)', async () => {
  await pagina.goto(`${URL_DO_JOGO}/#/`);
  const endereco = (await pagina.getByRole('link', { name: 'Mande seu feedback' }).getAttribute('href')) ?? '';
  const corpo = decodeURIComponent(endereco.split('body=')[1] ?? '');
  if (!endereco.startsWith('mailto:amaatShin@proton.me?subject=') || !corpo.includes('Versão: ')) {
    throw new Error(`link de retorno inesperado: ${endereco.slice(0, 120)}`);
  }
});
await passo('abre a tela inicial', async () => {
  await pagina.goto(`${URL_DO_JOGO}/#/`);
  await pagina.getByRole('button', { name: /Começar a construir/ }).click();
});
await passo('entra no Correio pela cidade', async () => {
  await pagina.getByRole('button', { name: 'Entrar na obra' }).click();
  await pagina.getByRole('button', { name: 'Começar a obra' }).click();
});
await passo('o Python carrega no navegador (até 60 s)', async () => {
  await pagina.getByText('Python pronto').first().waitFor({ timeout: 60_000 });
});
await passo('tijolo sem aspas é recusado com explicação', async () => {
  await pagina.getByRole('button', { name: /Tijolo .*: Olá, mundo!$/ }).click();
  await pagina.getByRole('button', { name: /Assentar linha/ }).click();
  await pagina.getByText('Esse tijolo tem um problema').waitFor({ timeout: 10_000 });
});
await passo('tijolo certo assenta a fiada e o console mostra a saída', async () => {
  await pagina.getByRole('button', { name: /Espaço 1 de 1/ }).click();
  await pagina.getByRole('button', { name: /Tijolo texto: "Olá, mundo!"/ }).click();
  await pagina.getByRole('button', { name: /Assentar linha/ }).click();
  await pagina.getByRole('button', { name: /Próximo tijolo/ }).waitFor({ timeout: 10_000 });
  await pagina.locator('section[aria-label="Console do programa"]').getByText('Olá, mundo!').waitFor({ timeout: 10_000 });
});
await passo('progresso sobrevive a recarregar a página', async () => {
  await pagina.reload();
  await pagina.getByText('Mini desafio 2 de 5').waitFor({ timeout: 10_000 });
});

await passo('Guglo Wars fica fechado sem obra concluída', async () => {
  await pagina.goto(`${URL_DO_JOGO}/#/guglo-wars`);
  await pagina.getByText('O Guglo Wars usa as linhas que você já construiu').waitFor({ timeout: 10_000 });
});
await passo('Guglo Wars: digitar a peça antes de ela cair pontua (modo livre)', async () => {
  await pagina.evaluate(() => {
    const chave = 'brick-by-brick:progresso:v1';
    localStorage.setItem(chave, JSON.stringify({ ...JSON.parse(localStorage.getItem(chave) ?? '{}'), modoLivre: true }));
  });
  await pagina.reload();
  await pagina.getByRole('button', { name: 'Começar partida' }).click();
  const anuncio = await pagina.locator('[aria-live="polite"]').innerText();
  await pagina.locator('#digitar-peca').fill(anuncio.replace(/^.*?Copie: /s, ''));
  await pagina.getByText(/Acertou! Mais \d+ pontos/).waitFor({ timeout: 5_000 });
});
await passo('Guglo Wars: Enter errado não deixa peça fantasma no poço', async () => {
  const entrada = pagina.locator('#digitar-peca');
  await entrada.fill('x');
  await entrada.press('Enter');
  await entrada.fill('');
  const anuncio = await pagina.locator('[aria-live="polite"]').innerText();
  await entrada.fill(anuncio.replace(/^.*?(Copie: |Complete a lacuna: )/s, ''));
  await pagina.getByText(/Acertou! Mais \d+ pontos/).waitFor({ timeout: 5_000 });
  const pecas = await pagina.locator('[data-peca="da-vez"]').count();
  if (pecas !== 1) throw new Error(`${pecas} peças da vez no poço`);
});

await passo('progresso vai para um arquivo e volta pelos Ajustes (ADR-0011)', async () => {
  await pagina.goto(`${URL_DO_JOGO}/#/cidade`);
  await pagina.getByRole('button', { name: 'Ajustes' }).click();
  const [baixado] = await Promise.all([pagina.waitForEvent('download'), pagina.getByRole('button', { name: 'Baixar progresso' }).click()]);
  const caminho = await baixado.path();
  const conteudo = JSON.parse(await readFile(caminho, 'utf8'));
  if (conteudo.formato !== 'brick-by-brick/progresso') throw new Error(`arquivo inesperado: ${JSON.stringify(conteudo).slice(0, 80)}`);
  await pagina.locator('input[type="file"]').setInputFiles(caminho);
  await pagina.getByText('O arquivo tem').waitFor({ timeout: 5_000 });
  await pagina.getByRole('button', { name: 'Trocar pelo do arquivo' }).click();
  await pagina.getByRole('status').getByText('Progresso carregado.').waitFor({ timeout: 5_000 });
  await pagina.getByRole('button', { name: 'Fechar ajustes' }).click();
});
await passo('Anuncie aqui abre com o e-mail de contato', async () => {
  await pagina.goto(`${URL_DO_JOGO}/#/anuncie`);
  await pagina.getByRole('heading', { name: /Sua marca na cidade/ }).waitFor({ timeout: 10_000 });
  const endereco = await pagina.getByRole('link', { name: 'Enviar e-mail' }).first().getAttribute('href');
  if (!endereco?.startsWith('mailto:amaatShin@proton.me')) throw new Error(`link de contato inesperado: ${endereco}`);
});
await passo('sem internet, o jogo abre do aparelho e o Python carrega (ADR-0010)', async () => {
  // O service worker se registra com o Python pronto; `ready` só resolve depois de ele guardar tudo.
  await pagina.evaluate(() => globalThis.navigator.serviceWorker.ready);
  const wasmDoServico = [];
  const anotar = (resposta) => resposta.url().endsWith('.wasm') && wasmDoServico.push(resposta.fromServiceWorker());
  pagina.on('response', anotar);
  await pagina.context().setOffline(true);
  try {
    // goto só troca o hash (mesmo documento); o reload é que baixa tudo de novo, agora sem rede.
    await pagina.goto(`${URL_DO_JOGO}/#/`);
    await pagina.reload();
    await pagina.getByText('Python pronto').first().waitFor({ timeout: 60_000 });
  } finally {
    await pagina.context().setOffline(false);
    pagina.off('response', anotar);
  }
  if (!wasmDoServico.includes(true)) throw new Error(`o .wasm não veio do service worker: ${JSON.stringify(wasmDoServico)}`);
});
await passo('nenhuma requisição a outro domínio (INV-09)', async () => {
  if (deFora.size > 0) throw new Error(`o jogo pediu algo a: ${[...deFora].join(', ')}`);
});
await passo('política de segurança de conteúdo na meta e no cabeçalho, sem barrar o jogo (ADR-0009, ADR-0013)', async () => {
  const politica = await pagina.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  if (!politica?.includes("default-src 'self'")) throw new Error(`política ausente ou sem default-src 'self': ${politica}`);
  // Em cabeçalho (ADR-0013), como no Cloudflare Pages: vale também para o worker do Python e proíbe iframe.
  const emCabecalho = (await pagina.request.get(`${URL_DO_JOGO}/`)).headers()['content-security-policy'] ?? '';
  if (!emCabecalho.includes("frame-ancestors 'none'")) throw new Error(`política em cabeçalho ausente: ${emCabecalho}`);
  if (violacoes.length > 0) throw new Error(`a política barrou: ${violacoes.join(', ')}`);
});

await pagina.screenshot({ path: `${PASTA}/fumaca.png`, fullPage: true });
await navegador.close();
if (erros.length > 0) {
  console.error(`✗ Erros no console do navegador:\n  ${erros.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ Fumaça ok. Captura em ${PASTA}/fumaca.png`);
