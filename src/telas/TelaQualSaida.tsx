// "Qual é a saída?" (ADR-0017): ler o programa e prever o que um comando mostra. As regras moram em
// src/jogo/qualSaida.ts; aqui ficam o Python, o teclado, o som e o recorde.
import { ArrowLeft, ArrowRight, Check, RotateCcw, SquareTerminal, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Botao } from '../components/Botao';
import { CabecalhoDoModo } from '../components/CabecalhoDoModo';
import { CodigoColorido } from '../components/CodigoColorido';
import { GugloPixelado } from '../components/GugloPixelado';
import { Modal } from '../components/Modal';
import { LinhaDaPlanta, PlantaDaObra } from '../components/PlantaDaObra';
import { SaidaDoPrograma } from '../components/SaidaDoPrograma';
import { useEstadoDoPython } from '../estado/usePython';
import { criarSorteio, embaralhar } from '../jogo/embaralhar';
import { registrarRodadaDoQualSaida, type Progresso } from '../jogo/progresso';
import {
  candidatas,
  gerarPergunta,
  PERGUNTAS_POR_RODADA,
  placarNovo,
  pontosDoAcerto,
  responder,
  type Candidata,
  type PlacarDaRodada,
  type Pergunta,
} from '../jogo/qualSaida';
import type { Obra } from '../jogo/tipos';
import { pythonDoJogo } from '../python/executor';
import { definirSom, sons } from '../som/sons';
import styles from './TelaQualSaida.module.css';

type Fase = 'convite' | 'buscando' | 'respondendo' | 'respondida' | 'fim';

const LETRAS = ['A', 'B', 'C', 'D'];

export interface TelaQualSaidaProps {
  obras: Obra[];
  progresso: Progresso;
  atualizarProgresso: (mudar: (atual: Progresso) => Progresso) => void;
  aoVoltar: () => void;
  aoIrParaInicio: () => void;
}

export function TelaQualSaida({ obras, progresso, atualizarProgresso, aoVoltar, aoIrParaInicio }: TelaQualSaidaProps) {
  const lista = useMemo(() => candidatas(obras, progresso), [obras, progresso]);
  const estadoDoPython = useEstadoDoPython();
  const [fase, setFase] = useState<Fase>('convite');
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const [placar, setPlacar] = useState<PlacarDaRodada>(placarNovo);
  const [recordeAnterior, setRecordeAnterior] = useState(progresso.qualSaida.recorde);
  // A fila e o sorteio da rodada vivem fora do estado: só a busca da próxima pergunta mexe neles.
  const rodada = useRef<{ fila: Candidata[]; sorteio: () => number; proxima: Promise<Pergunta | null> | null } | null>(null);
  const primeiraAlternativa = useRef<HTMLButtonElement>(null);
  const botaoSeguir = useRef<HTMLDivElement>(null);

  useEffect(() => definirSom(progresso.som), [progresso.som]);

  /** Tira candidatas da fila até uma render pergunta (a linha sem alternativas boas é pulada). */
  const buscar = useCallback(async (): Promise<Pergunta | null> => {
    const atual = rodada.current;
    if (!atual) return null;
    while (atual.fila.length > 0) {
      const candidata = atual.fila.shift();
      if (!candidata) break;
      try {
        const encontrada = await gerarPergunta(candidata, pythonDoJogo, atual.sorteio);
        if (encontrada) return encontrada;
      } catch {
        // Python ocupado ou reiniciado: segue para a próxima candidata.
      }
    }
    return null;
  }, []);

  const mostrar = useCallback((encontrada: Pergunta | null) => {
    if (!encontrada) {
      setFase('fim');
      return;
    }
    setPergunta(encontrada);
    setEscolhida(null);
    setFase('respondendo');
    // A próxima já vai sendo preparada enquanto a pessoa lê esta.
    if (rodada.current) rodada.current.proxima = buscar();
  }, [buscar]);

  const comecar = () => {
    const sorteio = criarSorteio(Date.now());
    rodada.current = { fila: embaralhar(lista, sorteio), sorteio, proxima: null };
    setRecordeAnterior(progresso.qualSaida.recorde);
    setPlacar(placarNovo());
    setPergunta(null);
    setFase('buscando');
    void buscar().then(mostrar);
  };

  const escolher = (indice: number) => {
    if (fase !== 'respondendo' || !pergunta) return;
    const certa = pergunta.alternativas[indice]?.certa ?? false;
    setEscolhida(indice);
    setPlacar((atual) => responder(atual, certa));
    setFase('respondida');
    (certa ? sons.linha : sons.erro)();
  };

  const seguir = () => {
    if (fase !== 'respondida') return;
    if (placar.respondidas >= PERGUNTAS_POR_RODADA) {
      setFase('fim');
      return;
    }
    setFase('buscando');
    void (rodada.current?.proxima ?? buscar()).then(mostrar);
  };

  // Fim de rodada: conta a rodada e guarda o recorde, uma vez só.
  const registrada = useRef(false);
  useEffect(() => {
    if (fase !== 'fim') {
      registrada.current = false;
      return;
    }
    if (registrada.current || placar.respondidas === 0) return;
    registrada.current = true;
    const pontos = placar.pontos;
    atualizarProgresso((atual) => registrarRodadaDoQualSaida(atual, pontos));
    if (pontos > recordeAnterior) sons.obra();
  }, [fase, placar, atualizarProgresso, recordeAnterior]);

  useEffect(() => {
    if (fase === 'respondendo') primeiraAlternativa.current?.focus();
    if (fase === 'respondida') botaoSeguir.current?.querySelector('button')?.focus();
  }, [fase, pergunta]);

  // Teclado: 1–4 (ou A–D) escolhe; Enter segue.
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.ctrlKey || evento.metaKey || evento.altKey || (evento.target as HTMLElement).closest('[role="dialog"]')) return;
      if (fase === 'respondendo' && pergunta) {
        const porNumero = Number(evento.key) - 1;
        const porLetra = LETRAS.indexOf(evento.key.toUpperCase());
        const indice = evento.key.length === 1 && porNumero >= 0 ? porNumero : porLetra;
        if (indice >= 0 && indice < pergunta.alternativas.length) {
          evento.preventDefault();
          escolher(indice);
        }
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  });

  const cabecalho = (
    <CabecalhoDoModo titulo="Qual é a saída?" icone={<SquareTerminal size={26} aria-hidden="true" />} tom="codigo" aoIrParaInicio={aoIrParaInicio}>
      <Botao variante="fantasma" icone={<ArrowLeft size={18} aria-hidden="true" />} aoClicar={aoVoltar} rotulo="Voltar à cidade">
        Cidade
      </Botao>
    </CabecalhoDoModo>
  );

  if (lista.length === 0) {
    return (
      <div className={styles.tela}>
        {cabecalho}
        <main className={styles.inicio}>
          <section className={styles.convite}>
            <div className={styles.gugloDoConvite}>
              <GugloPixelado acao="parado" />
            </div>
            <div className={styles.conviteTexto}>
              <h2 className={styles.conviteTitulo}>As perguntas saem dos programas que você já construiu</h2>
              <p>Conclua a primeira obra da cidade ({obras[0]?.nome}) e o código dela vira pergunta.</p>
              <Botao tamanho="grande" aoClicar={aoVoltar}>
                Ir para a cidade
              </Botao>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (fase === 'convite' || (fase === 'buscando' && !pergunta)) {
    const pythonPronto = estadoDoPython === 'pronto';
    return (
      <div className={styles.tela}>
        {cabecalho}
        <main className={styles.inicio}>
          <section className={styles.convite}>
            <div className={styles.gugloDoConvite}>
              <GugloPixelado acao="acenando" />
            </div>
            <div className={styles.conviteTexto}>
              <h2 className={styles.conviteTitulo}>Leia o código e diga o que aparece na tela</h2>
              <ul className={styles.regras}>
                <li>Cada pergunta mostra um programa das suas obras, com um trecho em destaque.</li>
                <li>Escolha o que só esse trecho mostra. As alternativas erradas são o que sairia com um detalhe trocado no código.</li>
                <li>
                  {PERGUNTAS_POR_RODADA} perguntas, uma chance em cada. Acertos seguidos valem mais pontos. Sem relógio: leia com calma.
                </li>
              </ul>
              <p className={styles.fonte}>Recorde: {progresso.qualSaida.recorde.toLocaleString('pt-BR')}</p>
              {estadoDoPython === 'falhou' ? (
                <p className={styles.aviso}>O Python não carregou, e as perguntas precisam dele. Recarregue a página para tentar de novo.</p>
              ) : null}
              <Botao
                tamanho="grande"
                icone={<SquareTerminal size={20} aria-hidden="true" />}
                carregando={!pythonPronto && estadoDoPython !== 'falhou' ? true : fase === 'buscando'}
                desabilitado={!pythonPronto}
                aoClicar={comecar}
              >
                {pythonPronto ? 'Começar rodada' : 'Preparando o Python…'}
              </Botao>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const numero = fase === 'respondida' || fase === 'fim' ? placar.respondidas : placar.respondidas + 1;
  const respondida = fase === 'respondida' || fase === 'fim';
  const escolhidaCerta = escolhida !== null && pergunta?.alternativas[escolhida]?.certa === true;
  const novoRecorde = placar.pontos > recordeAnterior;
  const umaLinha = pergunta ? pergunta.trecho.length - pergunta.destaque === 1 : true;

  return (
    <div className={styles.tela}>
      {cabecalho}
      <main className={styles.jogo}>
        <dl className={styles.placar}>
          <div>
            <dt>Pergunta</dt>
            <dd>
              {Math.min(numero, PERGUNTAS_POR_RODADA)}/{PERGUNTAS_POR_RODADA}
            </dd>
          </div>
          <div>
            <dt>Pontos</dt>
            <dd>{placar.pontos.toLocaleString('pt-BR')}</dd>
          </div>
          <div>
            <dt>Sequência</dt>
            <dd>{placar.sequencia}</dd>
          </div>
          <div>
            <dt>Recorde</dt>
            <dd>{Math.max(recordeAnterior, placar.pontos).toLocaleString('pt-BR')}</dd>
          </div>
        </dl>

        {pergunta ? (
          <>
            <section className={styles.enunciado} aria-labelledby="pergunta-atual">
              <h2 id="pergunta-atual" className={styles.titulo}>
                O que {umaLinha ? 'a linha em destaque' : 'o trecho em destaque'} mostra na tela?
              </h2>
              <p className={styles.obra}>
                Programa de {pergunta.obra.nome}
                {pergunta.entradas.length > 0 ? ` · digitado no input(): ${pergunta.entradas.join(', ')}` : ''}
              </p>
            </section>

            <PlantaDaObra
              arquivo={pergunta.obra.arquivo}
              rotuloDoProgresso={umaLinha ? `linha ${pergunta.destaque + 1}` : `linhas ${pergunta.destaque + 1} a ${pergunta.trecho.length}`}
              linhasProntas={[]}
              quantasNovas={0}
              linhasDoDesafio={pergunta.trecho.length}
              linhasFuturas={0}
            >
              {pergunta.trecho.map((linha, indice) => (
                <LinhaDaPlanta key={indice} numero={indice + 1} recuo={linha.recuo} estado={indice >= pergunta.destaque ? 'atual' : 'pronta'}>
                  <span className={indice >= pergunta.destaque ? '' : styles.contexto}>
                    <CodigoColorido texto={linha.texto} />
                  </span>
                </LinhaDaPlanta>
              ))}
            </PlantaDaObra>

            <div className={styles.alternativas} role="group" aria-labelledby="pergunta-atual">
              {pergunta.alternativas.map((alternativa, indice) => {
                const estado = !respondida ? '' : alternativa.certa ? styles.certa : indice === escolhida ? styles.errada : styles.apagada;
                return (
                  <div key={indice} className={`${styles.alternativa} ${estado}`}>
                    <button
                      ref={indice === 0 ? primeiraAlternativa : undefined}
                      type="button"
                      className={styles.escolha}
                      disabled={respondida}
                      onClick={() => escolher(indice)}
                      aria-label={`Alternativa ${LETRAS[indice]}${respondida && alternativa.certa ? ', a certa' : ''}${respondida && indice === escolhida ? ', a sua escolha' : ''}`}
                    >
                      <span className={styles.letra} aria-hidden="true">
                        {respondida && alternativa.certa ? <Check size={18} /> : respondida && indice === escolhida ? <X size={18} /> : LETRAS[indice]}
                      </span>
                      <SaidaDoPrograma saida={alternativa.saida} />
                    </button>
                    {respondida && alternativa.origem ? (
                      <p className={styles.origem}>
                        Sairia isto se a linha {alternativa.origem.linha + 1} fosse <code>{alternativa.origem.texto}</code>
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <p className={styles.veredito} aria-live="polite">
              {fase === 'respondida'
                ? escolhidaCerta
                  ? `Isso! Mais ${pontosDoAcerto(placar.sequencia)} pontos.`
                  : 'Não era essa. A certa está marcada; cada errada diz de onde veio.'
                : ''}
            </p>

            {fase === 'respondida' ? (
              <div ref={botaoSeguir} className={styles.seguir}>
                <Botao tamanho="grande" icone={<ArrowRight size={20} aria-hidden="true" />} atalho="Enter" aoClicar={seguir}>
                  {placar.respondidas >= PERGUNTAS_POR_RODADA ? 'Ver resultado' : 'Próxima pergunta'}
                </Botao>
              </div>
            ) : null}
            {fase === 'buscando' ? <p className={styles.fonte}>Preparando a próxima pergunta…</p> : null}
          </>
        ) : null}
      </main>

      {fase === 'fim' ? (
        <Modal
          titulo="Fim da rodada"
          aoFechar={aoVoltar}
          rodape={
            <>
              <Botao variante="secundario" aoClicar={aoVoltar}>
                Voltar à cidade
              </Botao>
              <Botao autofoco icone={<RotateCcw size={18} aria-hidden="true" />} aoClicar={comecar}>
                Jogar de novo
              </Botao>
            </>
          }
        >
          <div className={styles.fim}>
            <div className={styles.gugloDoFim}>
              <GugloPixelado
                acao={novoRecorde ? 'comemorando' : 'acenando'}
                rotulo={novoRecorde ? 'Guglo comemora o novo recorde' : 'Guglo acena: até a próxima rodada'}
              />
            </div>
            <div className={styles.fimTexto}>
              {novoRecorde ? <p className={styles.selo}>Novo recorde!</p> : null}
              {placar.respondidas < PERGUNTAS_POR_RODADA ? (
                <p>As obras concluídas renderam {placar.respondidas} perguntas nesta rodada. Conclua mais obras para rodadas completas.</p>
              ) : null}
              <dl className={styles.numeros}>
                <div>
                  <dt>Pontos</dt>
                  <dd>{placar.pontos.toLocaleString('pt-BR')}</dd>
                </div>
                <div>
                  <dt>Acertos</dt>
                  <dd>
                    {placar.acertos}/{placar.respondidas}
                  </dd>
                </div>
                <div>
                  <dt>Maior sequência</dt>
                  <dd>{placar.maiorSequencia}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
