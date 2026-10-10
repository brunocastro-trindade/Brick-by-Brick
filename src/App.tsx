// Rotas, progresso e a transição de tijolos entre as telas.
import { lazy, Suspense, useEffect, useState } from 'react';
import { Botao } from './components/Botao';
import { TransicaoDeTijolos } from './components/TransicaoDeTijolos';
import { navegar, useRota, type Rota } from './estado/rotas';
import { useProgresso } from './estado/useProgresso';
import { prefereMenosMovimento } from './estado/usePython';
import { OBRAS, obraPorId } from './jogo/obras';
import { obraLiberada } from './jogo/progresso';
import type { Obra } from './jogo/tipos';
import { TelaCidade } from './telas/TelaCidade';
import { TelaInicial } from './telas/TelaInicial';
import { TelaObra } from './telas/TelaObra';
import styles from './App.module.css';

// Vitrine do design system (HARNESS §2.5): só existe no modo de desenvolvimento.
const TelaVitrine = import.meta.env.DEV ? lazy(() => import('./telas/TelaVitrine')) : null;

const COBRIR_MS = 420;
const DESCOBRIR_MS = 400;

export function App() {
  const rota = useRota();
  const [progresso, atualizarProgresso] = useProgresso();
  const [rotaVisivel, setRotaVisivel] = useState<Rota>(rota);
  const [fase, setFase] = useState<'parada' | 'cobrindo' | 'descobrindo'>('parada');

  // Cobre a tela, troca a rota visível por baixo dos tijolos...
  useEffect(() => {
    if (rota.tela === rotaVisivel.tela) return;
    const rapido = prefereMenosMovimento();
    const temporizadores = [
      setTimeout(() => setFase(rapido ? 'parada' : 'cobrindo'), 0),
      setTimeout(
        () => {
          setRotaVisivel(rota);
          setFase(rapido ? 'parada' : 'descobrindo');
          window.scrollTo(0, 0);
        },
        rapido ? 0 : COBRIR_MS,
      ),
    ];
    return () => temporizadores.forEach(clearTimeout);
  }, [rota, rotaVisivel.tela]);

  // ...e descobre num efeito à parte: a troca de rota acima reexecuta aquele efeito,
  // e a limpeza dele não pode cancelar o fim da transição.
  useEffect(() => {
    if (fase !== 'descobrindo') return;
    const temporizador = setTimeout(() => setFase('parada'), DESCOBRIR_MS);
    return () => clearTimeout(temporizador);
  }, [fase]);

  const exibida = rota.tela === rotaVisivel.tela ? rota : rotaVisivel;

  const entrar = (obra: Obra) => {
    atualizarProgresso((atual) => ({ ...atual, ultimaObra: obra.id }));
    navegar({ tela: 'obra', obraId: obra.id });
  };

  let tela;
  switch (exibida.tela) {
    case 'inicio':
      tela = <TelaInicial temProgresso={Object.keys(progresso.obras).length > 0} aoComecar={() => navegar({ tela: 'cidade' })} />;
      break;
    case 'cidade':
      tela = (
        <TelaCidade
          obras={OBRAS}
          progresso={progresso}
          atualizarProgresso={atualizarProgresso}
          selecionada={exibida.obraId ?? null}
          aoSelecionar={(obra) => navegar({ tela: 'cidade', obraId: obra.id })}
          aoEntrar={entrar}
          aoIrParaInicio={() => navegar({ tela: 'inicio' })}
        />
      );
      break;
    case 'obra': {
      const obra = obraPorId(exibida.obraId);
      const indice = obra ? OBRAS.indexOf(obra) : -1;
      if (!obra || !obraLiberada(OBRAS, progresso, indice)) {
        tela = (
          <main className={styles.fechada}>
            <h1>Essa obra ainda está fechada</h1>
            <p>As obras abrem na ordem da cidade: conclua as anteriores para chegar até ela.</p>
            <Botao aoClicar={() => navegar({ tela: 'cidade' })}>Voltar à cidade</Botao>
          </main>
        );
        break;
      }
      tela = (
        <TelaObra
          key={obra.id}
          obra={obra}
          progresso={progresso}
          atualizarProgresso={atualizarProgresso}
          proximaObra={OBRAS[indice + 1] ?? null}
          aoVoltar={() => navegar({ tela: 'cidade', obraId: obra.id })}
          aoIrParaObra={entrar}
        />
      );
      break;
    }
    case 'vitrine':
      tela = TelaVitrine ? (
        <Suspense fallback={null}>
          <TelaVitrine />
        </Suspense>
      ) : null;
      break;
  }

  return (
    <>
      {tela}
      {fase !== 'parada' ? <TransicaoDeTijolos fase={fase} /> : null}
    </>
  );
}
