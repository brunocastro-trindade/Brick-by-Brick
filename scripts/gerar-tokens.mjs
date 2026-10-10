#!/usr/bin/env node
// Gera src/styles/tokens.css a partir de tokens/base.json e tokens/semantico.json (HARNESS §2.1).
// Uso: node scripts/gerar-tokens.mjs            → escreve o arquivo
//      node scripts/gerar-tokens.mjs --verificar → falha se o arquivo commitado estiver desatualizado
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destino = path.join(raiz, 'src/styles/tokens.css');

const base = JSON.parse(await readFile(path.join(raiz, 'tokens/base.json'), 'utf8'));
const semantico = JSON.parse(await readFile(path.join(raiz, 'tokens/semantico.json'), 'utf8'));

/** Achata { cor: { creme: '#..' } } em [['cor-creme', '#..']]. Objetos { tamanho, altura } viram dois tokens. */
function achatar(objeto, prefixo = []) {
  const pares = [];
  for (const [chave, valor] of Object.entries(objeto)) {
    if (chave.startsWith('$')) continue;
    const nome = [...prefixo, chave];
    if (typeof valor === 'object' && valor !== null) pares.push(...achatar(valor, nome));
    else pares.push([nome.join('-'), String(valor)]);
  }
  return pares;
}

const primitivos = new Map(achatar(base));

/** Resolve "{grupo.nome}" para var(--base-grupo-nome). Referências compostas (tipo) expandem em subtokens. */
function resolver(valor, nomeSemantico) {
  const referencia = /^\{([^}]+)\}$/.exec(valor);
  if (!referencia) {
    throw new Error(`Token semântico "${nomeSemantico}" tem valor literal "${valor}". Use uma referência {grupo.nome}.`);
  }
  const caminho = referencia[1].split('.');
  const alvo = caminho.reduce((no, parte) => (no && typeof no === 'object' ? no[parte] : undefined), base);
  if (alvo === undefined) throw new Error(`Referência {${referencia[1]}} em "${nomeSemantico}" não existe em base.json.`);
  if (typeof alvo !== 'object') return [[nomeSemantico, `var(--base-${caminho.join('-')})`]];
  return achatar(alvo).map(([sufixo]) => [`${nomeSemantico}-${sufixo}`, `var(--base-${caminho.join('-')}-${sufixo})`]);
}

const semanticos = achatar(semantico).flatMap(([nome, valor]) => resolver(valor, nome));

const linhas = [
  '/* Gerado por scripts/gerar-tokens.mjs a partir de tokens/*.json. Não edite à mão: rode `npm run tokens`. */',
  ':root {',
  '  /* Primitivos — uso exclusivo deste arquivo */',
  ...[...primitivos].map(([nome, valor]) => `  --base-${nome}: ${valor};`),
  '',
  '  /* Semânticos — a única camada que componentes podem ler */',
  ...semanticos.map(([nome, valor]) => `  --${nome}: ${valor};`),
  '}',
  '',
];
const css = linhas.join('\n');

if (process.argv.includes('--verificar')) {
  const atual = await readFile(destino, 'utf8').catch(() => '');
  if (atual !== css) {
    console.error('✗ src/styles/tokens.css está desatualizado. Rode `npm run tokens` e commite o resultado.');
    process.exit(1);
  }
  console.log('✓ tokens.css em dia com tokens/*.json');
} else {
  await writeFile(destino, css);
  console.log(`✓ ${path.relative(raiz, destino)} gerado (${primitivos.size} primitivos, ${semanticos.length} semânticos)`);
}
