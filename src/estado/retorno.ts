// "Dar retorno" (ADR-0012): o e-mail é montado na hora, com a tela, o Python e os erros daquele momento.
import type { MouseEvent } from 'react';
import { enderecoDeRetorno } from '../jogo/retorno';
import { pythonDoJogo } from '../python/executor';
import { CONTATO } from './contato';
import { errosRecentes } from './registroDeErros';

export function enderecoDeRetornoAgora(): string {
  return enderecoDeRetorno(CONTATO, {
    versao: __VERSAO_DO_JOGO__,
    tela: window.location.hash || '#/',
    navegador: navigator.userAgent,
    python: pythonDoJogo.obterEstado(),
    erros: errosRecentes(),
  });
}

/** Props de um link de retorno: o href existe para quem inspeciona o link e é refeito no clique. */
export function linkDeRetorno() {
  return {
    href: enderecoDeRetornoAgora(),
    onClick: (evento: MouseEvent<HTMLAnchorElement>) => {
      evento.currentTarget.href = enderecoDeRetornoAgora();
    },
  };
}
