// O canteiro de obras: cada mini desafio dá tijolos, e encaixá-los certo assenta uma fiada.
import { ArrowRight, Eraser, Hammer, Lightbulb } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { BalaoDoPinguim } from '../components/BalaoDoPinguim';
import { BarraDaObra } from '../components/BarraDaObra';
import { Botao } from '../components/Botao';
import { CartaoDaAula } from '../components/CartaoDaAula';
import { ConsoleDaObra, type ExecucaoNoConsole } from '../components/ConsoleDaObra';
import { PainelDeConclusao } from '../components/PainelDeConclusao';
import type { PoseDoPinguim } from '../components/Pinguim';
import { LinhaParaMontar, MoldeParaDigitar, PilhaParaEmpilhar, PlantaDaObra } from '../components/PlantaDaObra';
import { PaleteDeTijolos } from '../components/PaleteDeTijolos';
import { PredioEmConstrucao } from '../components/PredioEmConstrucao';
import { TextoRico } from '../components/TextoRico';
import { TijoloFlutuante } from '../components/TijoloDeCodigo';
import { useArrastar, type Soltura } from '../estado/useArrastar';
import { useFlip } from '../estado/useFlip';
import { prefereMenosMovimento, useEstadoDoPython } from '../estado/usePython';
import { criarSorteio, embaralharSemEntregar } from '../jogo/embaralhar';
import { FALAS_DE_MECANICA, falaDaDica, falaDoVeredito, type Fala } from '../jogo/falas';
import {
  devolverDaPilha,
  devolverDaVaga,
  devolverUltimo,
  empilhar,
  encaixar,
  montagemVazia,
  mudarRecuo,
  RECUO_MAXIMO,
  selecionarLinha,
  selecionarVaga,
  tentativaDaMontagem,
  tijolosNaPalete,
  type Montagem,
} from '../jogo/montagem';
import { estrelasDaObra, pontuarDesafio, totalDePontos, type Estrelas } from '../jogo/pontuacao';
import { fecharBlocoAberto, linhasAntesDoPasso, textoDoPrograma } from '../jogo/programa';
import {
  marcarAulaVista,
  marcarMecanicaVista,
  progressoDaObra,
  registrarAcerto,
  reiniciarObra,
  type Progresso,
} from '../jogo/progresso';
import type { Desafio, Obra, Tijolo, TipoDesafio } from '../jogo/tipos';
import { avaliarTentativa, type Veredito } from '../jogo/validacao';
import { pythonDoJogo } from '../python/executor';
import { definirSom, sons } from '../som/sons';
import styles from './TelaObra.module.css';

const NOMES_DO_TIPO: Record<TipoDesafio, string> = {
  montar: 'Encaixe os tijolos',
  empilhar: 'Empilhe as linhas',
  digitar: 'Molde à mão',
};

type Fase = 'montando' | 'verificando' | 'acertou' | 'concluida';
type Realce = { tipo: 'vaga' | 'linha'; indice: number } | null;

interface Estado {
  passo: number;
  fase: Fase;
  palete: Tijolo[];
  montagem: Montagem;
  erros: number;
  usouDica: boolean;
  fala: Fala | null;
  realce: Realce;
  tijoloComProblema: string | null;
  quantasNovas: number;
  pose: PoseDoPinguim;
  eventoDoPinguim: number;
}

type Acao =
  | { tipo: 'montar'; mudar: (montagem: Montagem) => Montagem }
  | { tipo: 'limpar' }
  | { tipo: 'falar'; fala: Fala }
  | { tipo: 'dica' }
  | { tipo: 'verificando' }
  | { tipo: 'errou'; fala: Fala; realce: Realce; tijoloComProblema: string | null; pose: PoseDoPinguim }
  | { tipo: 'acertou'; fala: Fala; quantasNovas: number }
  | { tipo: 'ir-para'; passo: number }
  | { tipo: 'concluir' };

function semente(texto: string): number {
  let hash = 2166136261;
  for (const caractere of texto) hash = Math.imul(hash ^ caractere.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** Palete embaralhada sem entregar a resposta na ordem. Determinística por desafio. */
function paleteDoDesafio(desafio: Desafio): Tijolo[] {
  if (desafio.tipo === 'digitar') return [];
  const resposta = desafio.tipo === 'montar' ? desafio.resposta : desafio.linhas.map((linha) => linha.texto);
  return embaralharSemEntregar(desafio.tijolos, criarSorteio(semente(desafio.id)), (ordem) =>
    resposta.every((texto, indice) => ordem[indice]?.texto === texto),
  );
}

function estadoDoPasso(obra: Obra, passo: number, anterior?: Estado): Estado {
  const desafio = obra.desafios[passo];
  const concluida = !desafio;
  return {
    passo,
    fase: concluida ? 'concluida' : 'montando',
    palete: desafio ? paleteDoDesafio(desafio) : [],
    montagem: desafio ? montagemVazia(desafio) : { vagas: [], vagaAtiva: 0, pilha: [], linhaAtiva: 0, texto: '' },
    erros: 0,
    usouDica: false,
    fala: null,
    realce: null,
    tijoloComProblema: null,
    quantasNovas: 0,
    pose: concluida ? 'comemorando' : 'carregando',
    eventoDoPinguim: (anterior?.eventoDoPinguim ?? 0) + 1,
  };
}

function criarRedutor(obra: Obra) {
  return (estado: Estado, acao: Acao): Estado => {
    switch (acao.tipo) {
      case 'montar':
        if (estado.fase !== 'montando') return estado;
        return { ...estado, montagem: acao.mudar(estado.montagem), tijoloComProblema: null, realce: null };
      case 'limpar': {
        const desafio = obra.desafios[estado.passo];
        return desafio && estado.fase === 'montando' ? { ...estado, montagem: montagemVazia(desafio), tijoloComProblema: null, realce: null } : estado;
      }
      case 'falar':
        return { ...estado, fala: acao.fala };
      case 'dica': {
        const desafio = obra.desafios[estado.passo];
        return desafio ? { ...estado, usouDica: true, fala: falaDaDica(desafio), pose: 'pensando', eventoDoPinguim: estado.eventoDoPinguim + 1 } : estado;
      }
      case 'verificando':
        return { ...estado, fase: 'verificando', pose: 'pensando' };
      case 'errou':
        return {
          ...estado,
          fase: 'montando',
          erros: estado.erros + 1,
          fala: acao.fala,
          realce: acao.realce,
          tijoloComProblema: acao.tijoloComProblema,
          pose: acao.pose,
          eventoDoPinguim: estado.eventoDoPinguim + 1,
        };
      case 'acertou':
        return {
          ...estado,
          fase: 'acertou',
          fala: acao.fala,
          realce: null,
          tijoloComProblema: null,
          quantasNovas: acao.quantasNovas,
          pose: 'comemorando',
          eventoDoPinguim: estado.eventoDoPinguim + 1,
        };
      case 'ir-para':
        return estadoDoPasso(obra, acao.passo, estado);
      case 'concluir':
        return { ...estado, fase: 'concluida', fala: null, pose: 'comemorando', quantasNovas: 0, eventoDoPinguim: estado.eventoDoPinguim + 1 };
    }
  };
}

function poseDaFala(fala: Fala | null): PoseDoPinguim {
  if (!fala) return 'carregando';
  if (fala.humor === 'ops') return 'ops';
  if (fala.humor === 'pensando') return 'pensando';
  if (fala.humor === 'comemorando') return 'comemorando';
  return 'carregando';
}

export interface TelaObraProps {
  obra: Obra;
  progresso: Progresso;
  atualizarProgresso: (mudar: (atual: Progresso) => Progresso) => void;
  proximaObra: Obra | null;
  aoVoltar: () => void;
  aoIrParaObra: (obra: Obra) => void;
}

export function TelaObra({ obra, progresso, atualizarProgresso, proximaObra, aoVoltar, aoIrParaObra }: TelaObraProps) {
  const redutor = useMemo(() => criarRedutor(obra), [obra]);
  const daObra = progressoDaObra(progresso, obra.id);
  const [estado, despachar] = useReducer(redutor, daObra.passo, (passo) => estadoDoPasso(obra, passo));
  const [mostrarAula, setMostrarAula] = useState(!daObra.aulaVista && daObra.passo === 0);
  const [mostrarPainel, setMostrarPainel] = useState(daObra.passo >= obra.desafios.length);
  const [recordeAnterior] = useState(daObra.concluida ? daObra.melhorPontuacao : null);
  const estadoDoPython = useEstadoDoPython();
  const area = useRef<HTMLDivElement>(null);
  const botaoProxima = useRef<HTMLDivElement>(null);
  const caixaDeFalas = useRef<HTMLDivElement>(null);
  const marcarOrigem = useFlip(area);

  const desafio: Desafio | undefined = obra.desafios[estado.passo];
  const tijolosPorId = useMemo(
    () => new Map(obra.desafios.flatMap((item) => (item.tipo === 'digitar' ? [] : item.tijolos)).map((tijolo) => [tijolo.id, tijolo])),
    [obra],
  );

  const assentadas = useMemo(
    () => linhasAntesDoPasso(obra, estado.fase === 'montando' || estado.fase === 'verificando' ? estado.passo : estado.passo + 1),
    [obra, estado.fase, estado.passo],
  );
  const recuoAnterior = linhasAntesDoPasso(obra, estado.passo).at(-1)?.recuo ?? 0;
  const naPalete = tijolosNaPalete(estado.montagem, estado.palete);
  const tentativa = desafio ? tentativaDaMontagem(desafio, estado.montagem, tijolosPorId) : null;
  const mecanicaNova = desafio && !progresso.mecanicasVistas.includes(desafio.tipo) ? FALAS_DE_MECANICA[desafio.tipo] : null;
  const falaVisivel = estado.fala ?? (estado.fase === 'montando' ? mecanicaNova : null);
  const pose = estado.fase === 'verificando' ? 'pensando' : estado.fala ? estado.pose : poseDaFala(null);

  useEffect(() => definirSom(progresso.som), [progresso.som]);

  // Console: roda o programa assentado até aqui, com cada conjunto de entradas.
  const codigoDoConsole = textoDoPrograma(fecharBlocoAberto(assentadas));
  const [execucoes, setExecucoes] = useState<{ codigo: string; lista: ExecucaoNoConsole[] } | null>(null);
  useEffect(() => {
    if (estadoDoPython !== 'pronto' || assentadas.length === 0) return;
    let cancelado = false;
    Promise.all(obra.entradas.map((entradas) => pythonDoJogo.executar({ codigo: codigoDoConsole, entradas })))
      .then((resultados) => {
        if (!cancelado) setExecucoes({ codigo: codigoDoConsole, lista: resultados.map((resultado, i) => ({ entradas: obra.entradas[i] ?? [], resultado })) });
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [codigoDoConsole, estadoDoPython, obra.entradas, assentadas.length]);

  // ── ações de montagem ──────────────────────────────────────────────────
  const escolher = useCallback(
    (id: string) => {
      if (!desafio) return;
      sons.encaixe();
      despachar({
        tipo: 'montar',
        mudar: (montagem) => (desafio.tipo === 'montar' ? encaixar(montagem, id) : empilhar(montagem, id, recuoAnterior)),
      });
    },
    [desafio, recuoAnterior],
  );

  const aoSoltar = useCallback(
    (soltura: Soltura) => {
      if (!desafio || estado.fase !== 'montando') return;
      marcarOrigem(soltura.id, soltura.esquerda, soltura.topo);
      const { alvo, elementoAlvo } = soltura;
      if (!alvo) return;
      if (alvo === 'palete') {
        const vaga = estado.montagem.vagas.indexOf(soltura.id);
        const linha = estado.montagem.pilha.findIndex((peca) => peca?.tijoloId === soltura.id);
        if (vaga >= 0) despachar({ tipo: 'montar', mudar: (m) => devolverDaVaga(m, vaga) });
        else if (linha >= 0) despachar({ tipo: 'montar', mudar: (m) => devolverDaPilha(m, linha) });
        sons.devolver();
        return;
      }
      const [tipo, numero] = alvo.split(':');
      const indice = Number(numero);
      if (tipo === 'vaga' && desafio.tipo === 'montar') {
        sons.encaixe();
        despachar({ tipo: 'montar', mudar: (m) => encaixar(m, soltura.id, indice) });
      }
      if (tipo === 'linha' && desafio.tipo === 'empilhar') {
        const regua = elementoAlvo?.querySelector<HTMLElement>('[data-regua]')?.getBoundingClientRect();
        const recuo = regua && regua.width > 0 ? Math.round((soltura.esquerda - regua.left) / regua.width) : undefined;
        const recuoValido = recuo === undefined ? undefined : Math.max(0, Math.min(RECUO_MAXIMO, recuo));
        sons.encaixe();
        despachar({ tipo: 'montar', mudar: (m) => empilhar(m, soltura.id, recuoAnterior, indice, recuoValido) });
      }
    },
    [desafio, estado.fase, estado.montagem, marcarOrigem, recuoAnterior],
  );
  const { arrasto, pressionar, cliqueValido } = useArrastar(aoSoltar);

  // ── assentar, avançar, concluir ────────────────────────────────────────
  const assentar = useCallback(async () => {
    if (!desafio || estado.fase !== 'montando' || !tentativa) return;
    despachar({ tipo: 'verificando' });
    let veredito: Veredito;
    try {
      veredito = await avaliarTentativa({ obra, passo: estado.passo, tentativa, executor: pythonDoJogo.pronto() ? pythonDoJogo : null });
    } catch {
      veredito = await avaliarTentativa({ obra, passo: estado.passo, tentativa, executor: null });
    }
    const fala = falaDoVeredito(veredito, desafio, estado.erros);
    if (veredito.tipo === 'certo') {
      const { resultado, combo } = pontuarDesafio({
        desafioId: desafio.id,
        linhas: desafio.linhas.length,
        errosAntes: estado.erros,
        usouDica: estado.usouDica,
        comboAtual: progressoDaObra(progresso, obra.id).combo,
      });
      atualizarProgresso((atual) => marcarMecanicaVista(registrarAcerto(atual, obra, resultado, combo), desafio.tipo));
      sons.linha();
      despachar({ tipo: 'acertou', fala, quantasNovas: desafio.linhas.length });
      return;
    }
    sons.erro();
    const diagnostico = 'diagnostico' in veredito ? veredito.diagnostico : null;
    const realce: Realce =
      estado.erros >= 1 && diagnostico ? { tipo: diagnostico.tipo === 'vaga' ? 'vaga' : 'linha', indice: diagnostico.indice } : null;
    despachar({
      tipo: 'errou',
      fala,
      realce,
      tijoloComProblema: veredito.tipo === 'tijolo-extra' ? veredito.tijolo.id : null,
      pose: fala.humor === 'pensando' ? 'pensando' : 'ops',
    });
  }, [atualizarProgresso, desafio, estado.erros, estado.fase, estado.passo, estado.usouDica, obra, progresso, tentativa]);

  const avancar = useCallback(() => {
    if (estado.fase !== 'acertou') return;
    if (estado.passo + 1 < obra.desafios.length) {
      despachar({ tipo: 'ir-para', passo: estado.passo + 1 });
      return;
    }
    sons.obra();
    despachar({ tipo: 'concluir' });
  }, [estado.fase, estado.passo, obra.desafios.length]);

  // O painel abre depois do telhado cair.
  useEffect(() => {
    if (estado.fase !== 'concluida' || mostrarPainel) return;
    const temporizador = setTimeout(() => setMostrarPainel(true), 1400);
    return () => clearTimeout(temporizador);
  }, [estado.fase, mostrarPainel]);

  useEffect(() => {
    if (estado.fase === 'acertou') botaoProxima.current?.querySelector('button')?.focus({ preventScroll: true });
  }, [estado.fase]);

  // Cada veredito traz uma fala nova: ela precisa entrar na tela, mesmo com a planta comprida.
  useEffect(() => {
    if (!estado.fala) return;
    caixaDeFalas.current?.scrollIntoView({ block: 'nearest', behavior: prefereMenosMovimento() ? 'auto' : 'smooth' });
  }, [estado.fala, estado.eventoDoPinguim]);

  const refazer = () => {
    atualizarProgresso((atual) => reiniciarObra(atual, obra.id));
    setMostrarPainel(false);
    despachar({ tipo: 'ir-para', passo: 0 });
  };

  const fecharAula = () => {
    setMostrarAula(false);
    atualizarProgresso((atual) => marcarAulaVista(atual, obra.id));
  };

  // ── teclado: 1–9 encaixa, ⌫ devolve, ←→ recuo/vaga, ↑↓ linha, Enter assenta ──
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (mostrarAula || mostrarPainel || evento.ctrlKey || evento.metaKey || evento.altKey) return;
      const alvo = evento.target as HTMLElement;
      if (alvo.closest('input, textarea, [contenteditable="true"], [role="dialog"]')) return;
      const emBotao = alvo.closest('button') !== null;
      if (evento.key === 'Enter' && !emBotao) {
        evento.preventDefault();
        if (estado.fase === 'acertou') avancar();
        else void assentar();
        return;
      }
      if (estado.fase !== 'montando' || !desafio) return;
      if (/^[1-9]$/.test(evento.key)) {
        const tijolo = naPalete[Number(evento.key) - 1];
        if (tijolo) {
          evento.preventDefault();
          escolher(tijolo.id);
        }
        return;
      }
      if (evento.key === 'Backspace') {
        evento.preventDefault();
        sons.devolver();
        despachar({ tipo: 'montar', mudar: devolverUltimo });
        return;
      }
      const setas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1 };
      const delta = setas[evento.key];
      if (delta === undefined) return;
      evento.preventDefault();
      if (desafio.tipo === 'montar' && (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight')) {
        despachar({ tipo: 'montar', mudar: (m) => selecionarVaga(m, m.vagaAtiva + delta) });
      }
      if (desafio.tipo === 'empilhar') {
        if (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') despachar({ tipo: 'montar', mudar: (m) => mudarRecuo(m, m.linhaAtiva, delta) });
        else despachar({ tipo: 'montar', mudar: (m) => selecionarLinha(m, m.linhaAtiva + delta) });
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [assentar, avancar, desafio, escolher, estado.fase, mostrarAula, mostrarPainel, naPalete]);

  // ── desenho ────────────────────────────────────────────────────────────
  const resultados = progressoDaObra(progresso, obra.id).resultados;
  const pontos = totalDePontos(resultados);
  const combo = progressoDaObra(progresso, obra.id).combo;
  const bloqueada = estado.fase !== 'montando';
  const numeroDaLinha = assentadas.length + 1;
  const linhasDoDesafio = estado.fase === 'montando' || estado.fase === 'verificando' ? (desafio?.linhas.length ?? 0) : 0;
  const rotuloDoProgresso =
    estado.fase === 'concluida' || !desafio
      ? 'Obra concluída'
      : `Mini desafio ${estado.passo + 1} de ${obra.desafios.length}`;
  const interacao = {
    tijolosPorId,
    tijoloComProblema: estado.tijoloComProblema,
    idArrastado: arrasto?.id ?? null,
    alvoSobre: arrasto?.alvo ?? null,
    bloqueada,
    pressionar,
    cliqueValido,
  };
  const tijoloArrastado = arrasto ? tijolosPorId.get(arrasto.id) : undefined;
  const arrastandoDaObra =
    arrasto !== null && (estado.montagem.vagas.includes(arrasto.id) || estado.montagem.pilha.some((peca) => peca?.tijoloId === arrasto.id));

  return (
    <div className={styles.tela}>
      <BarraDaObra
        obra={obra}
        fiadasProntas={assentadas.length}
        pontos={pontos}
        combo={combo}
        som={progresso.som}
        aoVoltar={aoVoltar}
        aoAlternarSom={() => atualizarProgresso((atual) => ({ ...atual, som: !atual.som }))}
      />

      <main className={styles.area} ref={area}>
        <div className={styles.colunaDaCena}>
          <div className={styles.cena}>
            <PredioEmConstrucao
              obra={obra}
              linhas={assentadas}
              quantasNovas={estado.quantasNovas}
              pose={pose}
              eventoDoPinguim={estado.eventoDoPinguim}
              concluida={estado.fase === 'concluida'}
            />
          </div>
          <ConsoleDaObra
            execucoes={execucoes?.codigo === codigoDoConsole ? execucoes.lista : null}
            estadoDoPython={estadoDoPython}
            programaVazio={assentadas.length === 0}
          />
        </div>

        <div className={styles.colunaDoTrabalho}>
          {desafio && estado.fase !== 'concluida' ? (
            <section className={styles.missao} aria-labelledby="titulo-da-missao">
              <div className={styles.missaoTopo}>
                <span className={styles.etiqueta}>
                  <Hammer size={16} aria-hidden="true" />
                  {NOMES_DO_TIPO[desafio.tipo]} · {estado.passo + 1}/{obra.desafios.length}
                </span>
                <Botao
                  variante="fantasma"
                  icone={<Lightbulb size={18} aria-hidden="true" />}
                  desabilitado={bloqueada}
                  aoClicar={() => {
                    sons.dica();
                    despachar({ tipo: 'dica' });
                  }}
                >
                  {estado.usouDica ? 'Ver dica de novo' : 'Pedir dica'}
                </Botao>
              </div>
              <h2 id="titulo-da-missao" className={styles.missaoTitulo}>
                {desafio.titulo}
              </h2>
              <TextoRico texto={desafio.contexto} />
            </section>
          ) : (
            <section className={styles.missao}>
              <h2 className={styles.missaoTitulo}>Obra concluída!</h2>
              <p>Todas as fiadas estão no lugar. O programa completo está na planta abaixo.</p>
              <div className={styles.acoesDaConclusao}>
                <Botao aoClicar={() => setMostrarPainel(true)}>Ver resultado</Botao>
                <Botao variante="secundario" aoClicar={aoVoltar}>
                  Voltar à cidade
                </Botao>
              </div>
            </section>
          )}

          <PlantaDaObra
            arquivo={obra.arquivo}
            rotuloDoProgresso={rotuloDoProgresso}
            linhasProntas={assentadas}
            quantasNovas={estado.quantasNovas}
            linhasDoDesafio={linhasDoDesafio}
            linhasFuturas={Math.max(0, obra.totalLinhas - assentadas.length - linhasDoDesafio)}
          >
            {desafio && linhasDoDesafio > 0 ? (
              desafio.tipo === 'montar' ? (
                <LinhaParaMontar
                  desafio={desafio}
                  montagem={estado.montagem}
                  numero={numeroDaLinha}
                  vagaComRealce={estado.realce?.tipo === 'vaga' ? estado.realce.indice : null}
                  aoSelecionarVaga={(vaga) => despachar({ tipo: 'montar', mudar: (m) => selecionarVaga(m, vaga) })}
                  aoDevolver={(vaga) => {
                    sons.devolver();
                    despachar({ tipo: 'montar', mudar: (m) => devolverDaVaga(m, vaga) });
                  }}
                  {...interacao}
                />
              ) : desafio.tipo === 'empilhar' ? (
                <PilhaParaEmpilhar
                  desafio={desafio}
                  montagem={estado.montagem}
                  numeroInicial={numeroDaLinha}
                  linhaComRealce={estado.realce?.tipo === 'linha' ? estado.realce.indice : null}
                  aoSelecionarLinha={(linha) => despachar({ tipo: 'montar', mudar: (m) => selecionarLinha(m, linha) })}
                  aoDevolver={(linha) => {
                    sons.devolver();
                    despachar({ tipo: 'montar', mudar: (m) => devolverDaPilha(m, linha) });
                  }}
                  aoMudarRecuo={(linha, delta) => {
                    sons.clique();
                    despachar({ tipo: 'montar', mudar: (m) => mudarRecuo(m, linha, delta) });
                  }}
                  {...interacao}
                />
              ) : (
                <MoldeParaDigitar
                  desafio={desafio}
                  numero={numeroDaLinha}
                  valor={estado.montagem.texto}
                  bloqueada={bloqueada}
                  aoMudar={(texto) => despachar({ tipo: 'montar', mudar: (m) => ({ ...m, texto }) })}
                  aoEnviar={() => void assentar()}
                  aoColar={() =>
                    despachar({
                      tipo: 'falar',
                      fala: {
                        humor: 'neutro',
                        selo: 'dica',
                        titulo: 'Sem copiar e colar',
                        texto: 'Este tijolo é moldado à mão: digitar cada caractere é o que faz a linha ficar na memória.',
                      },
                    })
                  }
                />
              )
            ) : null}
          </PlantaDaObra>

          {desafio && desafio.tipo !== 'digitar' && estado.fase !== 'acertou' && estado.fase !== 'concluida' ? (
            <PaleteDeTijolos
              tijolos={naPalete}
              formato={desafio.tipo === 'empilhar' ? 'linha' : 'pedaco'}
              bloqueada={bloqueada}
              idArrastado={arrasto?.id ?? null}
              recebendo={arrastandoDaObra && arrasto?.alvo === 'palete'}
              aoEscolher={escolher}
              pressionar={pressionar}
              cliqueValido={cliqueValido}
            />
          ) : null}

          {desafio && estado.fase !== 'concluida' ? (
            <div className={styles.acoes}>
              {estado.fase === 'acertou' ? (
                <div ref={botaoProxima} className={styles.acaoPrincipal}>
                  <Botao tamanho="grande" icone={<ArrowRight size={20} aria-hidden="true" />} atalho="Enter" aoClicar={avancar}>
                    {estado.passo + 1 < obra.desafios.length ? 'Próximo tijolo' : 'Ver a obra pronta'}
                  </Botao>
                </div>
              ) : (
                <>
                  <Botao
                    variante="secundario"
                    icone={<Eraser size={18} aria-hidden="true" />}
                    desabilitado={bloqueada}
                    aoClicar={() => {
                      sons.devolver();
                      despachar({ tipo: 'limpar' });
                    }}
                  >
                    Limpar
                  </Botao>
                  <div className={styles.acaoPrincipal}>
                    <Botao
                      tamanho="grande"
                      atalho="Enter"
                      carregando={estado.fase === 'verificando'}
                      desabilitado={!tentativa}
                      aoClicar={() => void assentar()}
                    >
                      Assentar {desafio.linhas.length > 1 ? 'bloco' : 'linha'}
                    </Botao>
                  </div>
                </>
              )}
            </div>
          ) : null}

          <div className={styles.falas} aria-live="polite" ref={caixaDeFalas}>
            {falaVisivel ? <BalaoDoPinguim fala={falaVisivel} /> : null}
          </div>
        </div>
      </main>

      {arrasto && tijoloArrastado
        ? createPortal(
            <div className={styles.flutuante} style={{ left: arrasto.x - arrasto.pegaX, top: arrasto.y - arrasto.pegaY } as CSSProperties}>
              <TijoloFlutuante texto={tijoloArrastado.texto} formato={desafio?.tipo === 'empilhar' ? 'linha' : 'pedaco'} />
            </div>,
            document.body,
          )
        : null}

      {mostrarAula ? <CartaoDaAula obra={obra} aoComecar={fecharAula} /> : null}

      {mostrarPainel ? (
        <PainelDeConclusao
          obra={obra}
          codigo={textoDoPrograma(linhasAntesDoPasso(obra, obra.desafios.length))}
          resultados={resultados}
          estrelas={estrelasDaObra(resultados) as Estrelas}
          novoRecorde={recordeAnterior !== null && pontos > recordeAnterior}
          proximaObra={proximaObra}
          aoVoltar={aoVoltar}
          aoRefazer={refazer}
          aoIrParaProxima={aoIrParaObra}
        />
      ) : null}
    </div>
  );
}
