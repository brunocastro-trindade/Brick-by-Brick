// O console: a saída de verdade do programa montado até aqui, rodando no Python do navegador.
// Com várias entradas de teste (como idades diferentes no Cinema), cada teste vira uma aba.
import { SquareTerminal } from 'lucide-react';
import { useState } from 'react';
import type { EstadoDoPython } from '../python/executor';
import type { ResultadoExecucao } from '../python/tipos';
import { explicarErro } from '../jogo/erros-python';
import { SaidaDoPrograma } from './SaidaDoPrograma';
import { linkDeRetorno } from '../estado/retorno';
import styles from './ConsoleDaObra.module.css';

export interface ExecucaoNoConsole {
  entradas: string[];
  resultado: ResultadoExecucao;
}

export function ConsoleDaObra({
  execucoes,
  estadoDoPython,
  programaVazio,
}: {
  execucoes: ExecucaoNoConsole[] | null;
  estadoDoPython: EstadoDoPython;
  programaVazio: boolean;
}) {
  const [aba, setAba] = useState(0);
  const indice = execucoes && aba < execucoes.length ? aba : 0;
  const atual = execucoes?.[indice];

  let corpo;
  if (programaVazio) corpo = <p className={styles.aviso}>O programa ainda está vazio. Assente a primeira linha para ver a saída aqui.</p>;
  else if (estadoDoPython === 'carregando' || (!execucoes && estadoDoPython === 'pronto'))
    corpo = <p className={styles.aviso}>Preparando o Python… a saída aparece aqui em instantes.</p>;
  else if (estadoDoPython === 'falhou')
    corpo = (
      <p className={styles.aviso}>
        O Python não carregou, então não dá para mostrar a saída. Recarregue a página para tentar de novo. Se continuar,{' '}
        <a {...linkDeRetorno()}>conte para a equipe</a>: o e-mail já leva o navegador e o erro.
      </p>
    );
  else if (atual) {
    const erro = atual.resultado.erro;
    corpo = (
      <>
        <SaidaDoPrograma saida={atual.resultado.saida} />
        {erro ? (
          <p className={styles.erro}>
            {explicarErro(erro.tipo).nome}: {erro.tipo}: {erro.mensagem}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <section className={styles.console} aria-label="Console do programa">
      <header className={styles.cabecalho}>
        <span className={styles.titulo}>
          <SquareTerminal size={16} aria-hidden="true" />
          Console
        </span>
        {execucoes && execucoes.length > 1 ? (
          <div className={styles.abas} role="tablist" aria-label="Testes com entradas diferentes">
            {execucoes.map((execucao, posicao) => (
              <button
                key={posicao}
                type="button"
                role="tab"
                aria-selected={posicao === indice}
                className={`${styles.aba} ${posicao === indice ? styles.abaAtiva : ''}`}
                onClick={() => setAba(posicao)}
                title={`Entradas: ${execucao.entradas.join(', ')}`}
              >
                {execucao.entradas.join(' · ') || `Teste ${posicao + 1}`}
              </button>
            ))}
          </div>
        ) : null}
      </header>
      <div className={styles.corpo} aria-live="polite">
        {corpo}
      </div>
    </section>
  );
}
