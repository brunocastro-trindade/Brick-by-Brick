/// <reference types="vitest/config" />
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { parse } from 'yaml';

const require = createRequire(import.meta.url);
const PASTA_PYODIDE = path.dirname(require.resolve('pyodide/package.json'));

// Arquivos que o loadPyodide busca em tempo de execução (ADR-0002).
const ARQUIVOS_PYODIDE = ['pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
const TIPOS_MIME: Record<string, string> = {
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
  '.json': 'application/json',
};

// Política de segurança de conteúdo (ADR-0009): o navegador barra script, estilo, imagem, fonte e conexão
// de outro domínio em qualquer tela (INV-09), e não só no caminho que a fumaça percorre.
// 'unsafe-eval' é do Pyodide (o Emscripten usa eval), para o navegador que aplica a política da página ao
// worker; a página em si não chama eval.
const POLITICA_DE_CONTEUDO = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/** Põe a política no topo do index.html do build. No dev fica de fora: o Vite injeta script inline. */
function politicaDeConteudo(): Plugin {
  return {
    name: 'brick:politica-de-conteudo',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: POLITICA_DE_CONTEUDO }, injectTo: 'head-prepend' },
    ],
  };
}

/** Transforma cada obra em YAML num módulo JS com os dados já parseados (ADR-0003). */
function conteudoYaml(): Plugin {
  return {
    name: 'brick:conteudo-yaml',
    transform(codigo, id) {
      if (!id.endsWith('.yaml')) return null;
      return { code: `export default ${JSON.stringify(parse(codigo))};`, map: null };
    },
  };
}

/** Serve o runtime do Pyodide a partir de node_modules no dev e o copia para dist/pyodide no build. */
function pyodideLocal(): Plugin {
  return {
    name: 'brick:pyodide-local',
    configureServer(servidor) {
      servidor.middlewares.use('/pyodide', (req, res, proximo) => {
        const nome = (req.url ?? '').replace(/^\//, '').split('?')[0] ?? '';
        if (!ARQUIVOS_PYODIDE.includes(nome)) return proximo();
        res.setHeader('Content-Type', TIPOS_MIME[path.extname(nome)] ?? 'application/octet-stream');
        createReadStream(path.join(PASTA_PYODIDE, nome)).pipe(res);
      });
    },
    async generateBundle() {
      for (const nome of ARQUIVOS_PYODIDE) {
        this.emitFile({
          type: 'asset',
          fileName: `pyodide/${nome}`,
          source: await readFile(path.join(PASTA_PYODIDE, nome)),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), conteudoYaml(), pyodideLocal(), politicaDeConteudo()],
  optimizeDeps: { exclude: ['pyodide'] },
  worker: { format: 'es' },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
