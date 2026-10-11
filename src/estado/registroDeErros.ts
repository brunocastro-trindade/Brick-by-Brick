// Últimos erros inesperados desta aba (ADR-0012). Ficam só na memória e só saem do navegador se a pessoa
// mandar o retorno por e-mail, onde aparecem para ela ler antes.

const LIMITE_DE_ERROS = 5;
const LIMITE_DO_TEXTO = 200;
const recentes: string[] = [];

export function anotarErro(erro: unknown): void {
  const texto = erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro);
  recentes.push(texto.slice(0, LIMITE_DO_TEXTO));
  if (recentes.length > LIMITE_DE_ERROS) recentes.shift();
}

export function errosRecentes(): string[] {
  return [...recentes];
}

export function esquecerErros(): void {
  recentes.length = 0;
}

/** Erros que escaparam de todo tratamento: exceção solta e promessa rejeitada sem catch. */
export function ouvirErrosDoNavegador(): void {
  window.addEventListener('error', (evento) => anotarErro(evento.error ?? evento.message));
  window.addEventListener('unhandledrejection', (evento) => anotarErro(evento.reason));
}
