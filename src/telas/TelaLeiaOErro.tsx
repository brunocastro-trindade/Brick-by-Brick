// "Leia o erro" (ADR-0019): o programa de uma obra com um detalhe estragado, o erro real do Python e a escolha da
// correção. As regras moram em src/jogo/leiaOErro.ts; aqui ficam o Python, o teclado, o som e o recorde.
import { ArrowLeft, ArrowRight, Bug, Check, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Botao } from '../components/Botao';
import { CabecalhoDoModo } from '../components/CabecalhoDoModo';
import { CodigoColorido } from '../components/CodigoColorido';
import { GugloAnimado } from '../components/GugloAnimado';
import { Modal } from '../components/Modal';
import { LinhaDaPlanta, PlantaDaObra } from '../components/PlantaDaObra';
import { useEstadoDoPython } from '../estado/usePython';
import { criarSorteio } from '../jogo/embaralhar';
import { explicarErro } from '../jogo/erros-python';
import {
  candidatasDoErro,
  filaVariada,
  gerarPerguntaDoErro,
  PERGUNTAS_POR_RODADA,
  placarNovo,
  pontosDoAcerto,
  responder,
  type CandidataDoErro,
  type Correcao,
  type PerguntaDoErro,
  type PlacarDaRodada,
} from '../jogo/leiaOErro';
import { textoDaLinha } from '../jogo/programa';
import { registrarRodadaDoLeiaOErro, type Progresso } from '../jogo/progresso';
import type { Obra } from '../jogo/tipos';
import { pythonDoJogo } from '../python/executor';
import { definirSom, sons } from '../som/sons';
import styles from './TelaLeiaOErro.module.css';

type Fase = 'convite' | 'buscando' | 'respondendo' | 'respondida' | 'fim';

const LETRAS = ['A', 'B', 'C', 'D'];

/** Erro que o Python acha antes de rodar: a mensagem dele não traz o "Traceback". */
const ERROS_DE_ESCRITA = new Set(['SyntaxError', 'IndentationError', 'TabError']);

function rotuloDaCorrecao(correcao: Correcao): string {
  return correcao.nova ? `Linha ${correcao.indice + 1}` : `Apagar a linha ${correcao.indice + 1}`;
}

/** O que a errada faria, dito com o que o Python fez de verdade. */
function efeitoDaErrada(correcao: Correcao): string {
  if (!correcao.efeito) return '';
  if (correcao.efeito.tipo === 'saida') return 'Roda sem erro, mas a saída muda: o programa deixa de fazer o que fazia.';
  const { erro } = correcao.efeito;
  return `Ainda daria erro${erro.linha ? ` na linha ${erro.linha}` : ''}: ${erro.tipo}: ${erro.mensagem}`;
}

export interface TelaLeiaOErroProps {
  obras: Obra[];
  progresso: Progresso;
  atualizarProgresso: (mudar: (atual: Progresso) => Progresso) => void;
  aoVoltar: () => void;
  aoIrParaInicio: () => void;
}

export function TelaLeiaOErro({ obras, progresso, atualizarProgresso, aoVoltar, aoIrParaInicio }: TelaLeiaOErroProps) {
  const lista = useMemo(() => candidatasDoErro(obras, progresso), [obras, progresso]);
  const estadoDoPython = useEstadoDoPython();
  const [fase, setFase] = useState<Fase>('convite');
  const [pergunta, setPergunta] = useState<PerguntaDoErro | null>(null);
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const [placar, setPlacar] = useState<PlacarDaRodada>(placarNovo);
  const [recordeAnterior, setRecordeAnterior] = useState(progresso.leiaOErro.recorde);
  // A fila e o sorteio da rodada vivem fora do estado: só a busca da próxima pergunta mexe neles.
  const rodada = useRef<{ fila: CandidataDoErro[]; sorteio: () => number; proxima: Promise<PerguntaDoErro | null> | null } | null>(null);
  const primeiraAlternativa = useRef<HTMLButtonElement>(null);
  const botaoSeguir = useRef<HTMLDivElement>(null);

  useEffect(() => definirSom(progresso.som), [progresso.som]);

  /** Tira candidatas da fila até uma render pergunta (o estrago sem erro legível é pulado). */
  const buscar = useCallback(async (): Promise<PerguntaDoErro | null> => {
    const atual = rodada.current;
    if (!atual) return null;
    while (atual.fila.length > 0) {
      const candidata = atual.fila.shift();
      if (!candidata) break;
      try {
        const encontrada = await gerarPerguntaDoErro(candidata, pythonDoJogo, atual.sorteio);
        if (encontrada) return encontrada;
      } catch {
        // Python ocupado ou reiniciado: segue para a próxima candidata.
      }
    }
    return null;
  }, []);

  const mostrar = useCallback(
    (encontrada: PerguntaDoErro | null) => {
      if (!encontrada) {
        setFase('fim');
        return;
      }
      setPergunta(encontrada);
      setEscolhida(null);
      setFase('respondendo');
      // A próxima já vai sendo preparada enquanto a pessoa lê esta.
      if (rodada.current) rodada.current.proxima = buscar();
    },
    [buscar],
  );

  const comecar = () => {
    const sorteio = criarSorteio(Date.now());
    rodada.current = { fila: filaVariada(lista, sorteio), sorteio, proxima: null };
    setRecordeAnterior(progresso.leiaOErro.recorde);
    setPlacar(placarNovo());
    setPergunta(null);
    setFase('buscando');
    void buscar().then(mostrar);
  };

  const escolher = (indice: number) => {
    if (fase !== 'respondendo' || !pergunta) return;
    const certa = pergunta.correcoes[indice]?.certa ?? false;
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
    atualizarProgresso((atual) => registrarRodadaDoLeiaOErro(atual, pontos));
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
        if (indice >= 0 && indice < pergunta.correcoes.length) {
          evento.preventDefault();
          escolher(indice);
        }
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  });

  const cabecalho = (
    <CabecalhoDoModo titulo="Leia o erro" icone={<Bug size={26} aria-hidden="true" />} tom="codigo" aoIrParaInicio={aoIrParaInicio}>
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
              <GugloAnimado conjunto="ideias" animacao="pensando" />
            </div>
            <div className={styles.conviteTexto}>
              <h2 className={styles.conviteTitulo}>Os erros saem dos programas que você já construiu</h2>
              <p>Conclua a primeira obra da cidade ({obras[0]?.nome}) e o código dela vira erro para ler.</p>
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
              <GugloAnimado conjunto="terminal" animacao="trabalhando" />
            </div>
            <div className={styles.conviteTexto}>
              <h2 className={styles.conviteTitulo}>Leia o erro do Python e conserte o programa</h2>
              <ul className={styles.regras}>
                <li>Cada pergunta mostra um programa das suas obras com um detalhe estragado, e o erro que o Python deu de verdade.</li>
                <li>A última linha do erro diz o que houve; o "line" diz onde o Python percebeu. Escolha a correção que faz o programa voltar a rodar.</li>
                <li>
                  {PERGUNTAS_POR_RODADA} perguntas, uma chance em cada. Acertos seguidos valem mais pontos. Sem relógio: leia com calma.
                </li>
              </ul>
              <p className={styles.fonte}>Recorde: {progresso.leiaOErro.recorde.toLocaleString('pt-BR')}</p>
              {estadoDoPython === 'falhou' ? (
                <p className={styles.aviso}>O Python não carregou, e os erros precisam dele. Recarregue a página para tentar de novo.</p>
              ) : null}
              <Botao
                tamanho="grande"
                icone={<Bug size={20} aria-hidden="true" />}
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
  const escolhidaCerta = escolhida !== null && pergunta?.correcoes[escolhida]?.certa === true;
  const novoRecorde = placar.pontos > recordeAnterior;
  const explicacao = pergunta ? explicarErro(pergunta.erro.tipo) : null;
  const linhaDoErro = pergunta?.erro.linha ?? null;
  const codigoDaLinhaDoErro = pergunta && linhaDoErro ? pergunta.programa[linhaDoErro - 1] : undefined;

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

        {pergunta && explicacao ? (
          <>
            <section className={styles.enunciado} aria-labelledby="pergunta-atual">
              <h2 id="pergunta-atual" className={styles.titulo}>
                O Python deu este erro. Qual correção resolve?
              </h2>
              <p className={styles.obra}>
                Programa de {pergunta.obra.nome}
                {pergunta.entradas.length > 0 ? ` · digitado no input(): ${pergunta.entradas.join(', ')}` : ''}
              </p>
            </section>

            <PlantaDaObra
              arquivo={pergunta.obra.arquivo}
              rotuloDoProgresso={`${pergunta.programa.length} linhas`}
              linhasProntas={[]}
              quantasNovas={0}
              linhasDoDesafio={pergunta.programa.length}
              linhasFuturas={0}
            >
              {pergunta.programa.map((linha, indice) => (
                <LinhaDaPlanta
                  key={indice}
                  numero={indice + 1}
                  recuo={linha.recuo}
                  estado={respondida && indice === pergunta.indiceDoEstrago ? 'atual' : 'pronta'}
                >
                  <CodigoColorido texto={linha.texto} />
                </LinhaDaPlanta>
              ))}
            </PlantaDaObra>

            <section className={styles.erro} aria-label="Erro do Python">
              <pre className={styles.terminal}>
                {ERROS_DE_ESCRITA.has(pergunta.erro.tipo) ? null : <span className={styles.arquivo}>Traceback (most recent call last):</span>}
                <span className={styles.arquivo}>
                  {`  File "${pergunta.obra.arquivo}", line ${linhaDoErro ?? '?'}`}
                  {ERROS_DE_ESCRITA.has(pergunta.erro.tipo) ? '' : ', in <module>'}
                </span>
                {codigoDaLinhaDoErro ? <span>{`    ${codigoDaLinhaDoErro.texto.trim()}`}</span> : null}
                <span>
                  <span className={styles.tipoDoErro}>{pergunta.erro.tipo}</span>: {pergunta.erro.mensagem}
                </span>
              </pre>
              <div className={styles.traducao}>
                <strong>{explicacao.nome}</strong>
                <p>{explicacao.explicacao}</p>
                <p className={styles.dicaDeLeitura}>Leia de baixo para cima: o tipo do erro, a mensagem e a linha.</p>
              </div>
            </section>

            <div className={styles.alternativas} role="group" aria-labelledby="pergunta-atual">
              {pergunta.correcoes.map((correcao, indice) => {
                const estado = !respondida ? '' : correcao.certa ? styles.certa : indice === escolhida ? styles.errada : styles.apagada;
                return (
                  <div key={indice} className={`${styles.alternativa} ${estado}`}>
                    <button
                      ref={indice === 0 ? primeiraAlternativa : undefined}
                      type="button"
                      className={styles.escolha}
                      disabled={respondida}
                      onClick={() => escolher(indice)}
                      aria-label={`Alternativa ${LETRAS[indice]}: ${rotuloDaCorrecao(correcao)}${correcao.nova ? `, ${textoDaLinha(correcao.nova)}` : ''}${respondida && correcao.certa ? ', a certa' : ''}${respondida && indice === escolhida ? ', a sua escolha' : ''}`}
                    >
                      <span className={styles.letra} aria-hidden="true">
                        {respondida && correcao.certa ? <Check size={18} /> : respondida && indice === escolhida ? <X size={18} /> : LETRAS[indice]}
                      </span>
                      <span className={styles.correcao}>
                        {correcao.nova ? (
                          <>
                            <span className={styles.numeroDaLinha}>{rotuloDaCorrecao(correcao)}</span>
                            <code className={styles.codigo}>
                              {' '.repeat(4 * correcao.nova.recuo)}
                              <CodigoColorido texto={correcao.nova.texto} />
                            </code>
                          </>
                        ) : (
                          <span className={styles.apagar}>{rotuloDaCorrecao(correcao)}</span>
                        )}
                      </span>
                    </button>
                    {respondida && !correcao.certa ? <p className={styles.origem}>{efeitoDaErrada(correcao)}</p> : null}
                    {respondida && correcao.certa ? <p className={styles.origem}>Com essa linha, o programa volta a rodar como antes.</p> : null}
                  </div>
                );
              })}
            </div>

            {fase === 'respondida' ? (
              <p className={styles.leitura}>
                {linhaDoErro !== null && linhaDoErro - 1 !== pergunta.indiceDoEstrago
                  ? `O Python percebeu o problema na linha ${linhaDoErro}, mas ele nasceu na linha ${pergunta.indiceDoEstrago + 1}: o erro mostra onde o programa parou, nem sempre onde está o engano.`
                  : `O "line ${pergunta.indiceDoEstrago + 1}" do erro apontava a linha certa.`}
              </p>
            ) : null}

            <p className={styles.veredito} aria-live="polite">
              {fase === 'respondida'
                ? escolhidaCerta
                  ? `Isso! Mais ${pontosDoAcerto(placar.sequencia)} pontos.`
                  : 'Não era essa. A certa está marcada; cada errada diz o que o Python faria com ela.'
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
              <GugloAnimado
                conjunto="terminal"
                animacao={novoRecorde ? 'comemorando' : 'parado'}
                rotulo={novoRecorde ? 'Guglo comemora o novo recorde' : 'Guglo no terminal, esperando a próxima rodada'}
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
