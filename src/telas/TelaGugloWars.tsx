// Guglo Wars (ADR-0007): linhas das obras concluídas caem no poço; digite antes de chegarem ao fundo.
// As regras moram em src/jogo/gugloWars.ts; aqui ficam o relógio, o teclado, o som e o recorde.
import { ArrowLeft, Keyboard, Pause, Play, RotateCcw, Swords } from 'lucide-react';
import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import logo from '../assets/logo-pequeno.webp';
import { Botao } from '../components/Botao';
import { GugloPixelado, type AcaoDoGuglo } from '../components/GugloPixelado';
import { Modal } from '../components/Modal';
import { PecaDeEntulho, PecaQueCai, SilhuetaDaPeca } from '../components/PecaQueCai';
import {
  COMBO_PARA_LIMPAR,
  conferir,
  FILEIRAS,
  intervaloDaFileiraMs,
  linhasDoGugloWars,
  NIVEL_DA_LACUNA,
  novaPartida,
  passoDoGugloWars,
  type AcaoDoGugloWars,
  type EstadoDoGugloWars,
  type EventoDoGugloWars,
  type LinhaDoGugloWars,
  type Peca,
} from '../jogo/gugloWars';
import { progressoDaObra, registrarPartidaDoGugloWars, type Progresso } from '../jogo/progresso';
import type { Obra } from '../jogo/tipos';
import { definirSom, sons } from '../som/sons';
import styles from './TelaGugloWars.module.css';

type Acao = AcaoDoGugloWars | { tipo: 'comecar'; linhas: readonly LinhaDoGugloWars[]; semente: number } | { tipo: 'sair' };

function reduzir(estado: EstadoDoGugloWars | null, acao: Acao): EstadoDoGugloWars | null {
  if (acao.tipo === 'comecar') return novaPartida(acao.linhas, acao.semente);
  if (acao.tipo === 'sair') return null;
  return estado ? passoDoGugloWars(estado, acao) : null;
}

/** Posição de uma fileira no poço, lida pelo CSS. */
const naFileira = (fileira: number) => ({ '--fileira': fileira }) as CSSProperties;

function pedidoDaPeca(peca: Peca): string {
  return peca.modo === 'copiar' ? `Copie: ${peca.resposta}` : `Complete a lacuna: ${peca.antes} (lacuna) ${peca.depois}`;
}

function mensagemDoEvento(evento: EventoDoGugloWars | null, nivel: number): string {
  if (evento?.tipo === 'acertou') {
    return [
      `Acertou! Mais ${evento.pontos} pontos.`,
      evento.limpouEntulho ? 'Uma fileira de entulho saiu.' : '',
      evento.subiuDeNivel ? `Nível ${nivel}.` : '',
    ].join(' ');
  }
  if (evento?.tipo === 'caiu') return 'A peça chegou ao fundo e virou entulho.';
  if (evento?.tipo === 'errou') return 'Ainda não confere: a peça desceu uma fileira.';
  return '';
}

export interface TelaGugloWarsProps {
  obras: Obra[];
  progresso: Progresso;
  atualizarProgresso: (mudar: (atual: Progresso) => Progresso) => void;
  aoVoltar: () => void;
  aoIrParaInicio: () => void;
}

export function TelaGugloWars({ obras, progresso, atualizarProgresso, aoVoltar, aoIrParaInicio }: TelaGugloWarsProps) {
  const linhas = useMemo(() => linhasDoGugloWars(obras, progresso), [obras, progresso]);
  const obrasComLinhas = obras.filter((obra) => progresso.modoLivre || progressoDaObra(progresso, obra.id).concluida).length;
  const [estado, despachar] = useReducer(reduzir, null);
  const [recordeAnterior, setRecordeAnterior] = useState(progresso.gugloWars.recorde);
  const entrada = useRef<HTMLInputElement>(null);
  const registrada = useRef<EstadoDoGugloWars | null>(null);

  const fase = estado?.fase;
  const peca = estado?.peca;
  const nivel = estado?.nivel ?? 1;
  const evento = estado?.evento ?? null;

  useEffect(() => definirSom(progresso.som), [progresso.som]);

  // O relógio: a cada intervalo, a peça desce uma fileira.
  useEffect(() => {
    if (fase !== 'jogando' || !peca) return;
    const temporizador = setTimeout(() => despachar({ tipo: 'tique' }), intervaloDaFileiraMs(peca, nivel));
    return () => clearTimeout(temporizador);
  }, [fase, peca, nivel]);

  useEffect(() => {
    if (fase === 'jogando') entrada.current?.focus();
  }, [fase]);

  // Trocou de aba ou minimizou: a partida espera.
  useEffect(() => {
    const aoMudar = () => {
      if (document.hidden) despachar({ tipo: 'pausar' });
    };
    document.addEventListener('visibilitychange', aoMudar);
    return () => document.removeEventListener('visibilitychange', aoMudar);
  }, []);

  useEffect(() => {
    if (evento?.tipo === 'acertou') (evento.limpouEntulho || evento.subiuDeNivel ? sons.linha : sons.encaixe)();
    else if (evento?.tipo === 'caiu' || evento?.tipo === 'errou') sons.erro();
  }, [evento]);

  // Fim de partida: conta a partida e guarda o recorde, uma vez só.
  useEffect(() => {
    if (!estado || estado.fase !== 'fim' || registrada.current === estado) return;
    registrada.current = estado;
    const pontos = estado.pontos;
    atualizarProgresso((atual) => registrarPartidaDoGugloWars(atual, pontos));
    (pontos > recordeAnterior ? sons.obra : sons.erro)();
  }, [estado, atualizarProgresso, recordeAnterior]);

  const comecar = () => {
    setRecordeAnterior(progresso.gugloWars.recorde);
    despachar({ tipo: 'comecar', linhas, semente: Date.now() });
  };

  const aoTeclar = (tecla: KeyboardEvent<HTMLInputElement>) => {
    if (tecla.key === 'Enter') {
      tecla.preventDefault();
      despachar({ tipo: 'enviar' });
    } else if (tecla.key === 'Escape') {
      tecla.preventDefault();
      despachar({ tipo: 'pausar' });
    }
  };

  const cabecalho = (
    <header className={styles.barra}>
      <button type="button" className={styles.logo} onClick={aoIrParaInicio} aria-label="Brick by Brick: voltar ao início">
        <img src={logo} alt="" width={90} height={67} />
      </button>
      <h1 className={styles.titulo}>
        <Swords size={26} aria-hidden="true" />
        Guglo Wars
      </h1>
      <div className={styles.acoes}>
        {fase === 'jogando' ? (
          <Botao variante="secundario" icone={<Pause size={18} aria-hidden="true" />} aoClicar={() => despachar({ tipo: 'pausar' })}>
            Pausar
          </Botao>
        ) : null}
        {/* "Cidade", como na barra da obra: curto, cabe ao lado do título e do Pausar no celular. */}
        <Botao variante="fantasma" icone={<ArrowLeft size={18} aria-hidden="true" />} aoClicar={aoVoltar} rotulo="Voltar à cidade">
          Cidade
        </Botao>
      </div>
    </header>
  );

  if (linhas.length === 0) {
    return (
      <div className={styles.tela}>
        {cabecalho}
        <main className={styles.inicio}>
          <section className={styles.convite}>
            <div className={styles.gugloDoConvite}>
              <GugloPixelado acao="parado" />
            </div>
            <div className={styles.conviteTexto}>
              <h2 className={styles.conviteTitulo}>O Guglo Wars usa as linhas que você já construiu</h2>
              <p>Conclua a primeira obra da cidade ({obras[0]?.nome}) e as linhas do programa dela viram peças para digitar.</p>
              <Botao tamanho="grande" aoClicar={aoVoltar}>
                Ir para a cidade
              </Botao>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!estado || !peca) {
    return (
      <div className={styles.tela}>
        {cabecalho}
        <main className={styles.inicio}>
          <section className={styles.convite}>
            <div className={styles.gugloDoConvite}>
              <GugloPixelado acao="acenando" />
            </div>
            <div className={styles.conviteTexto}>
              <h2 className={styles.conviteTitulo}>Digite o código antes de a peça chegar ao fundo</h2>
              <ul className={styles.regras}>
                <li>Nos níveis 1 e 2, copie a linha inteira.</li>
                <li>Do nível {NIVEL_DA_LACUNA} em diante, um pedaço de sintaxe some: digite só o que falta.</li>
                <li>
                  Peça que chega ao fundo vira entulho, e a pilha sobe. Se chegar ao topo, a partida acaba. {COMBO_PARA_LIMPAR}{' '}
                  acertos seguidos limpam uma fileira.
                </li>
              </ul>
              <p className={styles.fonte}>
                {linhas.length} linhas de {obrasComLinhas} {obrasComLinhas === 1 ? 'obra' : 'obras'}
                {progresso.modoLivre ? ' (modo livre)' : ' concluídas'} · Recorde: {progresso.gugloWars.recorde.toLocaleString('pt-BR')}
              </p>
              <p className={styles.avisoToque}>Funciona melhor com teclado físico.</p>
              <Botao tamanho="grande" icone={<Swords size={20} aria-hidden="true" />} aoClicar={comecar}>
                Começar partida
              </Botao>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const conferencia = conferir(estado.digitado, peca);
  const festa = evento?.tipo === 'acertou' && (evento.limpouEntulho || evento.subiuDeNivel);
  const acaoDoGuglo: AcaoDoGuglo = festa ? 'comemorando' : estado.acertos === 0 ? 'acenando' : 'parado';
  const faltamParaLimpar = COMBO_PARA_LIMPAR - (estado.combo % COMBO_PARA_LIMPAR);
  const novoRecorde = estado.pontos > recordeAnterior;

  return (
    <div className={styles.tela}>
      {cabecalho}
      <main className={styles.jogo}>
        <section className={styles.campo} aria-label="Partida do Guglo Wars">
          <dl className={styles.placar}>
            <div>
              <dt>Pontos</dt>
              <dd>{estado.pontos.toLocaleString('pt-BR')}</dd>
            </div>
            <div>
              <dt>Nível</dt>
              <dd>{estado.nivel}</dd>
            </div>
            <div>
              <dt>Combo</dt>
              <dd>{estado.combo}</dd>
            </div>
            <div>
              <dt>Entulho</dt>
              <dd>
                {estado.entulho.length}/{FILEIRAS - 1}
              </dd>
            </div>
          </dl>

          {/* Entulho, peça e "+pontos" são irmãos: cada grupo tem prefixo na chave. Sem ele, um Enter errado
              (que conta evento sem trocar de peça) fazia o "+pontos" e a peça nova colidirem, e o React
              deixava peças velhas no poço. */}
          <div className={styles.poco} style={{ '--fileiras': FILEIRAS } as CSSProperties} onClick={() => entrada.current?.focus()} aria-hidden="true">
            {estado.entulho.map((linha, indice) => (
              <div key={`entulho-${indice}`} className={styles.fileira} style={naFileira(FILEIRAS - 1 - indice)} data-peca="entulho">
                <PecaDeEntulho texto={linha.texto} />
              </div>
            ))}
            <div key={`peca-${peca.id}`} className={`${styles.fileira} ${styles.pecaDaVez}`} style={naFileira(peca.fileira)} data-peca="da-vez">
              <PecaQueCai peca={peca} digitado={estado.digitado} />
            </div>
            {evento?.tipo === 'acertou' ? (
              <div key={`pontos-${evento.seq}`} className={styles.pontosGanhos} style={naFileira(evento.fileira)}>
                +{evento.pontos}
              </div>
            ) : null}
          </div>

          <label className={styles.rotulo} htmlFor="digitar-peca">
            {peca.modo === 'copiar' ? 'Copie a linha' : 'Complete a lacuna'}
            <span className={styles.obra}>{peca.linha.obra}</span>
          </label>
          <input
            id="digitar-peca"
            ref={entrada}
            className={`${styles.entrada} ${conferencia === 'desvio' ? styles.entradaComDesvio : ''}`}
            value={estado.digitado}
            onChange={(mudanca) => despachar({ tipo: 'digitar', texto: mudanca.target.value })}
            onKeyDown={aoTeclar}
            disabled={estado.fase !== 'jogando'}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="send"
            aria-invalid={conferencia === 'desvio'}
            aria-describedby="atalhos-do-guglo-wars"
          />
          <p id="atalhos-do-guglo-wars" className={styles.atalhos}>
            <Keyboard size={16} aria-hidden="true" />
            Enter confere · Esc pausa · espaços e estilo de aspas não contam
          </p>
          <p className="somente-leitor" aria-live="polite">
            {`${mensagemDoEvento(evento, estado.nivel)} ${pedidoDaPeca(peca)}`.trim()}
          </p>
        </section>

        <aside className={styles.lateral}>
          <section className={styles.cartao} aria-label="Próxima peça">
            <h2 className={styles.cartaoTitulo}>Próxima peça</h2>
            <div className={styles.proxima}>
              <SilhuetaDaPeca comprimento={estado.proxima.texto.length} />
            </div>
            <p className={styles.cartaoNota}>{estado.proxima.obra}</p>
          </section>
          <section className={styles.cartao} aria-label="Guglo">
            <div className={styles.gugloDaPartida}>
              <GugloPixelado key={festa ? evento.seq : acaoDoGuglo} acao={acaoDoGuglo} />
            </div>
            <p className={styles.cartaoNota}>
              {estado.entulho.length > 0
                ? `Mais ${faltamParaLimpar} ${faltamParaLimpar === 1 ? 'acerto seguido limpa' : 'acertos seguidos limpam'} uma fileira de entulho.`
                : 'Poço limpo. Continue assim!'}
            </p>
          </section>
          <section className={styles.cartao} aria-label="Recorde">
            <h2 className={styles.cartaoTitulo}>Recorde</h2>
            <p className={styles.recordeValor}>{Math.max(recordeAnterior, estado.pontos).toLocaleString('pt-BR')}</p>
          </section>
        </aside>
      </main>

      {estado.fase === 'pausado' ? (
        <Modal
          titulo="Partida pausada"
          aoFechar={() => despachar({ tipo: 'continuar' })}
          rodape={
            <>
              <Botao variante="fantasma" aoClicar={() => despachar({ tipo: 'sair' })}>
                Encerrar partida
              </Botao>
              <Botao autofoco icone={<Play size={18} aria-hidden="true" />} aoClicar={() => despachar({ tipo: 'continuar' })}>
                Continuar
              </Botao>
            </>
          }
        >
          <p>A peça espera por você: o tempo só volta a correr quando você continuar.</p>
        </Modal>
      ) : null}

      {estado.fase === 'fim' ? (
        <Modal
          titulo="Fim de partida"
          aoFechar={() => despachar({ tipo: 'sair' })}
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
                rotulo={novoRecorde ? 'Guglo comemora o novo recorde' : 'Guglo acena: até a próxima partida'}
              />
            </div>
            <div className={styles.fimTexto}>
              {novoRecorde ? <p className={styles.selo}>Novo recorde!</p> : <p>A pilha chegou ao topo.</p>}
              <dl className={styles.numeros}>
                <div>
                  <dt>Pontos</dt>
                  <dd>{estado.pontos.toLocaleString('pt-BR')}</dd>
                </div>
                <div>
                  <dt>Acertos</dt>
                  <dd>{estado.acertos}</dd>
                </div>
                <div>
                  <dt>Maior combo</dt>
                  <dd>{estado.maiorCombo}</dd>
                </div>
                <div>
                  <dt>Nível</dt>
                  <dd>{estado.nivel}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
