/// <reference types="vite/client" />

/** Versão do Pyodide em node_modules, posta pelo vite.config (ADR-0010): os arquivos moram em /pyodide/<versão>/. */
declare const __VERSAO_DO_PYODIDE__: string;
/** Versão do jogo com o commit (ADR-0012), para o retorno do beta dizer de qual build veio. */
declare const __VERSAO_DO_JOGO__: string;

declare module '*.yaml' {
  const dados: unknown;
  export default dados;
}
