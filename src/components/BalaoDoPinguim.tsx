// O que o pinguim diz, com o selo de classificação do método (melhor / funciona, mas… / problema / dica).
// O selo "problema" leva ícone além da cor, porque laranja também é a cor da marca (documento do projeto).
import { CircleCheck, Lightbulb, OctagonAlert, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Fala, Selo } from '../jogo/falas';
import retrato from '../assets/mascote-retrato.webp';
import { BlocoDeCodigo, CodigoColorido } from './CodigoColorido';
import { SaidaDoPrograma } from './SaidaDoPrograma';
import { TextoRico } from './TextoRico';
import styles from './BalaoDoPinguim.module.css';

const SELOS: Record<Selo, { rotulo: string; icone: ReactNode }> = {
  melhor: { rotulo: 'Melhor opção', icone: <CircleCheck size={16} aria-hidden="true" /> },
  funciona_mas: { rotulo: 'Funciona, mas…', icone: <TriangleAlert size={16} aria-hidden="true" /> },
  problema: { rotulo: 'Tem um problema', icone: <OctagonAlert size={16} aria-hidden="true" /> },
  dica: { rotulo: 'Dica', icone: <Lightbulb size={16} aria-hidden="true" /> },
};

export function SeloDeClassificacao({ selo }: { selo: Selo }) {
  const { rotulo, icone } = SELOS[selo];
  return (
    <span className={`${styles.selo} ${styles[`selo-${selo}`]}`}>
      {icone}
      {rotulo}
    </span>
  );
}

export function BalaoDoPinguim({ fala, acoes }: { fala: Fala; acoes?: ReactNode }) {
  return (
    <section className={`${styles.balao} ${fala.selo ? styles[`tom-${fala.selo}`] : ''}`} aria-label="Fala do Guglo">
      <figure className={styles.autor}>
        <img className={styles.retrato} src={retrato} alt="" width={64} height={64} />
        <figcaption className={styles.nome}>Guglo</figcaption>
      </figure>
      <div className={styles.conteudo}>
        <header className={styles.cabecalho}>
          {fala.selo ? <SeloDeClassificacao selo={fala.selo} /> : null}
          <h3 className={styles.titulo}>{fala.titulo}</h3>
        </header>
        <TextoRico texto={fala.texto} />
        {fala.codigo ? <BlocoDeCodigo codigo={fala.codigo} rotulo="Linha registrada na planta" /> : null}
        {fala.complemento ? <TextoRico texto={fala.complemento} /> : null}

        {fala.erro ? (
          <div className={styles.erro}>
            <p className={styles.erroNome}>
              {fala.erro.nome}
              {fala.erro.linha !== null ? <span className={styles.erroLinha}>linha {fala.erro.linha}</span> : null}
            </p>
            <code className={styles.erroMensagem}>
              {fala.erro.tipo}: {fala.erro.mensagem}
            </code>
          </div>
        ) : null}

        {fala.comparacao ? (
          <div className={styles.comparacao}>
            {fala.comparacao.codigo ? (
              <div className={styles.teste}>
                <span className={styles.rotuloComparacao}>Teste escondido</span>
                <BlocoDeCodigo codigo={fala.comparacao.codigo} />
              </div>
            ) : null}
            <div className={styles.colunas}>
              <div className={styles.coluna}>
                <span className={styles.rotuloComparacao}>A obra espera</span>
                <SaidaDoPrograma saida={fala.comparacao.esperado} />
              </div>
              <div className={styles.coluna}>
                <span className={styles.rotuloComparacao}>Seu programa mostrou</span>
                <SaidaDoPrograma saida={fala.comparacao.obtido} />
              </div>
            </div>
          </div>
        ) : null}

        {fala.outros ? (
          <details className={styles.outros}>
            <summary>Por que não os outros tijolos?</summary>
            <ul>
              {fala.outros.map((outro) => (
                <li key={outro.texto}>
                  <span className={styles.tijoloOutro}>
                    <CodigoColorido texto={outro.texto} />
                  </span>
                  <SeloDeClassificacao selo={outro.classificacao} />
                  <TextoRico texto={outro.porque} />
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {acoes ? <div className={styles.acoes}>{acoes}</div> : null}
      </div>
    </section>
  );
}
