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
  plugins: [react(), conteudoYaml(), pyodideLocal()],
  optimizeDeps: { exclude: ['pyodide'] },
  worker: { format: 'es' },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
