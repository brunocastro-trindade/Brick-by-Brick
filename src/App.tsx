// Rotas, progresso e a transição de tijolos entre as telas.
import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { Botao } from './components/Botao';
import { TransicaoDeTijolos } from './components/TransicaoDeTijolos';
import { navegar, telaDaRota, useRota, type Rota } from './estado/rotas';
import { useProgresso } from './estado/useProgresso';
import { prefereMenosMovimento } from './estado/usePython';
import { aplicarTema } from './estado/tema';
import { OBRAS, obraPorId } from './jogo/obras';
import { obraLiberada, progressoDaObra } from './jogo/progresso';
import type { Obra } from './jogo/tipos';
import { TelaAnuncie } from './telas/TelaAnuncie';
import { TelaCidade } from './telas/TelaCidade';
import { TelaGugloWars } from './telas/TelaGugloWars';
import { TelaInicial } from './telas/TelaInicial';
import { TelaObra } from './telas/TelaObra';
import { TelaLeiaOErro } from './telas/TelaLeiaOErro';
import { TelaQualSaida } from './telas/TelaQualSaida';
import { TelaVistoria } from './telas/TelaVistoria';
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

  // Antes de pintar: o tema escolhido entra sem piscar o claro (o "seguir o aparelho" já sai do CSS).
  useLayoutEffect(() => aplicarTema(progresso.tema), [progresso.tema]);

  // Cobre a tela, troca a rota visível por baixo dos tijolos...
  useEffect(() => {
    if (telaDaRota(rota) === telaDaRota(rotaVisivel)) return;
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
  }, [rota, rotaVisivel]);

  // ...e descobre num efeito à parte: a troca de rota acima reexecuta aquele efeito,
  // e a limpeza dele não pode cancelar o fim da transição.
  useEffect(() => {
    if (fase !== 'descobrindo') return;
    const temporizador = setTimeout(() => setFase('parada'), DESCOBRIR_MS);
    return () => clearTimeout(temporizador);
  }, [fase]);

  const exibida = telaDaRota(rota) === telaDaRota(rotaVisivel) ? rota : rotaVisivel;

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
          key={exibida.mapa ?? 'vila'}
          mapa={exibida.mapa ?? 'vila'}
          obras={OBRAS}
          progresso={progresso}
          atualizarProgresso={atualizarProgresso}
          selecionada={exibida.obraId ?? null}
          aoSelecionar={(obra) => navegar({ tela: 'cidade', mapa: obra.mapa, obraId: obra.id })}
          aoTrocarDeMapa={(mapa) => navegar({ tela: 'cidade', mapa })}
          aoEntrar={entrar}
          aoFazerVistoria={(obra) => navegar({ tela: 'vistoria', obraId: obra.id })}
          aoIrParaInicio={() => navegar({ tela: 'inicio' })}
          aoAbrirGugloWars={() => navegar({ tela: 'guglo-wars' })}
          aoAbrirQualSaida={() => navegar({ tela: 'qual-e-a-saida' })}
          aoAbrirLeiaOErro={() => navegar({ tela: 'leia-o-erro' })}
        />
      );
      break;
    case 'guglo-wars':
      tela = (
        <TelaGugloWars
          obras={OBRAS}
          progresso={progresso}
          atualizarProgresso={atualizarProgresso}
          aoVoltar={() => navegar({ tela: 'cidade' })}
          aoIrParaInicio={() => navegar({ tela: 'inicio' })}
        />
      );
      break;
    case 'qual-e-a-saida':
      tela = (
        <TelaQualSaida
          obras={OBRAS}
          progresso={progresso}
          atualizarProgresso={atualizarProgresso}
          aoVoltar={() => navegar({ tela: 'cidade' })}
          aoIrParaInicio={() => navegar({ tela: 'inicio' })}
        />
      );
      break;
    case 'leia-o-erro':
      tela = (
        <TelaLeiaOErro
          obras={OBRAS}
          progresso={progresso}
          atualizarProgresso={atualizarProgresso}
          aoVoltar={() => navegar({ tela: 'cidade' })}
          aoIrParaInicio={() => navegar({ tela: 'inicio' })}
        />
      );
      break;
    case 'anuncie':
      tela = <TelaAnuncie aoIrParaInicio={() => navegar({ tela: 'inicio' })} aoIrParaCidade={() => navegar({ tela: 'cidade' })} />;
      break;
    case 'obra': {
      const obra = obraPorId(exibida.obraId);
      const indice = obra ? OBRAS.indexOf(obra) : -1;
      if (!obra || !obraLiberada(OBRAS, progresso, indice)) {
        tela = (
          <main className={styles.fechada}>
            <h1>Essa obra ainda está fechada</h1>
            <p>As obras abrem na ordem do mapa, e a Serra Verde abre com a Vila inteira pronta: conclua as anteriores para chegar até ela.</p>
            <Botao aoClicar={() => navegar({ tela: 'cidade', mapa: obra?.mapa })}>Voltar ao mapa</Botao>
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
          aoVoltar={() => navegar({ tela: 'cidade', mapa: obra.mapa, obraId: obra.id })}
          aoIrParaObra={entrar}
          aoFazerVistoria={() => navegar({ tela: 'vistoria', obraId: obra.id })}
        />
      );
      break;
    }
    case 'vistoria': {
      const obra = obraPorId(exibida.obraId);
      // Vistoria é da obra pronta (ADR-0016); no modo livre, de qualquer uma.
      if (!obra || !(progresso.modoLivre || progressoDaObra(progresso, obra.id).concluida)) {
        tela = (
          <main className={styles.fechada}>
            <h1>A vistoria vem depois da obra</h1>
            <p>Conclua a obra para reescrever o programa dela de memória.</p>
            <Botao aoClicar={() => navegar({ tela: 'cidade', mapa: obra?.mapa, obraId: obra?.id })}>Voltar à cidade</Botao>
          </main>
        );
        break;
      }
      tela = (
        <TelaVistoria
          key={obra.id}
          obra={obra}
          progresso={progresso}
          atualizarProgresso={atualizarProgresso}
          aoVoltar={() => navegar({ tela: 'cidade', mapa: obra.mapa, obraId: obra.id })}
          aoIrParaInicio={() => navegar({ tela: 'inicio' })}
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
