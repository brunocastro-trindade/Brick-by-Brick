/// <reference types="vitest/config" />
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin, type Rolldown } from 'vite';
import { parse } from 'yaml';
import { arquivoDeCabecalhos, CABECALHOS_DE_SEGURANCA, POLITICA_NA_META } from './src/publicacao/cabecalhos';
import { etiquetas, publicacao, robots, sitemap } from './src/publicacao/metadados';

const require = createRequire(import.meta.url);
const PASTA_PYODIDE = path.dirname(require.resolve('pyodide/package.json'));
// A versão vai no caminho (ADR-0010): arquivo de Pyodide novo nunca tem o nome de um velho guardado em cache.
const VERSAO_DO_PYODIDE: string = require('pyodide/package.json').version;
const ROTA_PYODIDE = `pyodide/${VERSAO_DO_PYODIDE}`;

/** Versão que vai no retorno do beta (ADR-0012): a do package.json mais o commit, quando houver git. */
function versaoDoJogo(): string {
  const versao: string = require('./package.json').version;
  let commit = process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7) ?? '';
  if (!commit) {
    try {
      commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
    } catch {
      // Sem git (pacote baixado como zip): a versão do package.json basta.
    }
  }
  return commit ? `${versao}+${commit}` : versao;
}

// Arquivos que o loadPyodide busca em tempo de execução (ADR-0002).
const ARQUIVOS_PYODIDE = ['pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
const TIPOS_MIME: Record<string, string> = {
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
  '.json': 'application/json',
};

/**
 * Política de segurança de conteúdo (ADR-0009) no topo do index.html, que vale em qualquer host, e o _headers do
 * Cloudflare Pages (ADR-0013), com a mesma política em cabeçalho e o cache. Só no build: o dev do Vite injeta
 * script inline.
 */
function politicaDeConteudo(): Plugin {
  return {
    name: 'brick:politica-de-conteudo',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: POLITICA_NA_META }, injectTo: 'head-prepend' },
    ],
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: arquivoDeCabecalhos() });
    },
  };
}

/**
 * Etiquetas de compartilhamento, robots.txt e sitemap.xml (ADR-0013), conforme URL_DO_SITE e AMBIENTE_DO_SITE
 * (ou a branch do Cloudflare Pages). Prévia e teste saem com noindex.
 */
function metadadosDePublicacao(): Plugin {
  const site = publicacao(process.env);
  return {
    name: 'brick:metadados-de-publicacao',
    apply: 'build',
    transformIndexHtml: () => etiquetas(site).map((etiqueta) => ({ ...etiqueta, injectTo: 'head' as const })),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots(site) });
      const mapa = sitemap(site);
      if (mapa) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: mapa });
    },
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

/** Serve o runtime do Pyodide a partir de node_modules no dev e o copia para dist/pyodide/<versão> no build. */
function pyodideLocal(): Plugin {
  return {
    name: 'brick:pyodide-local',
    configureServer(servidor) {
      servidor.middlewares.use(`/${ROTA_PYODIDE}`, (req, res, proximo) => {
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
          fileName: `${ROTA_PYODIDE}/${nome}`,
          source: await readFile(path.join(PASTA_PYODIDE, nome)),
        });
      }
    },
  };
}

// A página entra como "/"; robots, sitemap e a imagem de compartilhar são para buscadores e redes, não para
// jogar sem internet. O _headers nem é servido pelo Pages: se entrasse na lista, o cache inteiro falharia.
const FORA_DO_CACHE = /^index\.html$|\.(map|txt|xml)$|^compartilhar\.png$|^_headers$/;

/** Conteúdo de um arquivo do bundle, para a versão do cache mudar quando qualquer arquivo mudar. */
function conteudoDoArquivo(arquivo: Rolldown.OutputBundle[string]): string | Uint8Array {
  return arquivo.type === 'chunk' ? arquivo.code : arquivo.source;
}

/**
 * Gera o sw.js (ADR-0010): o código de src/offline/servico.js precedido da lista de tudo o que o jogo usa e
 * de uma versão, hash de todo o conteúdo. Mudou um byte, muda a versão, e o navegador instala o cache novo.
 */
function servicoOffline(): Plugin {
  let base = '/';
  let publico = '';
  return {
    name: 'brick:servico-offline',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      base = config.base;
      publico = config.publicDir;
    },
    async generateBundle(_opcoes, bundle) {
      const hash = createHash('sha256');
      const doBuild = Object.keys(bundle).filter((nome) => !FORA_DO_CACHE.test(nome));
      for (const nome of Object.keys(bundle).sort()) hash.update(nome).update(conteudoDoArquivo(bundle[nome]));
      const entradas = await readdir(publico, { recursive: true, withFileTypes: true });
      const doPublico = entradas
        .filter((entrada) => entrada.isFile())
        .map((entrada) => path.relative(publico, path.join(entrada.parentPath, entrada.name)).split(path.sep).join('/'))
        .filter((nome) => !FORA_DO_CACHE.test(nome));
      for (const nome of doPublico.sort()) hash.update(nome).update(await readFile(path.join(publico, nome)));
      const servico = await readFile(path.resolve('src/offline/servico.js'), 'utf8');
      hash.update(servico);
      const arquivos = [base, ...[...doBuild, ...doPublico].sort().map((nome) => `${base}${nome}`)];
      const offline = { versao: hash.digest('hex').slice(0, 16), arquivos };
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `const OFFLINE = ${JSON.stringify(offline)};\n${servico}` });
    },
  };
}

export default defineConfig({
  plugins: [react(), conteudoYaml(), pyodideLocal(), politicaDeConteudo(), metadadosDePublicacao(), servicoOffline()],
  define: { __VERSAO_DO_PYODIDE__: JSON.stringify(VERSAO_DO_PYODIDE), __VERSAO_DO_JOGO__: JSON.stringify(versaoDoJogo()) },
  optimizeDeps: { exclude: ['pyodide'] },
  // O vite preview (fumaça) usa os mesmos cabeçalhos de segurança do Pages: o Python tem de carregar com a
  // política em cabeçalho, que vale também para o worker.
  preview: { headers: CABECALHOS_DE_SEGURANCA },
  worker: { format: 'es' },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
