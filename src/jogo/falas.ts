// O que o Guglo, o pinguim mascote, diz. Ele comemora, explica e reage a erro sem julgar (documento do projeto, "Mascote").
import { explicarErro } from './erros-python';
import { textoDaLinha } from './programa';
import type { Classificacao, Desafio, TipoDesafio } from './tipos';
import type { Diagnostico, Veredito } from './validacao';

export type Humor = 'neutro' | 'feliz' | 'pensando' | 'ops' | 'comemorando';
export type Selo = 'melhor' | 'funciona_mas' | 'problema' | 'dica';

export interface Fala {
  humor: Humor;
  selo?: Selo;
  titulo: string;
  texto: string;
  erro?: { nome: string; tipo: string; mensagem: string; linha: number | null };
  comparacao?: { codigo?: string; esperado: string; obtido: string };
  /** Código para mostrar junto da fala, como a linha registrada na planta. */
  codigo?: string;
  /** Texto que vem depois do código. */
  complemento?: string;
  outros?: Array<{ texto: string; porque: string; classificacao: Classificacao }>;
}

const TITULOS_DE_ACERTO = ['Encaixou certinho!', 'Tijolo no lugar!', 'Linha firme!', 'Isso aí, a obra subiu!'];

function textoDoDiagnostico(diagnostico: Diagnostico | null): string {
  if (!diagnostico) return '';
  switch (diagnostico.tipo) {
    case 'vaga':
      return `Olhe o espaço ${diagnostico.indice + 1}: o tijolo dali não é o que a linha precisa.`;
    case 'ordem':
      return `A linha ${diagnostico.indice + 1} do bloco não é a esperada nessa posição.`;
    case 'recuo':
      return `A ordem está certa! Falta acertar o recuo da linha ${diagnostico.indice + 1} do bloco.`;
  }
}

function juntar(...partes: string[]): string {
  return partes.filter((parte) => parte !== '').join(' ');
}

function outrosTijolos(desafio: Desafio): Fala['outros'] {
  if (desafio.tipo === 'digitar') return undefined;
  const extras = desafio.tijolos.flatMap((tijolo) =>
    tijolo.classificacao && tijolo.porque
      ? [{ texto: tijolo.texto, porque: tijolo.porque, classificacao: tijolo.classificacao }]
      : [],
  );
  return extras.length > 0 ? extras : undefined;
}

/**
 * `errosAnteriores` conta as tentativas erradas antes desta. O diagnóstico de posição
 * só aparece da segunda tentativa errada em diante, para não virar tentativa e erro.
 */
export function falaDoVeredito(
  veredito: Veredito,
  desafio: Desafio,
  errosAnteriores: number,
  sorteio: () => number = Math.random,
): Fala {
  const diagnostico = 'diagnostico' in veredito && errosAnteriores >= 1 ? textoDoDiagnostico(veredito.diagnostico) : '';

  switch (veredito.tipo) {
    case 'certo':
      return {
        humor: 'comemorando',
        selo: 'melhor',
        titulo:
          veredito.via === 'comportamento'
            ? 'Do seu jeito, e funciona igual!'
            : (TITULOS_DE_ACERTO[Math.floor(sorteio() * TITULOS_DE_ACERTO.length)] ?? 'Encaixou!'),
        ...(veredito.via === 'comportamento'
          ? {
              texto: 'Sua versão ficou diferente da planta, mas o programa faz exatamente a mesma coisa. Na planta, ela fica registrada assim:',
              codigo: desafio.linhas.map(textoDaLinha).join('\n'),
              complemento: desafio.explicacao,
            }
          : { texto: desafio.explicacao }),
        outros: outrosTijolos(desafio),
      };

    case 'tijolo-extra':
      return veredito.tijolo.classificacao === 'funciona_mas'
        ? {
            humor: 'pensando',
            selo: 'funciona_mas',
            titulo: 'Funciona, mas…',
            texto: juntar(veredito.tijolo.porque, 'Troque esse tijolo por um melhor.'),
          }
        : { humor: 'ops', selo: 'problema', titulo: 'Esse tijolo tem um problema', texto: veredito.tijolo.porque };

    case 'erro-python': {
      const { nome, explicacao } = explicarErro(veredito.erro.tipo);
      return {
        humor: 'ops',
        selo: 'problema',
        titulo: 'O Python reclamou',
        texto: juntar(explicacao, diagnostico),
        erro: { nome, tipo: veredito.erro.tipo, mensagem: veredito.erro.mensagem, linha: veredito.erro.linha },
      };
    }

    case 'resultado-diferente': {
      const { motivo } = veredito;
      if (motivo.tipo === 'saida') {
        return {
          humor: 'pensando',
          selo: 'problema',
          titulo: 'Rodou, mas mostrou outra coisa',
          texto: juntar('O programa funcionou, só que a saída não é a que a obra precisa. Compare as duas:', diagnostico),
          comparacao: { esperado: motivo.esperado, obtido: motivo.obtido },
        };
      }
      if (motivo.tipo === 'variavel') {
        const detalhe =
          motivo.obtido === null
            ? `A variável ${motivo.nome} não foi criada.`
            : motivo.esperado === null
              ? `Apareceu uma variável ${motivo.nome} que a obra não usa.`
              : `A variável ${motivo.nome} ficou com ${motivo.obtido}, mas a obra espera ${motivo.esperado}.`;
        return {
          humor: 'pensando',
          selo: 'problema',
          titulo: 'Rodou, mas uma variável ficou diferente',
          texto: juntar(detalhe, diagnostico),
        };
      }
      return {
        humor: 'pensando',
        selo: 'problema',
        titulo: 'Rodou, mas o teste não passou',
        texto: juntar('O programa roda, mas testei por baixo dos panos e o resultado não bateu.', diagnostico),
        comparacao: { codigo: motivo.codigo, esperado: motivo.esperado, obtido: motivo.obtido },
      };
    }

    case 'sem-python':
      return {
        humor: 'pensando',
        selo: 'problema',
        titulo: 'Ainda não encaixou',
        texto: juntar(
          'Essa combinação não bate com a planta.',
          diagnostico,
          'O Python ainda está carregando; quando ele chegar, consigo testar soluções diferentes da planta.',
        ),
      };
  }
}

export function falaDaDica(desafio: Desafio): Fala {
  return {
    humor: 'neutro',
    selo: 'dica',
    titulo: 'Dica',
    texto: desafio.dica ?? 'Releia a missão com calma: cada palavra dela aponta para um tijolo.',
  };
}

export const FALAS_DE_MECANICA: Record<TipoDesafio, Fala> = {
  montar: {
    humor: 'feliz',
    titulo: 'Como encaixar tijolos',
    texto:
      'Toque num tijolo para encaixá-lo no espaço marcado, ou arraste até o espaço que quiser. Toque num tijolo encaixado para devolvê-lo. Quando a linha estiver cheia, assente!',
  },
  empilhar: {
    humor: 'feliz',
    titulo: 'Tijolo novo: linhas inteiras!',
    texto:
      'Agora cada tijolo é uma linha. Empilhe na ordem certa e ajuste o recuo com ← e →, como peças de Tetris. Em Python, o recuo diz o que pertence a cada bloco.',
  },
  digitar: {
    humor: 'feliz',
    titulo: 'Tijolo moldado à mão',
    texto: 'Este tijolo você mesmo molda: digite a linha inteira. Sem copiar e colar, é assim que a memória fixa.',
  },
};
