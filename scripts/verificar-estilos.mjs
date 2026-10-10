#!/usr/bin/env node
// Barra deriva de design system (HARNESS §2.1, §2.2 e §5.2): em src/, nenhum valor literal de cor ou px
// e nenhuma leitura de primitivo (--base-*) fora de src/styles/tokens.css.
// Exceção consciente: a linha leva o comentário `fora-da-escala: motivo`.
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pastaSrc = path.join(raiz, 'src');
const ignorados = new Set([path.join(pastaSrc, 'styles/tokens.css')]);

const regrasCss = [
  { padrao: /#[0-9a-fA-F]{3,8}\b/, motivo: 'cor hexadecimal literal' },
  { padrao: /\b(rgba?|hsla?)\(/, motivo: 'cor rgb/hsl literal' },
  { padrao: /\b\d+(\.\d+)?px\b/, motivo: 'valor em px literal' },
  { padrao: /--base-/, motivo: 'leitura de token primitivo' },
];
const regrasTs = [
  { padrao: /(['"`])#[0-9a-fA-F]{3,8}\1/, motivo: 'cor hexadecimal literal' },
  { padrao: /(['"`])[^'"`]*\b\d+(\.\d+)?px\b[^'"`]*\1/, motivo: 'valor em px literal' },
  { padrao: /--base-/, motivo: 'leitura de token primitivo' },
];

async function* arquivos(pasta) {
  for (const entrada of await readdir(pasta, { withFileTypes: true })) {
    const caminho = path.join(pasta, entrada.name);
    if (entrada.isDirectory()) yield* arquivos(caminho);
    else if (!ignorados.has(caminho)) yield caminho;
  }
}

const violacoes = [];
for await (const arquivo of arquivos(pastaSrc)) {
  const extensao = path.extname(arquivo);
  const regras = extensao === '.css' ? regrasCss : ['.ts', '.tsx'].includes(extensao) ? regrasTs : null;
  if (!regras) continue;
  const linhas = (await readFile(arquivo, 'utf8')).split('\n');
  linhas.forEach((linha, indice) => {
    if (linha.includes('fora-da-escala')) return;
    for (const { padrao, motivo } of regras) {
      if (padrao.test(linha)) violacoes.push(`${path.relative(raiz, arquivo)}:${indice + 1} — ${motivo}: ${linha.trim()}`);
    }
  });
}

if (violacoes.length > 0) {
  console.error('✗ Valor literal fora do design system. Use token semântico ou marque /* fora-da-escala: motivo */\n');
  for (const violacao of violacoes) console.error(`  ${violacao}`);
  process.exit(1);
}
console.log('✓ Estilos só usam tokens semânticos');
