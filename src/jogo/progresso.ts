// Progresso salvo no navegador (fase de testes: sem servidor, ADR-0002).
// Leitura defensiva: dado corrompido ou de versão antiga vira progresso novo, nunca tela quebrada.
import { estrelasDaObra, totalDePontos, type Estrelas, type ResultadoDesafio } from './pontuacao';
import type { Obra, TipoDesafio } from './tipos';

export interface ProgressoObra {
  /** Próximo desafio a fazer nesta rodada. */
  passo: number;
  resultados: ResultadoDesafio[];
  combo: number;
  aulaVista: boolean;
  /** Já foi concluída ao menos uma vez (libera a próxima obra). */
  concluida: boolean;
  estrelas: 0 | Estrelas;
  melhorPontuacao: number;
  /** Melhor vistoria aprovada (ADR-0016); null enquanto não houve. */
  vistoria: ResultadoDaVistoria | null;
}

export interface ResultadoDaVistoria {
  /** Aprovada na primeira entrega, sem espiar nenhuma linha. */
  dePrimeira: boolean;
  espiadas: number;
}

/** Vídeos que tocam uma vez (ADR-0020): a abertura da cidade e a cidade pronta. */
export type VideoDoJogo = 'abertura' | 'cidade-pronta';
export const VIDEOS_DO_JOGO: readonly VideoDoJogo[] = ['abertura', 'cidade-pronta'];

export interface Progresso {
  versao: 1;
  obras: Record<string, ProgressoObra>;
  som: boolean;
  /** Abre todas as obras — útil para quem escreve conteúdo testar fora de ordem. */
  modoLivre: boolean;
  ultimaObra: string | null;
  mecanicasVistas: TipoDesafio[];
  gugloWars: RecordeDoGugloWars;
  /** Recorde do "Qual é a saída?" (ADR-0017). */
  qualSaida: RecordeDoGugloWars;
  /** Recorde do "Leia o erro" (ADR-0019). */
  leiaOErro: RecordeDoGugloWars;
  /** Vídeos que já apareceram (ADR-0020): cada um toca sozinho uma vez só. */
  videosVistos: VideoDoJogo[];
  /** Tema do site (ADR-0018): claro (o canteiro), escuro (Drácula) ou o que o aparelho pedir. */
  tema: Tema;
}

export type Tema = 'claro' | 'escuro' | 'aparelho';

export interface RecordeDoGugloWars {
  recorde: number;
  partidas: number;
}

export interface Armazenamento {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}

export const CHAVE_DO_PROGRESSO = 'brick-by-brick:progresso:v1';

export function progressoNovo(): Progresso {
  return { versao: 1, obras: {}, som: true, modoLivre: false, ultimaObra: null, mecanicasVistas: [], gugloWars: { recorde: 0, partidas: 0 }, qualSaida: { recorde: 0, partidas: 0 }, leiaOErro: { recorde: 0, partidas: 0 }, videosVistos: [], tema: 'aparelho' };
}

export function progressoDeObraNovo(): ProgressoObra {
  return { passo: 0, resultados: [], combo: 0, aulaVista: false, concluida: false, estrelas: 0, melhorPontuacao: 0, vistoria: null };
}

export function progressoDaObra(progresso: Progresso, obraId: string): ProgressoObra {
  return progresso.obras[obraId] ?? progressoDeObraNovo();
}

const ehInteiro = (valor: unknown): valor is number => typeof valor === 'number' && Number.isInteger(valor) && valor >= 0;

function sanearResultado(bruto: unknown): ResultadoDesafio | null {
  if (typeof bruto !== 'object' || bruto === null) return null;
  const r = bruto as Record<string, unknown>;
  if (typeof r.desafioId !== 'string' || !ehInteiro(r.linhas) || !ehInteiro(r.errosAntes) || !ehInteiro(r.pontos)) return null;
  if (typeof r.usouDica !== 'boolean' || typeof r.dePrimeira !== 'boolean') return null;
  return {
    desafioId: r.desafioId,
    linhas: r.linhas,
    errosAntes: r.errosAntes,
    usouDica: r.usouDica,
    dePrimeira: r.dePrimeira,
    pontos: r.pontos,
  };
}

function sanearObra(bruto: unknown): ProgressoObra | null {
  if (typeof bruto !== 'object' || bruto === null) return null;
  const o = bruto as Record<string, unknown>;
  if (!ehInteiro(o.passo) || !ehInteiro(o.combo) || !ehInteiro(o.melhorPontuacao) || !Array.isArray(o.resultados)) return null;
  const estrelas = o.estrelas;
  if (estrelas !== 0 && estrelas !== 1 && estrelas !== 2 && estrelas !== 3) return null;
  const resultados = o.resultados.map(sanearResultado);
  if (resultados.some((resultado) => resultado === null)) return null;
  return {
    passo: o.passo,
    resultados: resultados as ResultadoDesafio[],
    combo: o.combo,
    aulaVista: o.aulaVista === true,
    concluida: o.concluida === true,
    estrelas,
    melhorPontuacao: o.melhorPontuacao,
    vistoria: sanearVistoria(o.vistoria),
  };
}

/** Campo que entrou depois (ADR-0016): ausente ou estranho vira "sem vistoria", sem derrubar a obra. */
function sanearVistoria(bruto: unknown): ResultadoDaVistoria | null {
  if (typeof bruto !== 'object' || bruto === null) return null;
  const v = bruto as Record<string, unknown>;
  if (typeof v.dePrimeira !== 'boolean' || !ehInteiro(v.espiadas)) return null;
  return { dePrimeira: v.dePrimeira && v.espiadas === 0, espiadas: v.espiadas };
}

/** Campo que entrou depois (ADR-0007, e ADR-0017 para o "Qual é a saída?"): ausente ou estranho vira recorde zero. */
function sanearRecorde(bruto: unknown): RecordeDoGugloWars {
  const c = (typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>;
  return { recorde: ehInteiro(c.recorde) ? c.recorde : 0, partidas: ehInteiro(c.partidas) ? c.partidas : 0 };
}

/** Tema estranho volta a seguir o aparelho; quem ligou o Drácula no Guglo Wars (ADR-0015) fica no escuro. */
function sanearTema(dados: Record<string, unknown>): Tema {
  if (dados.tema === 'claro' || dados.tema === 'escuro' || dados.tema === 'aparelho') return dados.tema;
  return dados.temaDoGugloWars === 'dracula' ? 'escuro' : 'aparelho';
}

/** Progresso de fonte não confiável (navegador ou arquivo): versão errada vira null; campo estranho, padrão. */
function sanearProgresso(bruto: unknown): Progresso | null {
  if (typeof bruto !== 'object' || bruto === null) return null;
  const dados = bruto as Record<string, unknown>;
  if (dados.versao !== 1 || typeof dados.obras !== 'object' || dados.obras === null) return null;
  const obras: Record<string, ProgressoObra> = {};
  for (const [id, valor] of Object.entries(dados.obras)) {
    const saneada = sanearObra(valor);
    if (saneada) obras[id] = saneada;
  }
  const tipos: TipoDesafio[] = ['montar', 'empilhar', 'digitar'];
  return {
    versao: 1,
    obras,
    som: dados.som !== false,
    modoLivre: dados.modoLivre === true,
    ultimaObra: typeof dados.ultimaObra === 'string' ? dados.ultimaObra : null,
    mecanicasVistas: Array.isArray(dados.mecanicasVistas) ? tipos.filter((tipo) => (dados.mecanicasVistas as unknown[]).includes(tipo)) : [],
    gugloWars: sanearRecorde(dados.gugloWars),
    qualSaida: sanearRecorde(dados.qualSaida),
    leiaOErro: sanearRecorde(dados.leiaOErro),
    videosVistos: Array.isArray(dados.videosVistos) ? VIDEOS_DO_JOGO.filter((video) => (dados.videosVistos as unknown[]).includes(video)) : [],
    tema: sanearTema(dados),
  };
}

export function carregarProgresso(armazenamento: Armazenamento | null): Progresso {
  try {
    const bruto = armazenamento?.getItem(CHAVE_DO_PROGRESSO);
    return (bruto && sanearProgresso(JSON.parse(bruto))) || progressoNovo();
  } catch {
    return progressoNovo();
  }
}

// Progresso em arquivo, para levar de um aparelho a outro (ADR-0011).
export const FORMATO_DO_ARQUIVO = 'brick-by-brick/progresso';
export const TAMANHO_MAXIMO_DO_ARQUIVO = 512 * 1024;

export function arquivoDeProgresso(progresso: Progresso, agora: Date): string {
  return JSON.stringify({ formato: FORMATO_DO_ARQUIVO, exportadoEm: agora.toISOString(), progresso }, null, 2);
}

/** Arquivo é dado não confiável (INV-06): só vale o formato certo, e o progresso passa pelo saneamento. */
export function lerArquivoDeProgresso(texto: string): Progresso | null {
  try {
    const dados: unknown = JSON.parse(texto);
    if (typeof dados !== 'object' || dados === null || (dados as Record<string, unknown>).formato !== FORMATO_DO_ARQUIVO) return null;
    return sanearProgresso((dados as Record<string, unknown>).progresso);
  } catch {
    return null;
  }
}

/** Devolve false se o navegador recusou gravar (modo privado, cota cheia): o jogo segue sem salvar. */
export function salvarProgresso(progresso: Progresso, armazenamento: Armazenamento | null): boolean {
  try {
    armazenamento?.setItem(CHAVE_DO_PROGRESSO, JSON.stringify(progresso));
    return armazenamento !== null;
  } catch {
    return false;
  }
}

/**
 * Dentro do mapa, a obra abre quando a anterior está concluída; a primeira de um mapa abre quando todas as obras
 * dos mapas de antes estão concluídas (ADR-0021). `obras` vem na ordem, com os mapas em bloco. Modo livre abre tudo.
 */
export function obraLiberada(obras: Obra[], progresso: Progresso, indice: number): boolean {
  const obra = obras[indice];
  if (!obra) return false;
  if (progresso.modoLivre) return true;
  const anterior = obras[indice - 1];
  if (anterior && anterior.mapa === obra.mapa) return progressoDaObra(progresso, anterior.id).concluida;
  return obras.slice(0, indice).every((outra) => progressoDaObra(progresso, outra.id).concluida);
}

function comObra(progresso: Progresso, obraId: string, mudar: (obra: ProgressoObra) => ProgressoObra): Progresso {
  return { ...progresso, obras: { ...progresso.obras, [obraId]: mudar(progressoDaObra(progresso, obraId)) } };
}

/**
 * Registra o desafio `indice` vencido; ao vencer o último, conclui a obra guardando o melhor placar. Só vale para o
 * passo salvo: a mesma validação chegando duas vezes, ou outra aba já adiantada, não faz a obra pular um desafio.
 */
export function registrarAcerto(progresso: Progresso, obra: Obra, indice: number, resultado: ResultadoDesafio, combo: number): Progresso {
  if (progressoDaObra(progresso, obra.id).passo !== indice) return progresso;
  return comObra(progresso, obra.id, (atual) => {
    const resultados = [...atual.resultados, resultado];
    const passo = atual.passo + 1;
    if (passo < obra.desafios.length) return { ...atual, passo, resultados, combo };
    const estrelas = estrelasDaObra(resultados);
    return {
      ...atual,
      passo,
      resultados,
      combo,
      concluida: true,
      estrelas: Math.max(atual.estrelas, estrelas) as Estrelas,
      melhorPontuacao: Math.max(atual.melhorPontuacao, totalDePontos(resultados)),
    };
  });
}

/** Começa a obra de novo do alicerce, mantendo conclusão e recordes. */
export function reiniciarObra(progresso: Progresso, obraId: string): Progresso {
  return comObra(progresso, obraId, (atual) => ({ ...atual, passo: 0, resultados: [], combo: 0 }));
}

/** Guarda a vistoria aprovada se ela for melhor que a anterior: de primeira vence; depois, menos espiadas. */
export function registrarVistoria(progresso: Progresso, obraId: string, resultado: ResultadoDaVistoria): Progresso {
  return comObra(progresso, obraId, (atual) => {
    const anterior = atual.vistoria;
    const melhor =
      !anterior ||
      (resultado.dePrimeira && !anterior.dePrimeira) ||
      (resultado.dePrimeira === anterior.dePrimeira && resultado.espiadas < anterior.espiadas);
    return melhor ? { ...atual, vistoria: resultado } : atual;
  });
}

export function marcarAulaVista(progresso: Progresso, obraId: string): Progresso {
  return comObra(progresso, obraId, (atual) => ({ ...atual, aulaVista: true }));
}

export function marcarMecanicaVista(progresso: Progresso, tipo: TipoDesafio): Progresso {
  if (progresso.mecanicasVistas.includes(tipo)) return progresso;
  return { ...progresso, mecanicasVistas: [...progresso.mecanicasVistas, tipo] };
}

export function marcarVideoVisto(progresso: Progresso, video: VideoDoJogo): Progresso {
  if (progresso.videosVistos.includes(video)) return progresso;
  return { ...progresso, videosVistos: [...progresso.videosVistos, video] };
}

export function totalDeEstrelas(progresso: Progresso): number {
  return Object.values(progresso.obras).reduce((soma, obra) => soma + obra.estrelas, 0);
}

export function totalDeLinhasAssentadas(progresso: Progresso): number {
  return Object.values(progresso.obras).reduce(
    (soma, obra) => soma + obra.resultados.reduce((parcial, resultado) => parcial + resultado.linhas, 0),
    0,
  );
}

export function registrarPartidaDoGugloWars(progresso: Progresso, pontos: number): Progresso {
  const { recorde, partidas } = progresso.gugloWars;
  return { ...progresso, gugloWars: { recorde: Math.max(recorde, pontos), partidas: partidas + 1 } };
}

export function registrarRodadaDoQualSaida(progresso: Progresso, pontos: number): Progresso {
  const { recorde, partidas } = progresso.qualSaida;
  return { ...progresso, qualSaida: { recorde: Math.max(recorde, pontos), partidas: partidas + 1 } };
}

export function registrarRodadaDoLeiaOErro(progresso: Progresso, pontos: number): Progresso {
  const { recorde, partidas } = progresso.leiaOErro;
  return { ...progresso, leiaOErro: { recorde: Math.max(recorde, pontos), partidas: partidas + 1 } };
}
