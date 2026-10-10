// Decide se a tentativa do jogador encaixa (ADR-0004):
// 1. tijolo extra usado → mostra o porquê dele;
// 2. igual à planta (ignorando espaços e aspas) → certo;
// 3. com Python pronto → roda os dois programas e compara comportamento;
// 4. sem Python → diz que não encaixou e, se der, onde.
import type { ErroPython, Executor, ResultadoExecucao } from '../python/tipos';
import { CORPO_DE_SONDAGEM, fecharBlocoAberto, linhasAntesDoPasso, textoDoPrograma } from './programa';
import { linhasEquivalentes } from './tokenizador';
import type { Desafio, Linha, Obra, Tijolo, TijoloExtra } from './tipos';

export interface Tentativa {
  linhas: Linha[];
  /** Tijolos usados (vazio quando o jogador digita). */
  tijolos: Tijolo[];
  /** No `montar`: o texto colocado em cada vaga. */
  vagas?: string[];
}

export type Diagnostico =
  | { tipo: 'vaga'; indice: number }
  | { tipo: 'ordem'; indice: number }
  | { tipo: 'recuo'; indice: number };

export type MotivoDiferenca =
  | { tipo: 'saida'; esperado: string; obtido: string; entradas: string[] }
  | { tipo: 'variavel'; nome: string; esperado: string | null; obtido: string | null }
  | { tipo: 'teste'; codigo: string; esperado: string; obtido: string };

export type Veredito =
  | { tipo: 'certo'; via: 'planta' | 'comportamento' }
  | { tipo: 'tijolo-extra'; tijolo: TijoloExtra }
  | { tipo: 'erro-python'; erro: ErroPython; linhaNaTentativa: number | null; diagnostico: Diagnostico | null }
  | { tipo: 'resultado-diferente'; motivo: MotivoDiferenca; diagnostico: Diagnostico | null }
  | { tipo: 'sem-python'; diagnostico: Diagnostico | null };

export function linhasIguais(a: Linha[], b: Linha[]): boolean {
  return (
    a.length === b.length &&
    a.every((linha, indice) => {
      const outra = b[indice];
      return outra !== undefined && linha.recuo === outra.recuo && linhasEquivalentes(linha.texto, outra.texto);
    })
  );
}

/** Aponta o primeiro ponto onde a tentativa se afasta da planta. */
export function diagnosticar(desafio: Desafio, tentativa: Tentativa): Diagnostico | null {
  if (desafio.tipo === 'montar' && tentativa.vagas) {
    const vagas = tentativa.vagas;
    const indice = desafio.resposta.findIndex((resposta, posicao) => vagas[posicao] !== resposta);
    return indice >= 0 ? { tipo: 'vaga', indice } : null;
  }
  if (desafio.tipo === 'empilhar') {
    const ordem = desafio.linhas.findIndex((linha, indice) => {
      const colocada = tentativa.linhas[indice];
      return !colocada || !linhasEquivalentes(linha.texto, colocada.texto);
    });
    if (ordem >= 0) return { tipo: 'ordem', indice: ordem };
    const recuo = desafio.linhas.findIndex((linha, indice) => linha.recuo !== tentativa.linhas[indice]?.recuo);
    if (recuo >= 0) return { tipo: 'recuo', indice: recuo };
  }
  return null;
}

function primeiraVariavelDiferente(
  esperadas: Record<string, string>,
  obtidas: Record<string, string>,
): { nome: string; esperado: string | null; obtido: string | null } | null {
  const nomes = [...new Set([...Object.keys(esperadas), ...Object.keys(obtidas)])].sort();
  for (const nome of nomes) {
    const esperado = esperadas[nome] ?? null;
    const obtido = obtidas[nome] ?? null;
    if (esperado !== obtido) return { nome, esperado, obtido };
  }
  return null;
}

const cacheDaPlanta = new Map<string, ResultadoExecucao>();

async function executarPlanta(executor: Executor, codigo: string, verificacao: string | undefined, entradas: string[]) {
  const chave = JSON.stringify([codigo, verificacao ?? '', entradas]);
  const guardado = cacheDaPlanta.get(chave);
  if (guardado) return guardado;
  const resultado = await executor.executar({ codigo, verificacao, entradas });
  cacheDaPlanta.set(chave, resultado);
  return resultado;
}

export async function avaliarTentativa(parametros: {
  obra: Obra;
  passo: number;
  tentativa: Tentativa;
  executor: Executor | null;
}): Promise<Veredito> {
  const { obra, passo, tentativa, executor } = parametros;
  const desafio = obra.desafios[passo];
  if (!desafio) throw new Error(`A obra ${obra.id} não tem o passo ${passo}`);

  const extra = tentativa.tijolos.find((tijolo): tijolo is TijoloExtra => tijolo.classificacao !== undefined);
  if (extra) return { tipo: 'tijolo-extra', tijolo: extra };
  if (linhasIguais(tentativa.linhas, desafio.linhas)) return { tipo: 'certo', via: 'planta' };

  const diagnostico = diagnosticar(desafio, tentativa);
  if (!executor?.pronto()) return { tipo: 'sem-python', diagnostico };

  const anteriores = linhasAntesDoPasso(obra, passo);
  const codigoPlanta = textoDoPrograma(fecharBlocoAberto([...anteriores, ...desafio.linhas], CORPO_DE_SONDAGEM));
  const codigoJogador = textoDoPrograma(fecharBlocoAberto([...anteriores, ...tentativa.linhas], CORPO_DE_SONDAGEM));

  for (const entradas of obra.entradas) {
    const planta = await executarPlanta(executor, codigoPlanta, desafio.verificar, entradas);
    const jogador = await executor.executar({ codigo: codigoJogador, verificacao: desafio.verificar, entradas });

    if (jogador.erro?.fase === 'programa') {
      const { linha } = jogador.erro;
      const dentroDaTentativa = linha !== null && linha > anteriores.length && linha <= anteriores.length + tentativa.linhas.length;
      return {
        tipo: 'erro-python',
        erro: jogador.erro,
        linhaNaTentativa: dentroDaTentativa ? linha - anteriores.length - 1 : null,
        diagnostico,
      };
    }
    if (jogador.saida !== planta.saida) {
      return {
        tipo: 'resultado-diferente',
        motivo: { tipo: 'saida', esperado: planta.saida, obtido: jogador.saida, entradas },
        diagnostico,
      };
    }
    const variavel = primeiraVariavelDiferente(planta.variaveis, jogador.variaveis);
    if (variavel) return { tipo: 'resultado-diferente', motivo: { tipo: 'variavel', ...variavel }, diagnostico };

    const testeDiferente =
      jogador.saidaVerificacao !== planta.saidaVerificacao || (jogador.erro?.tipo ?? null) !== (planta.erro?.tipo ?? null);
    if (testeDiferente) {
      const obtido = jogador.erro ? `${jogador.saidaVerificacao}${jogador.erro.tipo}: ${jogador.erro.mensagem}` : jogador.saidaVerificacao;
      return {
        tipo: 'resultado-diferente',
        motivo: { tipo: 'teste', codigo: desafio.verificar ?? '', esperado: planta.saidaVerificacao, obtido },
        diagnostico,
      };
    }
  }
  return { tipo: 'certo', via: 'comportamento' };
}
