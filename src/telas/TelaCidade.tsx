// A cidade: o mapa das obras, a placa da obra escolhida e a lista de todas elas.
import { CircleCheck, CircleHelp, Construction, Lock, Settings, Star, Swords, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { ChipDoPython } from '../components/ChipDoPython';
import { MapaDaCidade, type ObraNoMapa } from '../components/MapaDaCidade';
import { ModalComoJogar } from '../components/ModalComoJogar';
import { ModalDeAjustes } from '../components/ModalDeAjustes';
import { PlacaDaObra } from '../components/PlacaDaObra';
import type { SituacaoDoPredio } from '../components/PredioDaCidade';
import logo from '../assets/logo.webp';
import { linhasAntesDoPasso } from '../jogo/programa';
import { obraLiberada, progressoDaObra, progressoNovo, totalDeEstrelas, type Progresso } from '../jogo/progresso';
import type { Obra } from '../jogo/tipos';
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
  return { obra, situacao, progresso: progressoDasLinhas };
}

const ICONES: Record<SituacaoDoPredio, typeof Lock> = {
  bloqueado: Lock,
  disponivel: Construction,
  'em-obra': Construction,
  concluido: CircleCheck,
};

export interface TelaCidadeProps {
  obras: Obra[];
  progresso: Progresso;
  atualizarProgresso: (mudar: (atual: Progresso) => Progresso) => void;
  selecionada: string | null;
  aoSelecionar: (obra: Obra) => void;
  aoEntrar: (obra: Obra) => void;
  aoIrParaInicio: () => void;
  aoAbrirGugloWars: () => void;
}

export function TelaCidade({
  obras,
  progresso,
  atualizarProgresso,
  selecionada,
  aoSelecionar,
  aoEntrar,
  aoIrParaInicio,
  aoAbrirGugloWars,
}: TelaCidadeProps) {
  const [modal, setModal] = useState<'ajustes' | 'como-jogar' | null>(null);
  const noMapa = obras.map((_, indice) => situacaoDaObra(obras, progresso, indice)).filter((item): item is ObraNoMapa => item !== null);
  const proxima = noMapa.find((item) => item.situacao === 'disponivel' || item.situacao === 'em-obra') ?? null;
  const escolhidaId = selecionada ?? progresso.ultimaObra ?? proxima?.obra.id ?? obras[0]?.id ?? null;
  const escolhida = noMapa.find((item) => item.obra.id === escolhidaId) ?? null;
  const indiceEscolhida = escolhida ? noMapa.indexOf(escolhida) : -1;
  const concluidas = noMapa.filter((item) => item.situacao === 'concluido').length;

  const entrar = (item: ObraNoMapa) => {
    if (item.situacao !== 'bloqueado') aoEntrar(item.obra);
  };

  return (
    <div className={styles.tela}>
      <header className={styles.barra}>
        <button type="button" className={styles.logo} onClick={aoIrParaInicio} aria-label="Brick by Brick: voltar ao início">
          <img src={logo} alt="" width={90} height={67} />
        </button>
        <div className={styles.placar}>
          <span className={styles.medida} title="Estrelas conquistadas">
            <Star size={18} aria-hidden="true" />
            {totalDeEstrelas(progresso)}/{obras.length * 3}
            <span className="somente-leitor">estrelas</span>
          </span>
          <span className={styles.medida} title="Obras concluídas">
            <CircleCheck size={18} aria-hidden="true" />
            {concluidas}/{obras.length}
            <span className="somente-leitor">obras concluídas</span>
          </span>
        </div>
        <div className={styles.ferramentas}>
          <button type="button" className={styles.gugloWars} onClick={aoAbrirGugloWars}>
            <Swords size={18} aria-hidden="true" />
            Guglo Wars
          </button>
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
          <ChipDoPython />
        </div>
      </header>

      <main className={styles.area}>
        <div className={styles.mapa}>
          <h1 className="somente-leitor">Cidade das obras</h1>
          <MapaDaCidade
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
              obraAnterior={obras[indiceEscolhida - 1] ?? null}
              aoEntrar={() => entrar(escolhida)}
            />
          ) : null}

          <nav className={styles.lista} aria-label="Todas as obras">
            <h2 className={styles.listaTitulo}>Obras da cidade</h2>
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
                      <span className={styles.itemNumero}>{item.obra.ordem}</span>
                      <span className={styles.itemTextos}>
                        <span className={styles.itemNome}>{item.obra.nome}</span>
                        <span className={styles.itemConceito}>{item.obra.conceito}</span>
                      </span>
                      {estrelas > 0 ? (
                        <span className={styles.itemEstrelas} aria-label={`${estrelas} de 3 estrelas`}>
                          {'★'.repeat(estrelas)}
                        </span>
                      ) : null}
                      <Icone size={18} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>
      </main>

      {modal === 'como-jogar' ? <ModalComoJogar aoFechar={() => setModal(null)} /> : null}
      {modal === 'ajustes' ? (
        <ModalDeAjustes
          som={progresso.som}
          modoLivre={progresso.modoLivre}
          aoAlternarSom={() => atualizarProgresso((atual) => ({ ...atual, som: !atual.som }))}
          aoAlternarModoLivre={() => atualizarProgresso((atual) => ({ ...atual, modoLivre: !atual.modoLivre }))}
          aoApagarProgresso={() => atualizarProgresso((atual) => ({ ...progressoNovo(), som: atual.som }))}
          aoFechar={() => setModal(null)}
        />
      ) : null}
    </div>
  );
}
