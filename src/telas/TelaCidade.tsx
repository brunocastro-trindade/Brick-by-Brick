// Um mapa (ADR-0021): a arte com as obras, a placa da obra escolhida e a lista das obras dele. Na Vila, a primeira
// entrada toca o vídeo de abertura, e a Vila inteira pronta toca o da cidade pronta, que leva à Serra Verde (ADR-0020).
import { ArrowRight, CircleCheck, CircleHelp, ClipboardCheck, Construction, Lock, Settings, Star, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Botao } from '../components/Botao';
import { ChipDoPython } from '../components/ChipDoPython';
import { ARTES_DOS_MAPAS } from '../components/artesDosMapas';
import { MapaDaCidade, type ObraNoMapa } from '../components/MapaDaCidade';
import { MenuDosModos } from '../components/MenuDosModos';
import { ModalComoJogar } from '../components/ModalComoJogar';
import { Modal } from '../components/Modal';
import { ModalDeAjustes } from '../components/ModalDeAjustes';
import { PlacaDaObra } from '../components/PlacaDaObra';
import { PlayerDaAbertura } from '../components/PlayerDaAbertura';
import { VideoDoGuglo } from '../components/VideoDoGuglo';
import type { SituacaoDoPredio } from '../components/PredioDaCidade';
import { Logo } from '../components/Logo';
import { linhasAntesDoPasso } from '../jogo/programa';
import { DADOS_DOS_MAPAS, mapaCompleto, mapaLiberado, mapaSeguinte } from '../jogo/mapas';
import { marcarVideoVisto, obraLiberada, progressoDaObra, progressoNovo, type Progresso, type VideoDoJogo } from '../jogo/progresso';
import { MAPAS, type MapaId, type Obra } from '../jogo/tipos';
import styles from './TelaCidade.module.css';

export function situacaoDaObra(obras: Obra[], progresso: Progresso, indice: number): ObraNoMapa | null {
  const obra = obras[indice];
  if (!obra) return null;
  const daObra = progressoDaObra(progresso, obra.id);
  const progressoDasLinhas = linhasAntesDoPasso(obra, Math.min(daObra.passo, obra.desafios.length)).length / obra.totalLinhas;
  let situacao: SituacaoDoPredio = 'disponivel';
  if (!obraLiberada(obras, progresso, indice)) situacao = 'bloqueado';
  else if (daObra.concluida) situacao = 'concluido';
  else if (daObra.passo > 0) situacao = 'em-obra';
  return { obra, situacao, progresso: progressoDasLinhas, vistoriada: daObra.vistoria !== null };
}

const ICONES: Record<SituacaoDoPredio, typeof Lock> = {
  bloqueado: Lock,
  disponivel: Construction,
  'em-obra': Construction,
  concluido: CircleCheck,
};

export interface TelaCidadeProps {
  mapa: MapaId;
  /** Todas as obras, de todos os mapas: o desbloqueio olha os mapas de antes. */
  obras: Obra[];
  progresso: Progresso;
  atualizarProgresso: (mudar: (atual: Progresso) => Progresso) => void;
  selecionada: string | null;
  aoSelecionar: (obra: Obra) => void;
  aoEntrar: (obra: Obra) => void;
  aoFazerVistoria: (obra: Obra) => void;
  aoIrParaInicio: () => void;
  aoAbrirGugloWars: () => void;
  aoAbrirQualSaida: () => void;
  aoAbrirLeiaOErro: () => void;
  aoTrocarDeMapa: (mapa: MapaId) => void;
}

export function TelaCidade({
  mapa,
  obras,
  progresso,
  atualizarProgresso,
  selecionada,
  aoSelecionar,
  aoEntrar,
  aoFazerVistoria,
  aoIrParaInicio,
  aoAbrirGugloWars,
  aoAbrirQualSaida,
  aoAbrirLeiaOErro,
  aoTrocarDeMapa,
}: TelaCidadeProps) {
  const [modal, setModal] = useState<'ajustes' | 'como-jogar' | null>(null);
  const noMapa = obras
    .map((obra, indice) => (obra.mapa === mapa ? situacaoDaObra(obras, progresso, indice) : null))
    .filter((item): item is ObraNoMapa => item !== null);
  const proxima = noMapa.find((item) => item.situacao === 'disponivel' || item.situacao === 'em-obra') ?? null;
  const naoEDoMapa = (id: string | null) => (id && noMapa.some((item) => item.obra.id === id) ? id : null);
  const escolhidaId = naoEDoMapa(selecionada) ?? naoEDoMapa(progresso.ultimaObra) ?? proxima?.obra.id ?? noMapa[0]?.obra.id ?? null;
  const escolhida = noMapa.find((item) => item.obra.id === escolhidaId) ?? null;
  const indiceEscolhida = escolhida ? obras.indexOf(escolhida.obra) : -1;
  const concluidas = noMapa.filter((item) => item.situacao === 'concluido').length;
  const estrelas = noMapa.reduce((soma, item) => soma + progressoDaObra(progresso, item.obra.id).estrelas, 0);
  const seguinte = mapaSeguinte(mapa);
  const seguinteLiberado = seguinte !== null && mapaLiberado(obras, progresso, seguinte);
  const [avisoDoMapa, setAvisoDoMapa] = useState<string | null>(null);

  const irPara = (destino: MapaId) => {
    if (mapaLiberado(obras, progresso, destino)) aoTrocarDeMapa(destino);
    else setAvisoDoMapa(`A ${DADOS_DOS_MAPAS[destino].nome} abre quando as obras da ${DADOS_DOS_MAPAS.vila.nome} estiverem todas prontas.`);
  };

  // O vídeo da vez, decidido ao abrir a Vila: a cidade pronta tem a vez sobre a abertura.
  const [video, setVideo] = useState<VideoDoJogo | null>(() => {
    if (mapa !== 'vila') return null;
    if (mapaCompleto(obras, progresso, 'vila') && !progresso.videosVistos.includes('cidade-pronta')) return 'cidade-pronta';
    if (!progresso.videosVistos.includes('abertura')) return 'abertura';
    return null;
  });
  // Marca assim que aparece: recarregar a página no meio não toca de novo.
  useEffect(() => {
    if (video) atualizarProgresso((atual) => marcarVideoVisto(atual, video));
  }, [video, atualizarProgresso]);

  const entrar = (item: ObraNoMapa) => {
    if (item.situacao !== 'bloqueado') aoEntrar(item.obra);
  };

  return (
    <div className={styles.tela}>
      <header className={styles.barra}>
        <button type="button" className={styles.logo} onClick={aoIrParaInicio} aria-label="Brick by Brick: voltar ao início">
          <Logo tamanho="pequeno" alt="" />
        </button>
        <div className={styles.placar}>
          <span className={styles.medida} title="Estrelas conquistadas">
            <Star size={18} aria-hidden="true" />
            {estrelas}/{noMapa.length * 3}
            <span className="somente-leitor">estrelas</span>
          </span>
          <span className={styles.medida} title="Obras concluídas">
            <CircleCheck size={18} aria-hidden="true" />
            {concluidas}/{noMapa.length}
            <span className="somente-leitor">obras concluídas</span>
          </span>
        </div>
        <div className={styles.ferramentas}>
          <MenuDosModos aoAbrirGugloWars={aoAbrirGugloWars} aoAbrirQualSaida={aoAbrirQualSaida} aoAbrirLeiaOErro={aoAbrirLeiaOErro} />
          <button type="button" className={styles.icone} onClick={() => setModal('como-jogar')} aria-label="Como jogar">
            <CircleHelp size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.icone}
            onClick={() => atualizarProgresso((atual) => ({ ...atual, som: !atual.som }))}
            aria-pressed={progresso.som}
            aria-label={progresso.som ? 'Desligar som' : 'Ligar som'}
          >
            {progresso.som ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
          </button>
          <button type="button" className={styles.icone} onClick={() => setModal('ajustes')} aria-label="Ajustes">
            <Settings size={20} aria-hidden="true" />
          </button>
          <span className={styles.estadoDoPython}>
            <ChipDoPython />
          </span>
        </div>
      </header>

      <main className={styles.area}>
        <div className={styles.mapa}>
          <h1 className="somente-leitor">{DADOS_DOS_MAPAS[mapa].nome}: mapa das obras</h1>
          <nav className={styles.mapas} aria-label="Mapas">
            {MAPAS.map((outro) => {
              const liberado = mapaLiberado(obras, progresso, outro);
              return (
                <button
                  key={outro}
                  type="button"
                  className={styles.mapaBotao}
                  aria-current={outro === mapa ? 'page' : undefined}
                  onClick={() => (outro === mapa ? undefined : irPara(outro))}
                >
                  {liberado ? null : <Lock size={16} aria-hidden="true" />}
                  {DADOS_DOS_MAPAS[outro].nome}
                  {liberado ? null : <span className="somente-leitor"> (fechada)</span>}
                </button>
              );
            })}
          </nav>
          {avisoDoMapa ? (
            <p className={styles.aviso} role="status">
              {avisoDoMapa}
            </p>
          ) : null}
          <MapaDaCidade
            arte={ARTES_DOS_MAPAS[mapa]}
            nome={DADOS_DOS_MAPAS[mapa].nome}
            placaDoFim={seguinte ? { nome: DADOS_DOS_MAPAS[seguinte].nome, liberado: seguinteLiberado, aoAbrir: () => irPara(seguinte) } : null}
            obras={noMapa}
            selecionada={escolhidaId}
            proximaAConstruir={proxima?.obra.id ?? null}
            aoSelecionar={aoSelecionar}
            aoEntrar={aoEntrar}
          />
          {progresso.modoLivre ? <p className={styles.aviso}>Modo livre ligado: todas as obras estão abertas.</p> : null}
        </div>

        <aside className={styles.lateral}>
          {escolhida ? (
            <PlacaDaObra
              key={escolhida.obra.id}
              obra={escolhida.obra}
              situacao={escolhida.situacao}
              progresso={progressoDaObra(progresso, escolhida.obra.id)}
              obraAnterior={indiceEscolhida > 0 && obras[indiceEscolhida - 1]?.mapa === mapa ? (obras[indiceEscolhida - 1] ?? null) : null}
              aoEntrar={() => entrar(escolhida)}
              aoFazerVistoria={() => aoFazerVistoria(escolhida.obra)}
            />
          ) : null}

          <nav className={styles.lista} aria-label={`Obras da ${DADOS_DOS_MAPAS[mapa].nome}`}>
            <h2 className={styles.listaTitulo}>Obras da {DADOS_DOS_MAPAS[mapa].nome}</h2>
            <ol>
              {noMapa.map((item) => {
                const Icone = ICONES[item.situacao];
                const estrelas = progressoDaObra(progresso, item.obra.id).estrelas;
                return (
                  <li key={item.obra.id}>
                    <button
                      type="button"
                      className={`${styles.item} ${styles[item.situacao]} ${item.obra.id === escolhidaId ? styles.itemEscolhido : ''}`}
                      aria-current={item.obra.id === escolhidaId ? 'true' : undefined}
                      onClick={() => aoSelecionar(item.obra)}
                    >
                      <span className={styles.itemNumero}>{item.obra.numero}</span>
                      <span className={styles.itemTextos}>
                        <span className={styles.itemNome}>{item.obra.nome}</span>
                        <span className={styles.itemConceito}>{item.obra.conceito}</span>
                      </span>
                      {estrelas > 0 ? (
                        <span className={styles.itemEstrelas} aria-label={`${estrelas} de 3 estrelas`}>
                          {'★'.repeat(estrelas)}
                        </span>
                      ) : null}
                      {item.vistoriada ? <ClipboardCheck size={18} className={styles.itemVistoriada} aria-label="vistoriada" /> : null}
                      <Icone size={18} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>
      </main>

      {video === 'abertura' && modal === null ? <PlayerDaAbertura somLigado={progresso.som} aoFechar={() => setVideo(null)} /> : null}
      {video === 'cidade-pronta' ? (
        <Modal
          titulo="A cidade está de pé!"
          largura="larga"
          aoFechar={() => setVideo(null)}
          rodape={
            <>
              <Botao variante="secundario" aoClicar={() => setVideo(null)}>
                Ficar na Vila
              </Botao>
              <Botao tamanho="grande" autofoco icone={<ArrowRight size={20} aria-hidden="true" />} aoClicar={() => aoTrocarDeMapa('serra-verde')}>
                Ir para a Serra Verde
              </Botao>
            </>
          }
        >
          <div className={styles.cidadePronta}>
            <VideoDoGuglo video="cidade-pronta" somLigado={progresso.som} />
            <p>
              Você concluiu as {noMapa.length} obras da Vila, do <code>print()</code> às classes. A Serra Verde abriu: textos, tuplas,
              conjuntos, sorteios, erros tratados e arquivos esperam pelo Guglo.
            </p>
          </div>
        </Modal>
      ) : null}

      {modal === 'como-jogar' ? <ModalComoJogar aoFechar={() => setModal(null)} /> : null}
      {modal === 'ajustes' ? (
        <ModalDeAjustes
          progresso={progresso}
          som={progresso.som}
          modoLivre={progresso.modoLivre}
          tema={progresso.tema}
          aoMudarTema={(tema) => atualizarProgresso((atual) => ({ ...atual, tema }))}
          aoAlternarSom={() => atualizarProgresso((atual) => ({ ...atual, som: !atual.som }))}
          aoAlternarModoLivre={() => atualizarProgresso((atual) => ({ ...atual, modoLivre: !atual.modoLivre }))}
          aoApagarProgresso={() => atualizarProgresso((atual) => ({ ...progressoNovo(), som: atual.som, tema: atual.tema }))}
          aoCarregarProgresso={(novo) => atualizarProgresso((atual) => ({ ...novo, som: atual.som, tema: atual.tema }))}
          aoFechar={() => setModal(null)}
        />
      ) : null}
    </div>
  );
}
