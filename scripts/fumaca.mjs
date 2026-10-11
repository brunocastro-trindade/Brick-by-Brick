#!/usr/bin/env node
// Teste de fumaça (HARNESS §5.5): abre o jogo num Chromium de verdade, espera o Python carregar
// no navegador e joga o primeiro mini desafio do Correio — errando uma vez e acertando depois —
// e acerta uma peça do Guglo Wars.
//
// Uso:  npm run build && npx vite preview --port 4173   (em outro terminal)
//       npm run fumaca
// Variáveis: URL_DO_JOGO (padrão http://localhost:4173) e CHROMIUM (caminho do navegador).
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
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

await pagina.screenshot({ path: `${PASTA}/fumaca.png`, fullPage: true });
await navegador.close();
if (erros.length > 0) {
  console.error(`✗ Erros no console do navegador:\n  ${erros.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ Fumaça ok. Captura em ${PASTA}/fumaca.png`);
