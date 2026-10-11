// Retorno do beta por e-mail (ADR-0012): a pessoa escreve, e o diagnóstico técnico vai junto, visível e
// editável na própria mensagem. Nada sai do navegador sem ela apertar enviar.

export interface Diagnostico {
  versao: string;
  /** Rota atual (hash), para saber em que obra ou tela foi. */
  tela: string;
  navegador: string;
  python: string;
  erros: string[];
}

export const ASSUNTO_DO_RETORNO = 'Retorno do beta do Brick by Brick';
/** Alguns programas de e-mail cortam mailto muito longo; melhor cortar aqui, com reticências. */
const LIMITE_DO_CORPO = 1500;

export function enderecoDeRetorno(contato: string, diagnostico: Diagnostico): string {
  const linhas = [
    'O que aconteceu (ou qual é a ideia)?',
    '',
    '',
    '',
    '— Para a equipe do jogo (pode apagar o que quiser) —',
    `Versão: ${diagnostico.versao}`,
    `Tela: ${diagnostico.tela}`,
    `Navegador: ${diagnostico.navegador}`,
    `Python: ${diagnostico.python}`,
    diagnostico.erros.length > 0 ? 'Erros recentes:' : 'Erros recentes: nenhum',
    ...diagnostico.erros.map((erro) => `- ${erro}`),
  ];
  let corpo = linhas.join('\r\n');
  if (corpo.length > LIMITE_DO_CORPO) corpo = `${corpo.slice(0, LIMITE_DO_CORPO - 1)}…`;
  return `mailto:${contato}?subject=${encodeURIComponent(ASSUNTO_DO_RETORNO)}&body=${encodeURIComponent(corpo)}`;
}
