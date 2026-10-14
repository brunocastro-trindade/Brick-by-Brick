// Obra pronta: placar de acertos de primeira, estrelas, o programa inteiro, o convite à Vistoria e o próximo passo.
import { Check, ClipboardCheck, Copy, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { Estrelas as QuantidadeDeEstrelas, ResultadoDesafio } from '../jogo/pontuacao';
import { totalDePontos } from '../jogo/pontuacao';
import type { Obra } from '../jogo/tipos';
import { Botao } from './Botao';
import { BlocoDeCodigo } from './CodigoColorido';
import { Estrelas } from './Estrelas';
import { GugloPixelado } from './GugloPixelado';
import { Modal } from './Modal';
import styles from './PainelDeConclusao.module.css';

export interface PainelDeConclusaoProps {
  obra: Obra;
  codigo: string;
  resultados: ResultadoDesafio[];
  estrelas: QuantidadeDeEstrelas;
  novoRecorde: boolean;
  proximaObra: Obra | null;
  aoVoltar: () => void;
  aoRefazer: () => void;
  aoIrParaProxima: (obra: Obra) => void;
  /** Vistoria (ADR-0016): reescrever o programa de memória. Opcional, não trava a próxima obra. */
  aoFazerVistoria: () => void;
}

export function PainelDeConclusao({
  obra,
  codigo,
  resultados,
  estrelas,
  novoRecorde,
  proximaObra,
  aoVoltar,
  aoRefazer,
  aoIrParaProxima,
  aoFazerVistoria,
}: PainelDeConclusaoProps) {
  const [copiado, setCopiado] = useState(false);
  const dePrimeira = resultados.filter((resultado) => resultado.dePrimeira).length;
  const dicas = resultados.filter((resultado) => resultado.usouDica).length;
  const linhas = resultados.reduce((soma, resultado) => soma + resultado.linhas, 0);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <Modal
      titulo={`${obra.nome} concluído!`}
      aoFechar={aoVoltar}
      largura="larga"
      rodape={
        <>
          <Botao variante="fantasma" icone={<RotateCcw size={18} aria-hidden="true" />} aoClicar={aoRefazer}>
            Refazer a obra
          </Botao>
          {proximaObra ? (
            <>
              <Botao variante="secundario" aoClicar={aoVoltar}>
                Voltar à cidade
              </Botao>
              <Botao autofoco aoClicar={() => aoIrParaProxima(proximaObra)}>
                Próxima obra: {proximaObra.nome}
              </Botao>
            </>
          ) : (
            <Botao autofoco aoClicar={aoVoltar}>
              Voltar à cidade
            </Botao>
          )}
        </>
      }
    >
      <div className={styles.painel}>
        <div className={styles.comemoracao}>
          <div className={styles.pinguim}>
            <GugloPixelado acao="comemorando" rotulo="Guglo comemora a obra pronta" />
          </div>
          <div className={styles.placar}>
            <Estrelas quantidade={estrelas} tamanho="grande" animar />
            {novoRecorde ? <p className={styles.recorde}>Novo recorde nesta obra!</p> : null}
            <dl className={styles.numeros}>
              <div>
                <dt>Pontos</dt>
                <dd>{totalDePontos(resultados).toLocaleString('pt-BR')}</dd>
              </div>
              <div>
                <dt>De primeira</dt>
                <dd>
                  {dePrimeira} de {resultados.length}
                </dd>
              </div>
              <div>
                <dt>Linhas</dt>
                <dd>{linhas}</dd>
              </div>
              <div>
                <dt>Dicas</dt>
                <dd>{dicas}</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className={styles.programa}>
          <div className={styles.programaCabecalho}>
            <h3 className={styles.rotulo}>O programa que você construiu: {obra.arquivo}</h3>
            <Botao variante="secundario" icone={copiado ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />} aoClicar={copiar}>
              {copiado ? 'Código copiado' : 'Copiar código'}
            </Botao>
          </div>
          <BlocoDeCodigo codigo={codigo} rotulo={`Programa completo de ${obra.nome}`} />
        </div>
        <section className={styles.vistoria} aria-labelledby="convite-da-vistoria">
          <ClipboardCheck size={28} aria-hidden="true" className={styles.iconeDaVistoria} />
          <div className={styles.vistoriaTexto}>
            <h3 id="convite-da-vistoria" className={styles.rotulo}>
              Vistoria: o programa ficou com você?
            </h3>
            <p>Reescreva {obra.arquivo} de memória, fiada por fiada. É opcional e vale o selo de vistoriada no mapa.</p>
          </div>
          <Botao variante="secundario" icone={<ClipboardCheck size={18} aria-hidden="true" />} aoClicar={aoFazerVistoria}>
            Fazer a vistoria
          </Botao>
        </section>
      </div>
    </Modal>
  );
}
